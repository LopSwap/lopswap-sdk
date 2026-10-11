import {
  createPublicClient,
  getAddress,
  hashTypedData,
  http,
  isAddressEqual,
  type Address,
  type Hash,
  type Hex,
} from 'viem'
import { LopSwapApi } from './api.js'
import { defaultContracts, MAX_UINT256 } from './config.js'
import { erc20Abi, limitOrderProtocolAbi, lopSwapAbi } from './contracts.js'
import {
  buildOrderTypedData,
  preparePool as buildPreparedPool,
} from './orders.js'
import { LimitOrderStatus, OnchainPoolStatus } from './types.js'
import { validatePreparedPool, validateSignedPool } from './validation.js'
import type {
  ChainInfo,
  CreatePoolResult,
  GetPoolsParams,
  GetTokensParams,
  LiquidityAmount,
  LopSwapConfig,
  LopSwapWalletClient,
  Pool,
  PoolAndOrdersStatus,
  PoolBalances,
  PoolDetails,
  PoolListResult,
  PoolOrder,
  PoolTypeInfo,
  PreparePoolParams,
  PreparedPool,
  SignedPool,
  Token,
  TokenListResult,
} from './types.js'

/**
 * Client for creating, discovering, and managing LopSwap pools on one chain.
 *
 * The SDK never accepts or stores private keys. Pass a viem wallet client only
 * to methods that require a signature or transaction.
 *
 * @sortStrategy source-order
 */
export class LopSwap {
  readonly #chainId: number
  readonly #rpcClient: ReturnType<typeof createPublicClient> | undefined
  readonly #contracts
  readonly #api: LopSwapApi

  /**
   * Creates a LopSwap SDK instance bound to the configured chain.
   *
   * @param config - API URL, chain, and optional JSON-RPC endpoint.
   * @throws If the chain is not supported.
   */
  constructor(config: LopSwapConfig) {
    const contracts = defaultContracts[config.chainId]
    if (!contracts) {
      throw new Error(`Unsupported LopSwap chain ${config.chainId}`)
    }

    this.#chainId = config.chainId
    this.#rpcClient = config.rpcUrl
      ? createPublicClient({ transport: http(config.rpcUrl) })
      : undefined
    this.#contracts = contracts
    this.#api = new LopSwapApi(config.apiUrl)
  }

  /**
   * Prepares, signs, validates, and submits a pool.
   *
   * This convenience method performs local work, requests wallet signatures,
   * and sends an HTTP request. It does not send an onchain transaction.
   *
   * @remarks **Execution:** Local + Wallet + HTTP
   * @param params - AMM or flash-loan pool parameters.
   * @param walletClient - viem wallet client for the pool maker on the SDK chain.
   * @returns The chain, deterministic pool ID, and pool type accepted by the API.
   * @throws If preparation, signing, validation, or the HTTP request fails.
   * @group Pool creation
   */
  async createPool(
    params: PreparePoolParams,
    walletClient: LopSwapWalletClient,
  ): Promise<CreatePoolResult> {
    const prepared = this.preparePool(params)
    const signed = await this.signPool(prepared, walletClient)
    return this.submitPool(signed)
  }

