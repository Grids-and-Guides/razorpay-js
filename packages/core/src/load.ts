import { RazorpayLoadError } from './errors';
import type { RazorpayConstructor } from './types';

export const DEFAULT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const DEFAULT_TIMEOUT_MS = 15_000;

export interface LoadRazorpayOptions {
  /** Script URL. Defaults to Razorpay's hosted `checkout.js`. */
  src?: string;
  /** Reject if the script hasn't loaded after this many milliseconds. Default: 15000. */
  timeoutMs?: number;
  /** CSP nonce applied to the injected `<script>` tag. */
  nonce?: string;
}

let pending: Promise<RazorpayConstructor> | null = null;

/** `true` when running in a browser (not during SSR). */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/** Returns `window.Razorpay` if `checkout.js` has already loaded, otherwise `undefined`. */
export function getRazorpay(): RazorpayConstructor | undefined {
  return isBrowser() ? window.Razorpay : undefined;
}

/**
 * Loads Razorpay `checkout.js` once and resolves with the `Razorpay` constructor.
 *
 * Safe to call many times: concurrent and repeated calls share one `<script>` tag.
 * If loading fails, the next call retries. Rejects with {@link RazorpayLoadError}
 * on the server, on network/CSP errors, and on timeout.
 */
export function loadRazorpay(options: LoadRazorpayOptions = {}): Promise<RazorpayConstructor> {
  if (!isBrowser()) {
    return Promise.reject(
      new RazorpayLoadError('Razorpay Checkout can only be loaded in a browser'),
    );
  }

  const loaded = getRazorpay();
  if (loaded) return Promise.resolve(loaded);
  if (pending) return pending;

  const { src = DEFAULT_SCRIPT_SRC, timeoutMs = DEFAULT_TIMEOUT_MS, nonce } = options;

  pending = new Promise<RazorpayConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement('script');

    const cleanup = () => {
      clearTimeout(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };

    const fail = (message: string) => {
      cleanup();
      // Remove our tag so the next attempt starts fresh.
      if (!existing) script.remove();
      pending = null;
      reject(new RazorpayLoadError(message));
    };

    const onLoad = () => {
      const Razorpay = getRazorpay();
      if (!Razorpay) {
        fail('checkout.js loaded but window.Razorpay is not defined');
        return;
      }
      cleanup();
      // From now on, getRazorpay() answers directly.
      pending = null;
      resolve(Razorpay);
    };

    const onError = () => fail(`Failed to load ${src}. Check the network connection and CSP.`);

    const timer = setTimeout(
      () => fail(`Timed out after ${timeoutMs}ms loading ${src}`),
      timeoutMs,
    );

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);

    if (!existing) {
      script.src = src;
      script.async = true;
      if (nonce) script.nonce = nonce;
      document.head.appendChild(script);
    }
  });

  return pending;
}
