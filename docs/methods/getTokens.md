[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getTokens

# Method: getTokens()

<kbd>HTTP</kbd>

```ts
getTokens(params?: GetTokensParams): Promise<TokenListResult>;
```

Lists known token metadata for the SDK chain through the LopSwap API.

## Parameters

| Parameter | Type                                                  | Required | Description                     |
| :-------- | :---------------------------------------------------- | :------: | :------------------------------ |
| `params`  | [`GetTokensParams`](../interfaces/GetTokensParams.md) |    No    | Optional offset and page limit. |

### params fields

| Parameter | Type     | Required | Description |
| :-------- | :------- | :------: | :---------- |
| `limit`   | `number` |    No    |             |
| `offset`  | `number` |    No    |             |

## Returns

`Promise`\<[`TokenListResult`](../interfaces/TokenListResult.md)\>

A paginated token list.

| Field         | Type                                | Required |
| :------------ | :---------------------------------- | :------: |
| `hasNextPage` | `boolean`                           |   Yes    |
| `limit`       | `number`                            |   Yes    |
| `offset`      | `number`                            |   Yes    |
| `tokens`      | [`Token`](../interfaces/Token.md)[] |   Yes    |
| `total`       | `number`                            |   Yes    |

## Throws

If pagination is invalid or the API request fails.
