import {
  type RazorpayCheckoutOptions,
  type RazorpayEvent,
  type RazorpayEventCallbackMap,
  type RazorpayInstance,
  RazorpayLoadError,
  getRazorpay,
} from '@razorpay-js/core';

/**
 * Class wrapper kept for apps migrating from `razorpay-hook`.
 *
 * Unlike the old class, it never validates or logs: it throws `RazorpayLoadError`
 * if `checkout.js` hasn't loaded yet, and it accepts subscription checkouts.
 *
 * @deprecated Use `openCheckout()` from `useRazorpay()` instead. See MIGRATION.md.
 */
export class Razorpay {
  private readonly instance: RazorpayInstance;

  constructor(options: RazorpayCheckoutOptions) {
    const RazorpayCheckout = getRazorpay();
    if (!RazorpayCheckout) {
      throw new RazorpayLoadError(
        'Razorpay Checkout is not loaded yet. Wait for useRazorpay().isReady before creating a checkout.',
      );
    }
    this.instance = new RazorpayCheckout(options);
  }

  on<K extends RazorpayEvent>(event: K, callback: RazorpayEventCallbackMap[K]): void {
    this.instance.on(event, callback);
  }

  get(): RazorpayCheckoutOptions {
    return this.instance.get();
  }

  open(): void {
    this.instance.open();
  }

  close(): void {
    this.instance.close();
  }

  getMode(): string {
    return this.instance.getMode();
  }
}
