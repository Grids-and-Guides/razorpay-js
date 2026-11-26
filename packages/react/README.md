# @razorpay-js/react

Type-safe React hook for [Razorpay Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
Works with Next.js (App Router and Pages), React Router / Remix, TanStack Router/Start and Vite.

> Community-maintained. Not affiliated with or endorsed by Razorpay.
> Coming from `razorpay-hook`? See the [migration guide](https://github.com/Grids-and-Guides/razorpay-js/blob/main/MIGRATION.md).

```bash
npm install @razorpay-js/react
```

## Usage

```tsx
'use client';
import { useRazorpay, CheckoutDismissedError, PaymentFailedError } from '@razorpay-js/react';

export function PayButton({ amount }: { amount: number }) {
  const { isReady, openCheckout } = useRazorpay();

  async function pay() {
    const order = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }).then((r) => r.json());

    try {
      const payment = await openCheckout({ key: KEY_ID, order_id: order.id, name: 'Acme Inc.' });
      await fetch('/api/verify', { method: 'POST', body: JSON.stringify(payment) });
    } catch (error) {
      if (error instanceof CheckoutDismissedError) return;
      if (error instanceof PaymentFailedError) showToast(error.message);
    }
  }

  return (
    <button onClick={pay} disabled={!isReady}>
      Pay
    </button>
  );
}
```

## `useRazorpay(options?)`

| Option                      | Default |                                                                                                       |
| --------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `loadOnMount`               | `true`  | Load `checkout.js` on mount. If `false`, it loads on the first `openCheckout()` / `load()` call       |
| `src`, `timeoutMs`, `nonce` |         | Passed to `loadRazorpay` (see [`@razorpay-js/core`](https://www.npmjs.com/package/@razorpay-js/core)) |

Returns:

| Field                   |                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`                | `'idle' \| 'loading' \| 'ready' \| 'error'`                                                                                                                    |
| `isReady`               | `status === 'ready'`                                                                                                                                           |
| `error`                 | `RazorpayLoadError \| null`                                                                                                                                    |
| `load()`                | Load now, or retry after an error                                                                                                                              |
| `openCheckout(options)` | Promise-based checkout (see [`openCheckout`](https://www.npmjs.com/package/@razorpay-js/core#opencheckoutoptions-loadoptions--promiserazorpaysuccessresponse)) |

Everything from `@razorpay-js/core` (types, errors, `openCheckout`, `loadRazorpay`) is re-exported,
so this is the only package you need.

## License

MIT
