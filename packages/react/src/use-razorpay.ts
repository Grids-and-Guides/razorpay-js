import {
  type LoadRazorpayOptions,
  type OpenCheckoutOptions,
  type RazorpayConstructor,
  RazorpayLoadError,
  type RazorpaySuccessResponse,
  loadRazorpay,
  openCheckout as openCheckoutCore,
} from '@razorpay-js/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type RazorpayStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseRazorpayOptions extends LoadRazorpayOptions {
  /**
   * Start loading `checkout.js` when the component mounts. Default: `true`.
   * Set to `false` to load on demand (the first `openCheckout()` or `load()` call).
   */
  loadOnMount?: boolean;
}

export interface UseRazorpayResult {
  /** Loading state of `checkout.js`. */
  status: RazorpayStatus;
  /** `true` once `checkout.js` has loaded. Use it to enable your pay button. */
  isReady: boolean;
  /** Set when `status` is `'error'`. */
  error: RazorpayLoadError | null;
  /** Loads `checkout.js` now. Also retries after an error. */
  load: () => Promise<RazorpayConstructor>;
  /**
   * Opens Checkout and resolves with the payment response.
   * Rejects with `PaymentFailedError`, `CheckoutDismissedError` or `RazorpayLoadError`.
   */
  openCheckout: (options: OpenCheckoutOptions) => Promise<RazorpaySuccessResponse>;
}

interface State {
  status: RazorpayStatus;
  error: RazorpayLoadError | null;
}

const READY: State = { status: 'ready', error: null };

function toLoadError(error: unknown): RazorpayLoadError {
  return error instanceof RazorpayLoadError ? error : new RazorpayLoadError(String(error));
}

/**
 * Loads Razorpay Checkout and returns its status plus a promise-based `openCheckout`.
 *
 * @example
 * const { isReady, openCheckout } = useRazorpay();
 * const response = await openCheckout({ key, order_id });
 */
export function useRazorpay(options: UseRazorpayOptions = {}): UseRazorpayResult {
  const { loadOnMount = true, src, timeoutMs, nonce } = options;
  const loadOptions = useMemo<LoadRazorpayOptions>(
    () => ({ src, timeoutMs, nonce }),
    [src, timeoutMs, nonce],
  );

  // Always start as idle/loading (never 'ready') so server and client render the same markup.
  const [state, setState] = useState<State>(() => ({
    status: loadOnMount ? 'loading' : 'idle',
    error: null,
  }));

  useEffect(() => {
    if (!loadOnMount) return;
    let active = true;
    loadRazorpay(loadOptions).then(
      () => active && setState(READY),
      (error: unknown) => active && setState({ status: 'error', error: toLoadError(error) }),
    );
    return () => {
      active = false;
    };
  }, [loadOnMount, loadOptions]);

  const load = useCallback(async () => {
    setState((s) => (s.status === 'ready' ? s : { status: 'loading', error: null }));
    try {
      const Razorpay = await loadRazorpay(loadOptions);
      setState(READY);
      return Razorpay;
    } catch (error) {
      const loadError = toLoadError(error);
      setState({ status: 'error', error: loadError });
      throw loadError;
    }
  }, [loadOptions]);

  const openCheckout = useCallback(
    async (checkoutOptions: OpenCheckoutOptions) => {
      await load();
      return openCheckoutCore(checkoutOptions, loadOptions);
    },
    [load, loadOptions],
  );

  return {
    status: state.status,
    isReady: state.status === 'ready',
    error: state.error,
    load,
    openCheckout,
  };
}
