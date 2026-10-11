[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getToken

# Method: getToken()

<kbd>HTTP</kbd>

```ts
getToken(address: `0x${string}`): Promise<Token>;
```

Gets known token metadata through the LopSwap API.

## Parameters

| Parameter | Type                | Required | Description                              |
| :-------- | :------------------ | :------: | :--------------------------------------- |
| `address` | `` `0x${string}` `` |   Yes    | Token contract address on the SDK chain. |

## Returns

`Promise`\<[`Token`](../interfaces/Token.md)\>

Token address, symbol, name, decimals, and logo URL.

| Field      | Type                | Required |
| :--------- | :------------------ | :------: |
| `address`  | `` `0x${string}` `` |   Yes    |
| `chainId`  | `number`            |   Yes    |
| `decimals` | `number`            |   Yes    |
| `logo`     | `string`            |   Yes    |
| `name`     | `string`            |   Yes    |
| `symbol`   | `string`            |   Yes    |

## Throws

If the address is invalid or the API request fails.
