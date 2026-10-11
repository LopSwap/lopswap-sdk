import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWalletClient, custom, type Hash, type WalletClient } from 'viem'
import type * as Viem from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, polygon } from 'viem/chains'
import {
  LopSwap,
  LimitOrderStatus,
  MAX_UINT256,
  OnchainPoolStatus,
  PoolStatus,
  PoolType,
  type LopSwapConfig,
} from '../src/index.js'
import { defaultContracts } from '../src/config.js'
import type { PoolOrder } from '../src/types.js'

const { readContract } = vi.hoisted(() => ({
  readContract: vi.fn<(parameters: ContractCall) => Promise<unknown>>(),
}))

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof Viem>()
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({ readContract })),
  }
})

const account = privateKeyToAccount(
  '0x0000000000000000000000000000000000000000000000000000000000000001',
)
const otherAccount = privateKeyToAccount(
  '0x0000000000000000000000000000000000000000000000000000000000000002',
)
const tokenA = '0x2222222222222222222222222222222222222222'
const tokenB = '0x3333333333333333333333333333333333333333'
const poolId = `0x${'ab'.repeat(32)}` as const
const transactionHash = `0x${'cd'.repeat(32)}` as Hash
const expiration = 4_102_444_800n

afterEach(() => {
  vi.unstubAllGlobals()
  readContract.mockReset()
})

describe('LopSwap orchestration', () => {
  it('creates a pool by preparing, signing, validating, and submitting it', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse({ chainId: 137, poolId, type: PoolType.AMM }, 201),
    )
    vi.stubGlobal('fetch', fetchMock)
    const sdk = createSdk()

    const result = await sdk.createPool(
      {
        type: PoolType.AMM,
        maker: account.address,
        tokenA,
        tokenB,
        amountA: 100n,
        amountB: 200n,
        providerFee: 100n,
        expiration,
        poolNonce: 1n,
      },
      signingWallet(account, polygon),
    )

    expect(result).toEqual({ chainId: 137, poolId, type: PoolType.AMM })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('signs and validates a prepared pool independently', async () => {
    const sdk = createSdk()
    const prepared = sdk.preparePool({
      type: PoolType.FLASHLOAN,
      maker: account.address,
      token: tokenA,
      amount: 100n,
      providerFee: 0n,
      expiration,
      poolNonce: 2n,
    })

    const signed = await sdk.signPool(prepared, signingWallet(account, polygon))

    expect(signed.signatures).toHaveLength(1)
    await expect(sdk.validatePool(signed)).resolves.toBeUndefined()
  })

  it('requires the configured maker, account, and chain when signing', async () => {
    const sdk = createSdk()
    const prepared = sdk.preparePool({
      type: PoolType.FLASHLOAN,
      maker: account.address,
      token: tokenA,
      amount: 100n,
      providerFee: 0n,
      expiration,
      poolNonce: 3n,
    })

    await expect(
      sdk.signPool(prepared, signingWallet(otherAccount, polygon)),
    ).rejects.toThrow('Wallet account does not match pool maker')
    await expect(
      sdk.signPool(prepared, signingWallet(account, mainnet)),
    ).rejects.toThrow('Wallet chain 1 does not match SDK chain 137')
    await expect(
      sdk.signPool(prepared, { chain: polygon } as unknown as WalletClient),
    ).rejects.toThrow('Wallet client has no account')
  })

  it('rejects chains without built-in contracts', () => {
    expect(
      () =>
        new LopSwap({
          chainId: 10,
          apiUrl: 'https://api.example.test',
        }),
    ).toThrow('Unsupported LopSwap chain 10')
  })
})

