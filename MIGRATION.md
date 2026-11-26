# Migrating from `razorpay-hook` to `@razorpay-js/react`

`razorpay-hook` is deprecated. `@razorpay-js/react` is the same project, rebuilt.

## 1. Swap the package

```bash
npm uninstall razorpay-hook
npm install @razorpay-js/react
```

You can also drop `next` from your dependencies if you only installed it for `razorpay-hook`:
the new package needs only `react >= 18`.

## 2. Update the code

**Before** (`razorpay-hook`):

```tsx
import { useRazorpay, RazorpayCheckoutOptions } from 'razorpay-hook';

const Razorpay = useRazorpay();

const handlePayment = async () => {
  const data = await createOrder();
  const rz = new Razorpay({
    key: KEY_ID,
    order_id: data.orderId,
    handler: (response) => verify(response),
  } satisfies RazorpayCheckoutOptions);
  rz.on('payment.failed', (response) => console.log(response.error));
  rz.open();
};
```

**After** (`@razorpay-js/react`):

```tsx
import { useRazorpay, PaymentFailedError } from '@razorpay-js/react';

const { isReady, openCheckout } = useRazorpay();

const handlePayment = async () => {
  const data = await createOrder();
  try {
    const response = await openCheckout({ key: KEY_ID, order_id: data.orderId });
    await verify(response);
  } catch (error) {
    if (error instanceof PaymentFailedError) console.log(error.details);
  }
};

// <button disabled={!isReady} onClick={handlePayment}>Pay</button>
```

## What changed

| `razorpay-hook`                                                                           | `@razorpay-js/react`                                                         |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `useRazorpay()` returns the `Razorpay` class                                              | Returns `{ status, isReady, error, load, openCheckout }`                     |
| `alert()` when the script fails to load                                                   | `status === 'error'` and a typed `error`; no UI from the library             |
| Clicking pay before the script loaded crashed with `window.Razorpay is not a constructor` | `openCheckout()` waits for the script; `isReady` lets you disable the button |
| Two components could inject two `<script>` tags                                           | One shared script                                                            |
| Rejected subscription checkouts (required `order_id`)                                     | `order_id` or `subscription_id`                                              |
| `retry.max_count` typed as `boolean`                                                      | `number`                                                                     |
| `RazorpaySuccessResponse.razorpay_order_id` always present                                | Optional; `razorpay_subscription_id` added for subscriptions                 |
| Logged to the console                                                                     | Silent                                                                       |
| Peer dependencies: `next`, `react`, `react-dom`                                           | `react` only                                                                 |

## Not ready to switch to `openCheckout`?

The `Razorpay` class is still exported (deprecated), so callback-style code keeps working. Create it
only after `isReady` is `true`, otherwise it throws a `RazorpayLoadError`:

```tsx
import { useRazorpay, Razorpay } from '@razorpay-js/react';

const { isReady } = useRazorpay();
// ...
const rz = new Razorpay(options);
rz.on('payment.failed', onFailed);
rz.open();
```
