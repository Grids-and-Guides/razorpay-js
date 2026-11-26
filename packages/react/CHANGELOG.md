# @razorpay-js/react

## 1.0.0-next.0

### Major Changes

- [#7](https://github.com/Grids-and-Guides/razorpay-js/pull/7) [`c67a65d`](https://github.com/Grids-and-Guides/razorpay-js/commit/c67a65db81a945e9e1e6970d1feb61554ffa1b3b) Thanks [@naveenkarmegam](https://github.com/naveenkarmegam)! - First release of the `@razorpay-js` packages, replacing `razorpay-hook`.
  
  - `@razorpay-js/core`: framework-agnostic `loadRazorpay()` (single shared script, timeout, CSP nonce, retry after failure, SSR-safe), promise-based `openCheckout()`, `createCheckout()`, typed errors, and complete Checkout types.
  - `@razorpay-js/react`: `useRazorpay()` returns `{ status, isReady, error, load, openCheckout }`. It no longer calls `alert()`, never injects duplicate scripts, supports subscription checkouts, and ships with a `"use client"` directive.
  
  See MIGRATION.md for upgrading from `razorpay-hook`.

### Patch Changes

- Updated dependencies [[`c67a65d`](https://github.com/Grids-and-Guides/razorpay-js/commit/c67a65db81a945e9e1e6970d1feb61554ffa1b3b)]:
  - @razorpay-js/core@1.0.0-next.0
