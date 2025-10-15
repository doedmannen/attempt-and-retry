import type { CleanupLogic, Config, TimeoutSettings } from "./types";

export async function attemptWithRetry<T>({
  attemptLogic,
  attemptTimeout,
  postAttempt,
  preAttempt,
  totalNumberOfAttempts,
}: Config): Promise<T> {
  const errors: unknown[] = [];
  const hasAttemptTimeLimitations = !!attemptTimeout;

  do {
    if (typeof preAttempt === "function") {
      preAttempt();
    }

    const cleanups: CleanupLogic[] = [];
    function registerCleanup(cleanup: CleanupLogic): void {
      cleanups.push(cleanup);
    }

    try {
      if (hasAttemptTimeLimitations) {
        return await Promise.race([
          attemptLogic<T>(),
          rejectAfterTimeout<T>({
            timeoutSettings: attemptTimeout,
            rejectionObject: new Error(),
            registerCleanup,
          }),
        ]);
      } else {
        return attemptLogic();
      }
    } catch (error) {
      errors.push(error);
    } finally {
      for (const cleanup of cleanups) {
        cleanup.abort();
      }
    }

    if (typeof postAttempt === "function") {
      postAttempt();
    }
  } while (--totalNumberOfAttempts > 0);

  throw errors.pop();
}

function rejectAfterTimeout<T>({
  rejectionObject,
  timeoutSettings,
  registerCleanup,
}: {
  rejectionObject: unknown;
  timeoutSettings: TimeoutSettings;
  registerCleanup: (cleanup: CleanupLogic) => void;
}): Promise<T> {
  return new Promise((_resolve, reject) => {
    const timeout = setTimeout(
      () => reject(rejectionObject),
      convertToMillis(timeoutSettings),
    );

    registerCleanup({
      abort: () => {
        clearTimeout(timeout);
      },
    });
  });
}

type Millis = number;

function convertToMillis({
  millis,
  seconds,
  minutes,
}: TimeoutSettings): Millis {
  let output = millis;
  output += seconds * 1000;
  output += minutes * 60 * 1000;

  return output;
}
