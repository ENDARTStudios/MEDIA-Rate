import { useState, useCallback } from "react";
import { ApiError, RateLimitedError } from "@/lib/http";

export interface AsyncState<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  rateLimited: number | null;
}

export function useAsyncState<T = unknown>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    isLoading: false,
    error: null,
    rateLimited: null,
  });

  const run = useCallback(async (promise: Promise<T>) => {
    setState({ data: undefined, isLoading: true, error: null, rateLimited: null });
    try {
      const data = await promise;
      setState({ data, isLoading: false, error: null, rateLimited: null });
      return data;
    } catch (e: unknown) {
      if (e instanceof RateLimitedError) {
        setState({ data: undefined, isLoading: false, error: null, rateLimited: e.retryAfterSeconds });
      } else {
        setState({ data: undefined, isLoading: false, error: e as Error, rateLimited: null });
      }
      throw e;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: undefined, isLoading: false, error: null, rateLimited: null });
  }, []);

  return { ...state, run, reset };
}