describe('LopSwap API delegation', () => {
  it('exposes pool, chain, and token discovery methods', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === '/v1/pools/list') {
        return jsonResponse({ pools: [], nextCursor: null })
      }
      if (url.pathname.startsWith('/v1/pools/details/')) {
        return jsonResponse(poolDetailsResponse())
      }
      if (url.pathname === '/v1/pools/types') {
        return jsonResponse([{ type: PoolType.AMM, poolCount: 1 }])
      }
      if (url.pathname === '/v1/chains/list') {
        return jsonResponse([{ chainId: 137, name: 'Polygon' }])
      }
      if (url.pathname === `/v1/token/137/${tokenA}`) {
        return jsonResponse(tokenResponse())
      }
      return jsonResponse({
        tokens: [tokenResponse()],
        total: 1,
        hasNextPage: false,
        offset: 0,
        limit: 100,
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const sdk = createSdk()

    await expect(sdk.getPools({ type: PoolType.AMM })).resolves.toEqual({
      pools: [],
      nextCursor: null,
    })
    await expect(sdk.getPool(poolId)).resolves.toMatchObject({
      poolId,
      providerFee: 100,
      providerFeeReceiver: tokenB,
      status: PoolStatus.ACTIVE,
    })
    await expect(sdk.getPoolTypes()).resolves.toEqual([
      { type: PoolType.AMM, poolCount: 1 },
    ])
    await expect(sdk.getChains()).resolves.toEqual([
      { chainId: 137, name: 'Polygon' },
    ])
    await expect(sdk.getTokens()).resolves.toMatchObject({ total: 1 })
    await expect(sdk.getTokens({ limit: 100 })).resolves.toMatchObject({
      total: 1,
    })
    await expect(sdk.getToken(tokenA)).resolves.toEqual(tokenResponse())
  })
})

