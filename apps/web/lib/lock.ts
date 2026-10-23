const tails = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  tails.set(key, previous.then(() => current));
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}
