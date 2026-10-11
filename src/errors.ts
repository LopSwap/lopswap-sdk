/** Error returned by the LopSwap HTTP API. */
export class LopSwapHttpError extends Error {
  override readonly name = 'LopSwapHttpError'

  constructor(
    readonly status: number,
    readonly body: unknown,
    readonly endpoint: string,
    details: string,
  ) {
    super(`LopSwap API request failed (${status}): ${details}`)
  }
}