describe('LopSwap contract reads and transactions', () => {
  it('reads allowance and live pool balances through RPC', async () => {
    readContract
      .mockResolvedValueOnce(500n)
      .mockResolvedValueOnce([100n, 200n, 90n, 180n])
    const sdk = createSdk({
      rpcUrl: 'https://rpc.example.test',
    })
    const order = preparedOrder(sdk)

    await expect(sdk.getAllowance(tokenA, account.address)).resolves.toBe(500n)
    await expect(sdk.getPoolBalances(order)).resolves.toEqual({
      makerAssetBalance: 100n,
      takerAssetBalance: 200n,
      availableMakerAssetBalance: 90n,
      availableTakerAssetBalance: 180n,
    })

    expect(readContract.mock.calls[0]?.[0]).toMatchObject({
      address: tokenA,
      functionName: 'allowance',
      args: [account.address, defaultContracts[137]?.limitOrderProtocol],
    })
    expect(readContract.mock.calls[1]?.[0]).toMatchObject({
      address: order.receiver,
      functionName: 'getBalances',
    })
  })

  it('reads every LopSwap pool status from the pool contract', async () => {
    readContract
      .mockResolvedValueOnce(poolId)
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(poolId)
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(poolId)
      .mockResolvedValueOnce(2n)
    const sdk = createSdk({
      rpcUrl: 'https://rpc.example.test',
    })
    const pool = sdk.preparePool({
      type: PoolType.AMM,
      maker: account.address,
      tokenA,
      tokenB,
      amountA: 100n,
      amountB: 200n,
      providerFee: 0n,
      expiration,
      poolNonce: 5n,
    })

    await expect(sdk.getPoolStatus(pool)).resolves.toBe(OnchainPoolStatus.NEW)
    await expect(sdk.getPoolStatus(pool)).resolves.toBe(
      OnchainPoolStatus.INITIALIZED,
    )
    await expect(sdk.getPoolStatus(pool)).resolves.toBe(
      OnchainPoolStatus.INVALIDATED,
    )

    expect(readContract.mock.calls[0]?.[0]).toMatchObject({
      address: pool.orders[0]?.receiver,
      functionName: 'getPool',
    })
    expect(readContract.mock.calls[1]?.[0]).toMatchObject({
      address: pool.orders[0]?.receiver,
      functionName: 'poolStatus',
      args: [poolId],
    })
  })

  it('reads the pool and every 1inch order status', async () => {
    readContract
      .mockResolvedValueOnce(poolId)
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(123n)
    const sdk = createSdk({
      rpcUrl: 'https://rpc.example.test',
    })
    const pool = sdk.preparePool({
      type: PoolType.AMM,
      maker: account.address,
      tokenA,
      tokenB,
      amountA: 100n,
      amountB: 200n,
      providerFee: 0n,
      expiration,
      poolNonce: 6n,
    })

    const result = await sdk.getPoolAndOrdersStatus(pool)

    expect(result).toEqual({
      poolStatus: OnchainPoolStatus.INITIALIZED,
      orders: [
        { orderHash: expect.any(String), status: LimitOrderStatus.NEW },
        { orderHash: expect.any(String), status: LimitOrderStatus.ACTIVE },
      ],
    })
    expect(result.orders[0]?.orderHash).not.toBe(result.orders[1]?.orderHash)
    expect(readContract.mock.calls[2]?.[0]).toMatchObject({
      address: defaultContracts[137]?.limitOrderProtocol,
      functionName: 'rawRemainingInvalidatorForOrder',
      args: [pool.orders[0]?.maker, result.orders[0]?.orderHash],
    })
    expect(readContract.mock.calls[3]?.[0]).toMatchObject({
      args: [pool.orders[1]?.maker, result.orders[1]?.orderHash],
    })
  })

  it('reports a canceled 1inch order', async () => {
    readContract
      .mockResolvedValueOnce(poolId)
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(MAX_UINT256)
    const sdk = createSdk({
      rpcUrl: 'https://rpc.example.test',
    })
    const pool = sdk.preparePool({
      type: PoolType.FLASHLOAN,
      maker: account.address,
      token: tokenA,
      amount: 100n,
      providerFee: 0n,
      expiration,
      poolNonce: 7n,
    })

    await expect(sdk.getPoolAndOrdersStatus(pool)).resolves.toMatchObject({
      orders: [{ status: LimitOrderStatus.CANCELED }],
    })
  })

  it('rejects a pool from another chain, an empty pool, and an unknown status', async () => {
    readContract.mockResolvedValueOnce(poolId).mockResolvedValueOnce(3n)
    const sdk = createSdk({
      rpcUrl: 'https://rpc.example.test',
    })
    const pool = sdk.preparePool({
      type: PoolType.FLASHLOAN,
      maker: account.address,
      token: tokenA,
      amount: 100n,
      providerFee: 0n,
      expiration,
      poolNonce: 8n,
    })

    await expect(sdk.getPoolStatus({ ...pool, chainId: 1 })).rejects.toThrow(
      'Pool chain 1 does not match SDK chain 137',
    )
    await expect(sdk.getPoolStatus({ ...pool, orders: [] })).rejects.toThrow(
      'Pool must contain at least one order',
    )
    await expect(sdk.getPoolStatus(pool)).rejects.toThrow(
      'Unknown onchain pool status: 3',
    )
  })

  it('approves tokens with default and explicit amounts', async () => {
    const first = transactionWallet()
    const second = transactionWallet({ chain: undefined })
    const sdk = createSdk()

    await expect(sdk.approveToken(tokenA, first.wallet)).resolves.toBe(
      transactionHash,
    )
    await expect(sdk.approveToken(tokenA, second.wallet, 123n)).resolves.toBe(
      transactionHash,
    )

    expect(first.writeContract.mock.calls[0]?.[0]).toMatchObject({
      address: tokenA,
      functionName: 'approve',
      args: [defaultContracts[137]?.limitOrderProtocol, MAX_UINT256],
    })
    expect(second.writeContract.mock.calls[0]?.[0]).toMatchObject({
      args: [defaultContracts[137]?.limitOrderProtocol, 123n],
    })
  })

  it('sets liquidity and invalidates a pool onchain', async () => {
    const { wallet, writeContract } = transactionWallet()
    const sdk = createSdk()
    const order = preparedOrder(sdk)

    await expect(
      sdk.setLiquidity(
        order,
        [
          { asset: tokenA, amount: 10n },
          { asset: tokenB, amount: 20n },
        ],
        wallet,
      ),
    ).resolves.toBe(transactionHash)
    await expect(sdk.invalidatePool(order, wallet)).resolves.toBe(
      transactionHash,
    )

    expect(writeContract.mock.calls[0]?.[0]).toMatchObject({
      address: order.receiver,
      functionName: 'setLiquidity',
    })
    expect(writeContract.mock.calls[0]?.[0]?.args?.[1]).toEqual([
      tokenA,
      tokenB,
    ])
    expect(writeContract.mock.calls[0]?.[0]?.args?.[2]).toEqual([10n, 20n])
    expect(writeContract.mock.calls[1]?.[0]).toMatchObject({
      address: order.receiver,
      functionName: 'invalidatePool',
    })
  })

  it('rejects invalid transaction prerequisites', async () => {
    const sdk = createSdk()
    const order = preparedOrder(sdk)

    await expect(sdk.getAllowance(tokenA, account.address)).rejects.toThrow(
      'rpcUrl is required for this operation',
    )
    await expect(sdk.getPoolBalances(order)).rejects.toThrow(
      'rpcUrl is required for this operation',
    )
    await expect(
      sdk.approveToken(tokenA, { chain: polygon } as unknown as WalletClient),
    ).rejects.toThrow('Wallet client has no account')
    await expect(
      sdk.approveToken(tokenA, transactionWallet({ chain: mainnet }).wallet),
    ).rejects.toThrow('Wallet chain 1 does not match SDK chain 137')
    await expect(
      sdk.setLiquidity(order, [], transactionWallet().wallet),
    ).rejects.toThrow('At least one liquidity amount is required')
    await expect(
      sdk.invalidatePool(
        { ...order, maker: otherAccount.address },
        transactionWallet().wallet,
      ),
    ).rejects.toThrow('Wallet account does not match pool maker')
  })
})

