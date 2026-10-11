[@lopswap/sdk](../SDK.md) / PoolDetails

# Interface: PoolDetails

## Extends

- [`Pool`](Pool.md)

## Properties

| Property                                                        | Type                                          | Description                                                                        | Inherited from                                                                  |
| --------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| <a id="property-assets"></a> `assets`                           | [`PoolAsset`](PoolAsset.md)[]                 | Pool assets have no positional tokenA/tokenB meaning. Match them by token address. | [`Pool`](Pool.md).[`assets`](Pool.md#property-assets)                           |
| <a id="property-chainid"></a> `chainId`                         | `number`                                      | -                                                                                  | [`Pool`](Pool.md).[`chainId`](Pool.md#property-chainid)                         |
| <a id="property-expired"></a> `expired`                         | `boolean`                                     | -                                                                                  | -                                                                               |
| <a id="property-expiresat"></a> `expiresAt`                     | `string`                                      | -                                                                                  | [`Pool`](Pool.md).[`expiresAt`](Pool.md#property-expiresat)                     |
| <a id="property-maker"></a> `maker`                             | `` `0x${string}` ``                           | -                                                                                  | [`Pool`](Pool.md).[`maker`](Pool.md#property-maker)                             |
| <a id="property-orders"></a> `orders`                           | [`SignedOrder`](SignedOrder.md)[]             | -                                                                                  | [`Pool`](Pool.md).[`orders`](Pool.md#property-orders)                           |
| <a id="property-poolid"></a> `poolId`                           | `` `0x${string}` ``                           | -                                                                                  | [`Pool`](Pool.md).[`poolId`](Pool.md#property-poolid)                           |
| <a id="property-providerfee"></a> `providerFee`                 | `number`                                      | Fee set by the maker providing liquidity, in 1/100,000 units.                      | [`Pool`](Pool.md).[`providerFee`](Pool.md#property-providerfee)                 |
| <a id="property-providerfeereceiver"></a> `providerFeeReceiver` | `` `0x${string}` ``                           | Address that receives the liquidity provider fee.                                  | [`Pool`](Pool.md).[`providerFeeReceiver`](Pool.md#property-providerfeereceiver) |
| <a id="property-status"></a> `status`                           | [`PoolStatus`](../type-aliases/PoolStatus.md) | -                                                                                  | -                                                                               |
| <a id="property-type"></a> `type`                               | [`PoolType`](../type-aliases/PoolType.md)     | -                                                                                  | [`Pool`](Pool.md).[`type`](Pool.md#property-type)                               |
