import { CheckoutDismissedError, PaymentFailedError } from './errors';
import { loadRazorpay, type LoadRazorpayOptions } from './load';
import type {
  RazorpayCheckoutOptions,
  RazorpayFailedResponse,
  RazorpayInstance,
  RazorpaySuccessResponse,
} from './types';

export interface OpenCheckoutOptions extends RazorpayCheckoutOptions {
  /**
   * Called on every failed attempt. Checkout stays open so the customer can retry,
   * so the promise does not reject until the customer closes Checkout.
   */
  onPaymentFailed?: (response: RazorpayFailedResponse) => void;
}

/**
 * Loads `checkout.js` if needed and returns a new Checkout instance without opening it.
 * Use this when you need full control over events. Most apps should use {@link openCheckout}.
 */
export async function createCheckout(
  options: RazorpayCheckoutOptions,
  loadOptions?: LoadRazorpayOptions,
): Promise<RazorpayInstance> {
  const Razorpay = await loadRazorpay(loadOptions);
  return new Razorpay(options);
}

/**
 * Opens Razorpay Checkout and waits for the outcome.
 *
 * - Resolves with the payment response on success. **Verify the signature on your server.**
 * - Rejects with {@link PaymentFailedError} if the customer closes Checkout after a failed attempt.
 * - Rejects with {@link CheckoutDismissedError} if the customer closes Checkout without paying.
 * - Rejects with `RazorpayLoadError` if `checkout.js` can't be loaded.
 *
 * Your own `handler`, `modal.ondismiss` and `onPaymentFailed` callbacks still run.
 * With `redirect: true` + `callback_url`, Razorpay navigates away and the promise never settles.
 */
export async function openCheckout(
  options: OpenCheckoutOptions,
  loadOptions?: LoadRazorpayOptions,
): Promise<RazorpaySuccessResponse> {
  const Razorpay = await loadRazorpay(loadOptions);
  const { onPaymentFailed, ...checkoutOptions } = options;

  return new Promise<RazorpaySuccessResponse>((resolve, reject) => {
    let settled = false;
    let lastFailure: RazorpayFailedResponse | undefined;

    const instance = new Razorpay({
      ...checkoutOptions,
      handler: (response) => {
        checkoutOptions.handler?.(response);
        if (settled) return;
        settled = true;
        resolve(response);
      },
      modal: {
        ...checkoutOptions.modal,
        ondismiss: () => {
          checkoutOptions.modal?.ondismiss?.();
          if (settled) return;
          settled = true;
          reject(lastFailure ? new PaymentFailedError(lastFailure) : new CheckoutDismissedError());
        },
      },
    });

    instance.on('payment.failed', (response) => {
      lastFailure = response;
      onPaymentFailed?.(response);
    });

    instance.open();
  });
}
