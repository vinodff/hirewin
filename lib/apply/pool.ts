/**
 * Run async work over items with at most `limit` in flight.
 *
 * One tab per job in a shared, logged-in browser context. Unbounded
 * Promise.all would open every tab at once — heavy on the PC and exactly the
 * burst pattern that trips Naukri's reCAPTCHA (HTTP 406). A small fixed pool
 * keeps "all selected jobs at the same time" true in practice without that.
 *
 * Results keep input order. A task that throws does not stop the others; its
 * slot holds the error instead.
 */
export type Settled<R> = { ok: true; value: R } | { ok: false; error: unknown };

export async function runPool<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<Settled<R>[]> {
  const size = Math.max(1, Math.floor(limit));
  const results: Settled<R>[] = new Array(items.length);
  let next = 0;

  async function lane(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { ok: true, value: await worker(items[index], index) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(size, items.length) }, lane));
  return results;
}
