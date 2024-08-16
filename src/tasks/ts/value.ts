import { BigNumber, utils } from "ethers";

import { BUY_ETH_ADDRESS, OrderKind } from "../../ts";
import { Api } from "../../ts/api";
import { SupportedNetwork } from "../ts/deployment";
import {
  Erc20Token,
  isNativeToken,
  NativeToken,
  WRAPPED_NATIVE_TOKEN_ADDRESS,
} from "../ts/tokens";

export interface ReferenceToken {
  symbol: string;
  decimals: number;
  address: string;
}
export const REFERENCE_TOKEN: Record<SupportedNetwork, ReferenceToken> = {
  rinkeby: {
    symbol: "DAI",
    decimals: 18,
    address: "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea",
  },
  goerli: {
    symbol: "DAI",
    decimals: 18,
    address: "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
  },
  mainnet: {
    symbol: "DAI",
    decimals: 18,
    address: "0x6b175474e89094c44da98b954eedeac495271d0f",
  },
  xdai: {
    // todo: replace with XDAI when native token price queries will be supported
    // by the services.
    symbol: "WXDAI",
    decimals: 18,
    address: WRAPPED_NATIVE_TOKEN_ADDRESS.xdai,
  },
} as const;

export async function usdValue(
  token: string,
  amount: BigNumber,
  referenceToken: ReferenceToken,
  api: Api,
): Promise<BigNumber> {
  return `${token}`.toLowerCase() != referenceToken.address.toLowerCase()
    ? await api.estimateTradeAmount({
        sellToken: token,
        buyToken: referenceToken.address,
        amount,
        kind: OrderKind.SELL,
      })
    : amount;
}

export async function usdValueOfEth(
  amount: BigNumber,
  referenceToken: ReferenceToken,
  network: SupportedNetwork,
  api: Api,
): Promise<BigNumber> {
  return await usdValue(
    WRAPPED_NATIVE_TOKEN_ADDRESS[network],
    amount,
    referenceToken,
    api,
  );
}

export async function ethValue(
  token: Erc20Token | NativeToken,
  amount: BigNumber,
  network: SupportedNetwork,
  api: Api,
): Promise<BigNumber> {
  if (
    isNativeToken(token) ||
    token.address == WRAPPED_NATIVE_TOKEN_ADDRESS[network] // todo: remove when services support selling weth for eth
  ) {
    return amount;
  }
  return await api.estimateTradeAmount({
    sellToken: token.address,
    buyToken: BUY_ETH_ADDRESS,
    amount,
    kind: OrderKind.SELL,
  });
}

// Format amount so that it has exactly a fixed amount of decimals.
export function formatTokenValue(
  amount: BigNumber,
  actualDecimals: number,
  targetDecimals: number,
): string {
  const normalized =
    targetDecimals <= actualDecimals
      ? amount.div(BigNumber.from(10).pow(actualDecimals - targetDecimals))
      : amount.mul(BigNumber.from(10).pow(-actualDecimals + targetDecimals));
  const powDecimals = BigNumber.from(10).pow(targetDecimals);
  return `${normalized.div(powDecimals).toString()}.${normalized
    .mod(powDecimals)
    .toString()
    .padStart(targetDecimals, "0")}`;
}

export function formatUsdValue(
  amount: BigNumber,
  usdReference: ReferenceToken,
): string {
  return formatTokenValue(amount, usdReference.decimals, 2);
}

export function formatGasCost(
  amount: BigNumber,
  usdAmount: BigNumber,
  network: SupportedNetwork,
  usdReference: ReferenceToken,
): string {
  switch (network) {
    case "mainnet": {
      return `${utils.formatEther(amount)} ETH (${formatUsdValue(
        usdAmount,
        usdReference,
      )} USD)`;
    }
    case "xdai":
      return `${utils.formatEther(amount)} XDAI`;
    default:
      return `${utils.formatEther(amount)} ETH`;
  }
}
