import type { Address } from 'viem'

export interface LopSwapContracts {
  limitOrderProtocol: Address
  ammPool: Address
  flashLoanPool: Address
  erc20True: Address
}

const sharedContracts = {
  limitOrderProtocol: '0x111111125421cA6dc452d289314280a0f8842A65',
  ammPool: '0x2222222208DcF8118D2161B415f86c3222217C54',
  flashLoanPool: '0x222222228b47b83E44eF89bC41C240b22223884c',
  erc20True: '0xDA0000d4000015A526378bB6faFc650Cea5966F8',
} as const satisfies LopSwapContracts

export const defaultContracts: Readonly<Record<number, LopSwapContracts>> = {
  1: sharedContracts,
  137: sharedContracts,
}

export const ORDER_DOMAIN_NAME = '1inch Aggregation Router'
export const ORDER_DOMAIN_VERSION = '6'
export const PROVIDER_FEE_BASE = 100_000n
export const MAX_UINT256 = (1n << 256n) - 1n
