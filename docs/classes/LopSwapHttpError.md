[@lopswap/sdk](../SDK.md) / LopSwapHttpError

# Class: LopSwapHttpError

Error returned by the LopSwap HTTP API.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new LopSwapHttpError(
   status: number,
   body: unknown,
   endpoint: string,
   details: string
): LopSwapHttpError;
```

#### Parameters

| Parameter  | Type      | Required | Description |
| :--------- | :-------- | :------: | :---------- |
| `status`   | `number`  |   Yes    |             |
| `body`     | `unknown` |   Yes    |             |
| `endpoint` | `string`  |   Yes    |             |
| `details`  | `string`  |   Yes    |             |

#### Returns

`LopSwapHttpError`

#### Overrides

```ts
Error.constructor
```

## Properties

### body

```ts
readonly body: unknown;
```

---

### endpoint

```ts
readonly endpoint: string;
```

---

### name

```ts
readonly name: "LopSwapHttpError" = 'LopSwapHttpError';
```

#### Overrides

```ts
Error.name
```

---

### status

```ts
readonly status: number;
```
