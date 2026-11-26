# razorpay-js

Type-safe [Razorpay Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/) for JavaScript frameworks.

> **Community-maintained. Not affiliated with or endorsed by Razorpay.**
> Previously published as [`razorpay-hook`](https://www.npmjs.com/package/razorpay-hook). See [MIGRATION.md](./MIGRATION.md).

| Package                                  | Use it for                                           |
| ---------------------------------------- | ---------------------------------------------------- |
| [`@razorpay-js/react`](./packages/react) | React, Next.js, React Router / Remix, TanStack, Vite |
| [`@razorpay-js/core`](./packages/core)   | Any framework, or plain JavaScript                   |

Vue and Angular adapters are planned. See [PLAN.md](./PLAN.md).

## Quick start (React)

```bash
npm install @razorpay-js/react
```

```tsx
'use client';
import { useRazorpay, CheckoutDismissedError, PaymentFailedError } from '@razorpay-js/react';

export function PayButton() {
  const { isReady, openCheckout } = useRazorpay();

  async function pay() {
    // 1. Create the order on your server. Never expose your key secret.
    const order = await fetch('/api/orders', { method: 'POST' }).then((r) => r.json());

    try {
      // 2. Open Checkout and wait for the result.
      const payment = await openCheckout({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        order_id: order.id,
        name: 'Acme Inc.',
      });

      // 3. Verify the signature on your server before fulfilling the order.
      await fetch('/api/verify', { method: 'POST', body: JSON.stringify(payment) });
    } catch (error) {
      if (error instanceof CheckoutDismissedError) return; // customer closed Checkout
      if (error instanceof PaymentFailedError) alert(error.message);
    }
  }

  return (
    <button onClick={pay} disabled={!isReady}>
      Pay
    </button>
  );
}
```

## Why this package

- **One script, loaded once**, even with many components or React StrictMode
- **Promise-based**: `await openCheckout()` instead of juggling callbacks
- **Fully typed** options, responses and errors
- **SSR-safe**: works in Next.js App Router (ships with `"use client"`)
- **No surprises**: never calls `alert()` or logs to the console; errors are typed and returned to you
- One-time payments and subscriptions
- Tiny: under 2 kB gzipped

## Contributing

Contributions are welcome! Read [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

## License

[MIT](./LICENSE)
