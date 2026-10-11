[@lopswap/sdk](../SDK.md) / PoolAsset

# Interface: PoolAsset

## Properties

| Property                                                  | Type                | Description                                                   |
| --------------------------------------------------------- | ------------------- | ------------------------------------------------------------- |
| <a id="property-availablebalance"></a> `availableBalance` | `bigint` \| `null`  | Backend-cached available balance, or null when unavailable.   |
| <a id="property-balance"></a> `balance`                   | `bigint` \| `null`  | Backend-cached token balance, or null when unavailable.       |
| <a id="property-token"></a> `token`                       | `` `0x${string}` `` | Token contract address. Use this field to identify the asset. |