function createSdk(overrides: Partial<LopSwapConfig> = {}) {
  return new LopSwap({
    chainId: 137,
    apiUrl: 'https://api.example.test',
    ...overrides,
  })
}

function signingWallet(
  signer: typeof account,
  chain: typeof polygon | typeof mainnet,
): WalletClient {
  return createWalletClient({
    account: signer,
    chain,
    transport: custom({
      request: async () => {
        throw new Error('Unexpected RPC request')
      },
    }),
  }) as unknown as WalletClient
}

function transactionWallet(
  options: { chain?: typeof polygon | typeof mainnet | undefined } = {},
) {
  const writeContract = vi.fn<(parameters: ContractCall) => Promise<Hash>>(
    async () => transactionHash,
  )
  const chain = Object.hasOwn(options, 'chain') ? options.chain : polygon
  const wallet = {
    account,
    chain,
    writeContract,
  } as unknown as WalletClient
  return { wallet, writeContract }
}

interface ContractCall {
  address?: unknown
  functionName?: string
  args?: readonly unknown[]
}

function preparedOrder(sdk: LopSwap): PoolOrder {
  const pool = sdk.preparePool({
    type: PoolType.FLASHLOAN,
    maker: account.address,
    token: tokenA,
    amount: 100n,
    providerFee: 0n,
    expiration,
    poolNonce: 4n,
  })
  const order = pool.orders[0]
  if (!order) throw new Error('Expected a prepared order')
  return order
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function tokenResponse() {
  return {
    chainId: 137,
    address: tokenA,
    symbol: 'TKA',
    name: 'Token A',
    decimals: 18,
    logo: 'https://example.test/token.svg',
  }
}

function poolDetailsResponse() {
  const order = preparedOrder(createSdk())
  return {
    poolId,
    chainId: 137,
    type: PoolType.FLASHLOAN,
    maker: account.address,
    providerFee: 100,
    providerFeeReceiver: tokenB,
    expiresAt: '2100-01-01T00:00:00.000Z',
    assets: [{ token: tokenA, balance: '100', availableBalance: '90' }],
    orders: [
      {
        ...order,
        salt: order.salt.toString(),
        makingAmount: order.makingAmount.toString(),
        takingAmount: order.takingAmount.toString(),
        makerTraits: order.makerTraits.toString(),
        signature: '0x01',
      },
    ],
    status: PoolStatus.ACTIVE,
    expired: false,
  }
}