  /**
   * Builds pool orders and EIP-712 typed data locally.
   *
   * This method does not use a wallet, RPC, or HTTP. Liquidity amounts must be
   * provided in token base units. AMM tokens may be supplied in either order;
   * the SDK sorts them with their amounts by address and applies the onchain
   * amount encoding.
   *
   * @remarks **Execution:** Local
   * @param params - AMM or flash-loan pool parameters.
   * @returns Unsigned orders and typed data ready for {@link signPool}.
   * @throws If an address, amount, fee, expiration, nonce, or pool type is invalid.
   * @group Pool creation
   */
  preparePool(params: PreparePoolParams): PreparedPool {
    return buildPreparedPool(params, this.#chainId, this.#contracts)
  }

  /**
   * Requests an EIP-712 signature for every order in a prepared pool.
   *
   * This method uses the wallet but does not send an HTTP request or transaction.
   *
   * @remarks **Execution:** Wallet
   * @param pool - Pool returned by {@link preparePool}.
   * @param walletClient - viem wallet client whose account matches the pool maker.
   * @returns The prepared pool with one signature per order.
   * @throws If the pool is invalid or the wallet account or chain does not match.
   * @group Pool creation
   */
  async signPool(
    pool: PreparedPool,
    walletClient: LopSwapWalletClient,
  ): Promise<SignedPool> {
    validatePreparedPool(pool, this.#chainId, this.#contracts)
    const account = this.#requireMakerAccount(
      walletClient,
      pool.orders[0]!.maker,
    )
    const signatures: Hex[] = []

    for (const typedData of pool.typedData) {
      signatures.push(
        await walletClient.signTypedData({
          account,
          ...typedData,
        }),
      )
    }

    return { ...pool, signatures }
  }

  /**
   * Validates pool structure, typed data, order encoding, and signatures locally.
   *
   * This method performs no HTTP or RPC requests.
   *
   * @remarks **Execution:** Local
   * @param pool - Signed pool to validate against the SDK chain and contracts.
   * @returns Nothing when validation succeeds.
   * @throws If any pool, order, typed-data, extension, or signature check fails.
   * @group Pool creation
   */
  async validatePool(pool: SignedPool): Promise<void> {
    await validateSignedPool(pool, this.#chainId, this.#contracts)
  }

  /**
   * Validates a signed pool locally and submits it to the LopSwap API.
   *
   * Invalid pools are rejected before the HTTP request is made.
   *
   * @remarks **Execution:** Local + HTTP
   * @param pool - Prepared pool with one valid maker signature per order.
   * @returns The chain, deterministic pool ID, and submitted pool type.
   * @throws If local validation fails or the API returns an error.
   * @group Pool creation
   */
  async submitPool(pool: SignedPool): Promise<CreatePoolResult> {
    await this.validatePool(pool)
    return this.#api.submitPool(pool)
  }

  /**
   * Lists active, non-expired pools through the LopSwap API.
   *
   * Returned balances are backend-cached estimates and may be `null` or stale.
   * Use {@link getPoolBalances} when current onchain balances are required.
   * Pool assets have no tokenA/tokenB positional meaning; match them by address.
   *
   * @remarks **Execution:** HTTP
   * @param params - Pool type, optional filters, cursor, and page limit.
   * @returns A page of pools with provider fee details and the next cursor, if any.
   * @throws If filters are invalid or the API request fails.
   * @group Discovery
   */
  getPools(params: GetPoolsParams): Promise<PoolListResult> {
    return this.#api.getPools(this.#chainId, params)
  }

  /**
   * Gets one pool through the LopSwap API, including inactive or expired pools.
   *
   * Asset balances in the response are backend-cached estimates.
   * Pool assets have no tokenA/tokenB positional meaning; match them by address.
   *
   * @remarks **Execution:** HTTP
   * @param poolId - Deterministic bytes32 pool identifier.
   * @returns Pool status, expiration, provider fee, assets, and signed orders.
   * @throws If the pool ID is invalid or the API request fails.
   * @group Discovery
   */
  getPool(poolId: Hex): Promise<PoolDetails> {
    return this.#api.getPool(this.#chainId, poolId)
  }

  /**
   * Lists pool types and their active pool counts through the LopSwap API.
   *
   * @remarks **Execution:** HTTP
   * @returns Pool types supported for the SDK chain.
   * @throws If the API request fails.
   * @group Discovery
   */
  getPoolTypes(): Promise<PoolTypeInfo[]> {
    return this.#api.getPoolTypes(this.#chainId)
  }

  /**
   * Lists chains supported by the LopSwap API.
   *
   * @remarks **Execution:** HTTP
   * @returns Supported chain IDs and names.
   * @throws If the API request fails.
   * @group Discovery
   */
  getChains(): Promise<ChainInfo[]> {
    return this.#api.getChains()
  }

  /**
   * Lists known token metadata for the SDK chain through the LopSwap API.
   *
   * @remarks **Execution:** HTTP
   * @param params - Optional offset and page limit.
   * @returns A paginated token list.
   * @throws If pagination is invalid or the API request fails.
   * @group Discovery
   */
  getTokens(params: GetTokensParams = {}): Promise<TokenListResult> {
    return this.#api.getTokens(this.#chainId, params)
  }

  /**
   * Gets known token metadata through the LopSwap API.
   *
   * @remarks **Execution:** HTTP
   * @param address - Token contract address on the SDK chain.
   * @returns Token address, symbol, name, decimals, and logo URL.
   * @throws If the address is invalid or the API request fails.
   * @group Discovery
   */
  getToken(address: Address): Promise<Token> {
    return this.#api.getToken(this.#chainId, getAddress(address))
  }

  /**
   * Reads the owner's current token allowance for the 1inch protocol via RPC.
   *
   * @remarks **Execution:** RPC read
   * @param token - ERC-20 token contract address.
   * @param owner - Address whose allowance is read.
   * @returns Allowance in the token's base units.
   * @throws If no RPC URL is configured or the RPC read fails.
   * @group Onchain reads
   */
  async getAllowance(token: Address, owner: Address): Promise<bigint> {
    const rpcClient = this.#requireRpcClient()
    return rpcClient.readContract({
      address: getAddress(token),
      abi: erc20Abi,
      functionName: 'allowance',
      args: [getAddress(owner), this.#contracts.limitOrderProtocol],
    })
  }

  /**
   * Approves the 1inch protocol to spend an ERC-20 token.
   *
   * This method sends an onchain transaction and returns before confirmation.
   *
   * @remarks **Execution:** Transaction
   * @param token - ERC-20 token contract address.
   * @param walletClient - viem wallet client used to send the transaction.
   * @param amount - Allowance in base units. Defaults to `MAX_UINT256`.
   * @returns Submitted transaction hash.
   * @throws If the wallet has no account, uses another chain, or submission fails.
   * @group Transactions
   */
  async approveToken(
    token: Address,
    walletClient: LopSwapWalletClient,
    amount: bigint = MAX_UINT256,
  ): Promise<Hash> {
    const account = this.#requireAccount(walletClient)
    this.#assertWalletChain(walletClient)
    return walletClient.writeContract({
      account,
      chain: walletClient.chain,
      address: getAddress(token),
      abi: erc20Abi,
      functionName: 'approve',
      args: [this.#contracts.limitOrderProtocol, amount],
    })
  }

  /**
   * Reads current pool balances directly from the pool contract via RPC.
   *
   * Values follow the supplied order's `makerAsset` and `takerAsset` direction.
   *
   * @remarks **Execution:** RPC read
   * @param order - Pool order whose balances are read.
   * @returns Current total and available maker/taker asset balances.
   * @throws If no RPC URL is configured or the RPC read fails.
   * @group Onchain reads
   */
  async getPoolBalances(order: PoolOrder): Promise<PoolBalances> {
    const rpcClient = this.#requireRpcClient()
    const result = await rpcClient.readContract({
      address: order.receiver,
      abi: lopSwapAbi,
      functionName: 'getBalances',
      args: [toContractOrder(order)],
    })

    return {
      makerAssetBalance: result[0],
      takerAssetBalance: result[1],
      availableMakerAssetBalance: result[2],
      availableTakerAssetBalance: result[3],
    }
  }

  /**
   * Reads the pool contract's current status via RPC.
   *
   * This checks only `LOPSwap.poolStatus`. Direct invalidation of an individual
   * order in the 1inch protocol is not reflected in this result.
   *
   * @remarks **Execution:** RPC read
   * @param pool - Prepared pool or API pool containing at least one order.
   * @returns The pool's `NEW`, `INITIALIZED`, or `INVALIDATED` status.
   * @throws If the pool uses another chain, no RPC URL is configured, the
   * pool has no orders, the contract returns an unknown status, or an RPC read fails.
   * @group Onchain reads
   */
  async getPoolStatus(pool: PreparedPool | Pool): Promise<OnchainPoolStatus> {
    if (pool.chainId !== this.#chainId) {
      throw new Error(
        `Pool chain ${pool.chainId} does not match SDK chain ${this.#chainId}`,
      )
    }
    const rpcClient = this.#requireRpcClient()
    const order = firstPoolOrder(pool)
    const poolId = await rpcClient.readContract({
      address: order.receiver,
      abi: lopSwapAbi,
      functionName: 'getPool',
      args: [toContractOrder(order)],
    })
    const status = await rpcClient.readContract({
      address: order.receiver,
      abi: lopSwapAbi,
      functionName: 'poolStatus',
      args: [poolId],
    })

    return toOnchainPoolStatus(status)
  }

  /**
   * Reads the pool status and every order's status in the 1inch protocol.
   *
   * An order is `NEW` before its first fill, `ACTIVE` after a partial fill,
   * and `CANCELED` when its raw remaining invalidator is `uint256.max`. For
   * LopSwap orders, the SDK interprets this value as cancellation.
   *
   * @remarks **Execution:** RPC read
   * @param pool - Prepared pool or API pool containing its complete order set.
   * @returns The LOPSwap pool status and one 1inch status per supplied order.
   * @throws If the pool uses another chain, no RPC URL is configured, the
   * pool has no orders, the contract returns an unknown status, or an RPC read fails.
   * @group Onchain reads
   */
  async getPoolAndOrdersStatus(
    pool: PreparedPool | Pool,
  ): Promise<PoolAndOrdersStatus> {
    const rpcClient = this.#requireRpcClient()
    const poolStatus = await this.getPoolStatus(pool)
    const orders = await Promise.all(
      pool.orders.map(async (order) => {
        const orderHash = hashTypedData(
          buildOrderTypedData(
            order,
            this.#chainId,
            this.#contracts.limitOrderProtocol,
          ),
        )
        const remainingRaw = await rpcClient.readContract({
          address: this.#contracts.limitOrderProtocol,
          abi: limitOrderProtocolAbi,
          functionName: 'rawRemainingInvalidatorForOrder',
          args: [order.maker, orderHash],
        })

        return {
          orderHash,
          status: toLimitOrderStatus(remainingRaw),
        }
      }),
    )

    return { poolStatus, orders }
  }

  /**
   * Updates liquidity limits in the pool contract.
   *
   * This method sends an onchain transaction and returns before confirmation.
   *
   * @remarks **Execution:** Transaction
   * @param order - Pool order owned by the connected wallet account.
   * @param liquidity - One or more token addresses and amounts in base units.
   * @param walletClient - viem wallet client used to send the transaction.
   * @returns Submitted transaction hash.
   * @throws If liquidity is empty, the maker or chain differs, or submission fails.
   * @group Transactions
   */
  async setLiquidity(
    order: PoolOrder,
    liquidity: readonly LiquidityAmount[],
    walletClient: LopSwapWalletClient,
  ): Promise<Hash> {
    const account = this.#requireMakerAccount(walletClient, order.maker)
    this.#assertWalletChain(walletClient)
    if (liquidity.length === 0)
      throw new Error('At least one liquidity amount is required')

    return walletClient.writeContract({
      account,
      chain: walletClient.chain,
      address: order.receiver,
      abi: lopSwapAbi,
      functionName: 'setLiquidity',
      args: [
        toContractOrder(order),
        liquidity.map(({ asset }) => getAddress(asset)),
        liquidity.map(({ amount }) => amount),
      ],
    })
  }

  /**
   * Invalidates a pool in its pool contract.
   *
   * This method sends an onchain transaction and returns before confirmation.
   *
   * @remarks **Execution:** Transaction
   * @param order - Pool order owned by the connected wallet account.
   * @param walletClient - viem wallet client used to send the transaction.
   * @returns Submitted transaction hash.
   * @throws If the maker or chain differs or transaction submission fails.
   * @group Transactions
   */
  async invalidatePool(
    order: PoolOrder,
    walletClient: LopSwapWalletClient,
  ): Promise<Hash> {
    const account = this.#requireMakerAccount(walletClient, order.maker)
    this.#assertWalletChain(walletClient)

    return walletClient.writeContract({
      account,
      chain: walletClient.chain,
      address: order.receiver,
      abi: lopSwapAbi,
      functionName: 'invalidatePool',
      args: [toContractOrder(order)],
    })
  }

  #assertWalletChain(walletClient: LopSwapWalletClient): void {
    if (walletClient.chain && walletClient.chain.id !== this.#chainId) {
      throw new Error(
        `Wallet chain ${walletClient.chain.id} does not match SDK chain ${this.#chainId}`,
      )
    }
  }

  #requireAccount(walletClient: LopSwapWalletClient) {
    if (!walletClient.account) throw new Error('Wallet client has no account')
    return walletClient.account
  }

  #requireMakerAccount(walletClient: LopSwapWalletClient, maker: Address) {
    const account = this.#requireAccount(walletClient)
    this.#assertWalletChain(walletClient)
    if (!isAddressEqual(account.address, maker)) {
      throw new Error('Wallet account does not match pool maker')
    }
    return account
  }

  #requireRpcClient() {
    if (!this.#rpcClient) {
      throw new Error('rpcUrl is required for this operation')
    }
    return this.#rpcClient
  }
}

function toContractOrder(order: PoolOrder) {
  return {
    salt: order.salt,
    maker: BigInt(order.maker),
    receiver: BigInt(order.receiver),
    makerAsset: BigInt(order.makerAsset),
    takerAsset: BigInt(order.takerAsset),
    makingAmount: order.makingAmount,
    takingAmount: order.takingAmount,
    makerTraits: order.makerTraits,
  }
}

function firstPoolOrder(pool: PreparedPool | Pool): PoolOrder {
  const order = pool.orders[0]
  if (!order) throw new Error('Pool must contain at least one order')
  return order
}

function toOnchainPoolStatus(status: bigint): OnchainPoolStatus {
  if (status === 0n) return OnchainPoolStatus.NEW
  if (status === 1n) return OnchainPoolStatus.INITIALIZED
  if (status === 2n) return OnchainPoolStatus.INVALIDATED
  throw new Error(`Unknown onchain pool status: ${status}`)
}

function toLimitOrderStatus(remainingRaw: bigint): LimitOrderStatus {
  if (remainingRaw === 0n) return LimitOrderStatus.NEW
  if (remainingRaw === MAX_UINT256) return LimitOrderStatus.CANCELED
  return LimitOrderStatus.ACTIVE
}
