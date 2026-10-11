[@lopswap/sdk](../SDK.md) / LopSwapValidationError

# Class: LopSwapValidationError

Error raised when a prepared or signed pool fails local validation.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new LopSwapValidationError(message?: string): LopSwapValidationError;
```

#### Parameters

| Parameter | Type     | Required | Description |
| :-------- | :------- | :------: | :---------- |
| `message` | `string` |    No    |             |

#### Returns

`LopSwapValidationError`

#### Inherited from

```ts
Error.constructor
```

### Constructor

```ts
new LopSwapValidationError(message?: string, options?: ErrorOptions): LopSwapValidationError;
```

#### Parameters

| Parameter | Type           | Required | Description |
| :-------- | :------------- | :------: | :---------- |
| `message` | `string`       |    No    |             |
| `options` | `ErrorOptions` |    No    |             |

#### Returns

`LopSwapValidationError`

#### Inherited from

```ts
Error.constructor
```

## Properties

### name

```ts
readonly name: "LopSwapValidationError" = 'LopSwapValidationError';
```

#### Overrides

```ts
Error.name
```
