import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSessionTimeoutOptions {
  timeoutSeconds: number;
  onTimeout: () => void;
  onWarning?: (secondsRemaining: number) => void;
  warningThreshold?: number; // Seconds before timeout to show warning
}

export function useSessionTimeout({
  timeoutSeconds,
  onTimeout,
  onWarning,
  warningThreshold = 10,
}: UseSessionTimeoutOptions) {
  const [secondsRemaining, setSecondsRemaining] = useState(timeoutSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  const start = useCallback(() => {
    setIsActive(true);
    setSecondsRemaining(timeoutSeconds);
    warningShownRef.current = false;
  }, [timeoutSeconds]);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = useCallback(() => {
    setSecondsRemaining(timeoutSeconds);
    warningShownRef.current = false;
  }, [timeoutSeconds]);

  const stop = useCallback(() => {
    setIsActive(false);
    setSecondsRemaining(timeoutSeconds);
    warningShownRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [timeoutSeconds]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        const newValue = prev - 1;

        if (newValue <= warningThreshold && !warningShownRef.current && onWarning) {
          warningShownRef.current = true;
          onWarning(newValue);
        }

        if (newValue <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsActive(false);
          onTimeout();
          return 0;
        }

        return newValue;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, onTimeout, onWarning, warningThreshold]);

  return {
    secondsRemaining,
    isActive,
    start,
    pause,
    reset,
    stop,
  };
}
