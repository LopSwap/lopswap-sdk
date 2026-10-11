[@lopswap/sdk](../SDK.md) / [LopSwap](../SDK.md) / getPoolTypes

# Method: getPoolTypes()

<kbd>HTTP</kbd>

```ts
getPoolTypes(): Promise<PoolTypeInfo[]>;
```

Lists pool types and their active pool counts through the LopSwap API.

## Returns

`Promise`\<[`PoolTypeInfo`](../interfaces/PoolTypeInfo.md)[]\>

Pool types supported for the SDK chain.

Each item:

| Field       | Type                                      | Required |
| :---------- | :---------------------------------------- | :------: |
| `poolCount` | `number`                                  |   Yes    |
| `type`      | [`PoolType`](../type-aliases/PoolType.md) |   Yes    |

## Throws

If the API request fails.
