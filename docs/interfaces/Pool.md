[@lopswap/sdk](../SDK.md) / Pool

# Interface: Pool

## Extended by

- [`PoolDetails`](PoolDetails.md)

## Properties

| Property                                                        | Type                                      | Description                                                                        |
| --------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| <a id="property-assets"></a> `assets`                           | [`PoolAsset`](PoolAsset.md)[]             | Pool assets have no positional tokenA/tokenB meaning. Match them by token address. |
| <a id="property-chainid"></a> `chainId`                         | `number`                                  | -                                                                                  |
| <a id="property-expiresat"></a> `expiresAt`                     | `string`                                  | -                                                                                  |
| <a id="property-maker"></a> `maker`                             | `` `0x${string}` ``                       | -                                                                                  |
| <a id="property-orders"></a> `orders`                           | [`SignedOrder`](SignedOrder.md)[]         | -                                                                                  |
| <a id="property-poolid"></a> `poolId`                           | `` `0x${string}` ``                       | -                                                                                  |
| <a id="property-providerfee"></a> `providerFee`                 | `number`                                  | Fee set by the maker providing liquidity, in 1/100,000 units.                      |
| <a id="property-providerfeereceiver"></a> `providerFeeReceiver` | `` `0x${string}` ``                       | Address that receives the liquidity provider fee.                                  |
| <a id="property-type"></a> `type`                               | [`PoolType`](../type-aliases/PoolType.md) | -                                                                                  |
