[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getChains

# Method: getChains()

<kbd>HTTP</kbd>

```ts
getChains(): Promise<ChainInfo[]>;
```

Lists chains supported by the LopSwap API.

## Returns

`Promise`\<[`ChainInfo`](../interfaces/ChainInfo.md)[]\>

Supported chain IDs and names.

Each item:

| Field     | Type     | Required |
| :-------- | :------- | :------: |
| `chainId` | `number` |   Yes    |
| `name`    | `string` |   Yes    |

## Throws

If the API request fails.
