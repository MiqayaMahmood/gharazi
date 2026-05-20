export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: {
    age: 86400,
    count: 1000,
  },
  removeOnFail: {
    age: 604800,
    count: 5000,
  },
} as const;
