export interface TimeoutSettings {
  minutes: number;
  seconds: number;
  millis: number;
}

export interface Config {
  preAttempt: () => void | Promise<void>;
  attemptLogic: <T>() => T | Promise<T>;
  postAttempt: () => void | Promise<void>;
  totalNumberOfAttempts: number;
  attemptTimeout: null | TimeoutSettings;
}

export interface CleanupLogic {
  abort: () => void;
}
