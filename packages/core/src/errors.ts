import type { RazorpayFailedResponse } from './types';

/** Base class for every error thrown by `@razorpay-js/*`. */
export class RazorpayError extends Error {
  override name: string = 'RazorpayError';
}

/** `checkout.js` could not be loaded (network error, timeout, CSP block, or called on the server). */
export class RazorpayLoadError extends RazorpayError {
  override name: string = 'RazorpayLoadError';
}

/**
 * The customer closed Checkout after at least one failed payment attempt.
 * `details` holds the last failure Razorpay reported.
 */
export class PaymentFailedError extends RazorpayError {
  override name: string = 'PaymentFailedError';
  readonly details: RazorpayFailedResponse['error'];

  constructor(response: RazorpayFailedResponse) {
    super(response.error.description || 'Payment failed');
    this.details = response.error;
  }
}

/** The customer closed Checkout without paying and without any failed attempt. */
export class CheckoutDismissedError extends RazorpayError {
  override name: string = 'CheckoutDismissedError';

  constructor() {
    super('Checkout was closed by the customer');
  }
}
