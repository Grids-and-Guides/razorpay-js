import { vi } from 'vitest';
import type {
  RazorpayCheckoutOptions,
  RazorpayFailedResponse,
  RazorpayInstance,
  RazorpaySuccessResponse,
} from '../src/types';

/** A controllable fake of `window.Razorpay` for tests. */
export function createFakeRazorpay() {
  const instances: FakeCheckout[] = [];

  class FakeCheckout implements RazorpayInstance {
    failedListeners: Array<(r: RazorpayFailedResponse) => void> = [];
    open = vi.fn();
    close = vi.fn();
    getMode = vi.fn(() => 'test');

    constructor(public options: RazorpayCheckoutOptions) {
      instances.push(this);
    }

    get() {
      return this.options;
    }

    on(_event: 'payment.failed', cb: (r: RazorpayFailedResponse) => void) {
      this.failedListeners.push(cb);
    }

    // Test drivers that simulate what checkout.js does.
    succeed(response: RazorpaySuccessResponse = successResponse) {
      this.options.handler?.(response);
    }
    fail(response: RazorpayFailedResponse = failedResponse) {
      this.failedListeners.forEach((cb) => cb(response));
    }
    dismiss() {
      this.options.modal?.ondismiss?.();
    }
  }

  return { Razorpay: FakeCheckout, instances };
}

export const successResponse: RazorpaySuccessResponse = {
  razorpay_payment_id: 'pay_123',
  razorpay_order_id: 'order_123',
  razorpay_signature: 'sig',
};

export const failedResponse: RazorpayFailedResponse = {
  error: {
    code: 'BAD_REQUEST_ERROR',
    description: 'Card declined',
    source: 'customer',
    field: '',
    step: 'payment_authorization',
    reason: 'payment_failed',
    metadata: { order_id: 'order_123', payment_id: 'pay_123' },
  },
};
