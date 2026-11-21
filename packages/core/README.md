# @razorpay-js/core

Framework-agnostic, type-safe helpers for [Razorpay Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).

> Community-maintained. Not affiliated with or endorsed by Razorpay.
> Using React? Install [`@razorpay-js/react`](https://www.npmjs.com/package/@razorpay-js/react) instead. It includes everything below.

```bash
npm install @razorpay-js/core
```

## Usage

```ts
import { openCheckout, CheckoutDismissedError, PaymentFailedError } from '@razorpay-js/core';

button.addEventListener('click', async () => {
  const order = await fetch('/api/orders', { method: 'POST' }).then((r) => r.json());
  try {
    const payment = await openCheckout({ key: 'rzp_test_xxx', order_id: order.id });
    await fetch('/api/verify', { method: 'POST', body: JSON.stringify(payment) }); // verify on the server
  } catch (error) {
    if (error instanceof CheckoutDismissedError) return;
    if (error instanceof PaymentFailedError) console.warn(error.details.reason);
  }
});
```

## API

### `loadRazorpay(options?) → Promise<RazorpayConstructor>`

Loads `checkout.js` once. Concurrent calls share one `<script>` tag, and a failed load is retried
on the next call. Rejects with `RazorpayLoadError` on the server, on network/CSP errors, or on timeout.

| Option      | Default                                        |                              |
| ----------- | ---------------------------------------------- | ---------------------------- |
| `src`       | `https://checkout.razorpay.com/v1/checkout.js` | Script URL                   |
| `timeoutMs` | `15000`                                        | Give up after this long      |
| `nonce`     | —                                              | CSP nonce for the script tag |

### `openCheckout(options, loadOptions?) → Promise<RazorpaySuccessResponse>`

Opens Checkout and settles when the customer finishes.

- **Resolves** with `{ razorpay_payment_id, razorpay_signature, razorpay_order_id? , razorpay_subscription_id? }`.
- **Rejects** with `PaymentFailedError` (closed after a failed attempt; see `.details`),
  `CheckoutDismissedError` (closed without paying), or `RazorpayLoadError`.

Failed attempts don't reject straight away, because Checkout lets the customer retry. Pass
`onPaymentFailed` to react to each attempt. Your `handler` and `modal.ondismiss` still run.

### `createCheckout(options, loadOptions?) → Promise<RazorpayInstance>`

Returns an unopened Checkout instance (`open`, `close`, `on`, `get`, `getMode`) for full control.

### `getRazorpay()`, `isBrowser()`

`window.Razorpay` if loaded (else `undefined`), and whether code is running in a browser.

### Errors

All errors extend `RazorpayError`: `RazorpayLoadError`, `PaymentFailedError`, `CheckoutDismissedError`.

## License

MIT
