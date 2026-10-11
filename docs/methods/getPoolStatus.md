[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getPoolStatus

# Method: getPoolStatus()

<kbd>RPC read</kbd>

```ts
getPoolStatus(pool: PreparedPool | Pool): Promise<OnchainPoolStatus>;
```

Reads the pool contract's current status via RPC.

This checks only `LOPSwap.poolStatus`. Direct invalidation of an individual
order in the 1inch protocol is not reflected in this result.

## Parameters

| Parameter | Type                                                                               | Required | Description                                              |
| :-------- | :--------------------------------------------------------------------------------- | :------: | :------------------------------------------------------- |
| `pool`    | [`PreparedPool`](../interfaces/PreparedPool.md) or [`Pool`](../interfaces/Pool.md) |   Yes    | Prepared pool or API pool containing at least one order. |

### pool fields

**[`PreparedPool`](../interfaces/PreparedPool.md)**

| Parameter   | Type                                                           | Required | Description |
| :---------- | :------------------------------------------------------------- | :------: | :---------- |
| `chainId`   | `number`                                                       |   Yes    |             |
| `orders`    | readonly [`PoolOrder`](../interfaces/PoolOrder.md)[]           |   Yes    |             |
| `type`      | [`PoolType`](../type-aliases/PoolType.md)                      |   Yes    |             |
| `typedData` | readonly [`OrderTypedData`](../interfaces/OrderTypedData.md)[] |   Yes    |             |

**[`Pool`](../interfaces/Pool.md)**

| Parameter             | Type                                            | Required | Description                                                                        |
| :-------------------- | :---------------------------------------------- | :------: | :--------------------------------------------------------------------------------- |
| `assets`              | [`PoolAsset`](../interfaces/PoolAsset.md)[]     |   Yes    | Pool assets have no positional tokenA/tokenB meaning. Match them by token address. |
| `chainId`             | `number`                                        |   Yes    |                                                                                    |
| `expiresAt`           | `string`                                        |   Yes    |                                                                                    |
| `maker`               | `` `0x${string}` ``                             |   Yes    |                                                                                    |
| `orders`              | [`SignedOrder`](../interfaces/SignedOrder.md)[] |   Yes    |                                                                                    |
| `poolId`              | `` `0x${string}` ``                             |   Yes    |                                                                                    |
| `providerFee`         | `number`                                        |   Yes    | Fee set by the maker providing liquidity, in 1/100,000 units.                      |
| `providerFeeReceiver` | `` `0x${string}` ``                             |   Yes    | Address that receives the liquidity provider fee.                                  |
| `type`                | [`PoolType`](../type-aliases/PoolType.md)       |   Yes    |                                                                                    |

## Returns

`Promise`\<[`OnchainPoolStatus`](../type-aliases/OnchainPoolStatus.md)\>

The pool's `NEW`, `INITIALIZED`, or `INVALIDATED` status.

## Throws

If the pool uses another chain, no RPC URL is configured, the
pool has no orders, the contract returns an unknown status, or an RPC read fails.
