import { createWalletClient, http, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygon } from 'viem/chains'
import { LopSwap, PoolType } from '@lopswap/sdk'

interface CreateAmmPoolParams {
  privateKey: Hex
  rpcUrl: string
  tokenA: Address
  tokenB: Address
  amountA: bigint
  amountB: bigint
  providerFee: bigint
  providerFeeReceiver?: Address
  expiration: bigint
}

const API_URL = 'https://api.lopswap.io'

export async function createAmmPool(params: CreateAmmPoolParams) {
  const account = privateKeyToAccount(params.privateKey)
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(params.rpcUrl),
  })
  const sdk = new LopSwap({
    chainId: polygon.id,
    apiUrl: API_URL,
    rpcUrl: params.rpcUrl,
  })

  return sdk.createPool(
    {
      type: PoolType.AMM,
      maker: account.address,
      tokenA: params.tokenA,
      tokenB: params.tokenB,
      amountA: params.amountA,
      amountB: params.amountB,
      providerFee: params.providerFee,
      ...(params.providerFeeReceiver
        ? { providerFeeReceiver: params.providerFeeReceiver }
        : {}),
      expiration: params.expiration,
    },
    walletClient,
  )
}
