[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getPoolAndOrdersStatus

# Method: getPoolAndOrdersStatus()

<kbd>RPC read</kbd>

```ts
getPoolAndOrdersStatus(pool: PreparedPool | Pool): Promise<PoolAndOrdersStatus>;
```

Reads the pool status and every order's status in the 1inch protocol.

An order is `NEW` before its first fill, `ACTIVE` after a partial fill,
and `CANCELED` when its raw remaining invalidator is `uint256.max`. For
LopSwap orders, the SDK interprets this value as cancellation.

## Parameters

| Parameter | Type                                                                               | Required | Description                                                  |
| :-------- | :--------------------------------------------------------------------------------- | :------: | :----------------------------------------------------------- |
| `pool`    | [`PreparedPool`](../interfaces/PreparedPool.md) or [`Pool`](../interfaces/Pool.md) |   Yes    | Prepared pool or API pool containing its complete order set. |

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

`Promise`\<[`PoolAndOrdersStatus`](../interfaces/PoolAndOrdersStatus.md)\>

The LOPSwap pool status and one 1inch status per supplied order.

| Field        | Type                                                                    | Required |
| :----------- | :---------------------------------------------------------------------- | :------: |
| `orders`     | [`LimitOrderStatusDetails`](../interfaces/LimitOrderStatusDetails.md)[] |   Yes    |
| `poolStatus` | [`OnchainPoolStatus`](../type-aliases/OnchainPoolStatus.md)             |   Yes    |

## Throws

If the pool uses another chain, no RPC URL is configured, the
pool has no orders, the contract returns an unknown status, or an RPC read fails.
