import { useState, useCallback } from 'react';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;  // milliseconds
  maxDelay: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
};

export function useNetworkRetry(config: RetryConfig = DEFAULT_CONFIG) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const executeWithRetry = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      onError?: (error: Error, attempt: number) => void
    ): Promise<T> => {
      let lastError: Error;

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          setRetryCount(attempt);
          const result = await fn();
          setRetryCount(0);
          setIsRetrying(false);
          return result;
        } catch (error) {
          lastError = error as Error;

          if (attempt === config.maxRetries) {
            break;
          }

          if (onError) {
            onError(lastError, attempt + 1);
          }

          const delay = Math.min(
            config.baseDelay * Math.pow(2, attempt),
            config.maxDelay
          );

          setIsRetrying(true);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      setIsRetrying(false);
      throw lastError!;
    },
    [config]
  );

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    executeWithRetry,
    retryCount,
    isRetrying,
    reset,
  };
}
