[@lopswap/sdk](../SDK.md) / GetPoolsParams

# Interface: GetPoolsParams

## Properties

| Property                                                           | Type                                                                                         | Description                                                                |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| <a id="property-cursor"></a> `cursor?`                             | `string`                                                                                     | -                                                                          |
| <a id="property-limit"></a> `limit?`                               | `number`                                                                                     | -                                                                          |
| <a id="property-maker"></a> `maker?`                               | `` `0x${string}` ``                                                                          | -                                                                          |
| <a id="property-minavailablebalances"></a> `minAvailableBalances?` | [`BalanceFilters`](BalanceFilters.md)                                                        | Minimum cached available balances in token base units. Requires tokens.    |
| <a id="property-minbalances"></a> `minBalances?`                   | [`BalanceFilters`](BalanceFilters.md)                                                        | Minimum cached balances in token base units. Requires tokens.              |
| <a id="property-tokens"></a> `tokens?`                             | \| readonly \[`` `0x${string}` ``\] \| readonly \[`` `0x${string}` ``, `` `0x${string}` ``\] | One or two token addresses. Filter labels A and B follow this array order. |
| <a id="property-type"></a> `type`                                  | [`PoolType`](../type-aliases/PoolType.md)                                                    | -                                                                          |
