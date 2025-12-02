/**
 * Run a set of tasks concurrently
 * @param items - The items to process
 * @param concurrency - The number of concurrent tasks
 * @param task - The task to run
 * @returns A promise that resolves when all tasks are complete
 */
export async function runConcurrent<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item) {
            await task(item);
          }
        }
      })()
    );
  }
  await Promise.all(workers);
}
