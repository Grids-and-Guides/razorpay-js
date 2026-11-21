---
'@razorpay-js/core': major
'@razorpay-js/react': major
---

First release of the `@razorpay-js` packages, replacing `razorpay-hook`.

- `@razorpay-js/core`: framework-agnostic `loadRazorpay()` (single shared script, timeout, CSP nonce, retry after failure, SSR-safe), promise-based `openCheckout()`, `createCheckout()`, typed errors, and complete Checkout types.
- `@razorpay-js/react`: `useRazorpay()` returns `{ status, isReady, error, load, openCheckout }`. It no longer calls `alert()`, never injects duplicate scripts, supports subscription checkouts, and ships with a `"use client"` directive.

See MIGRATION.md for upgrading from `razorpay-hook`.
