export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  errorMessage = 'Operação excedeu o tempo limite'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const realPromise = new Promise<T>((resolve, reject) => {
    promise.then(resolve, reject);
  });

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([realPromise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  });
}
