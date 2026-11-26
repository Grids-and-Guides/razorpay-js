# Security Policy

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through
[GitHub Security Advisories](https://github.com/Grids-and-Guides/razorpay-js/security/advisories/new).
We aim to acknowledge reports within 3 working days and to ship a fix or mitigation within 30 days.

Problems with Razorpay's own services or `checkout.js` should go to
[Razorpay](https://razorpay.com/support/), not this project.

## Supported versions

| Package                       | Supported                                                                |
| ----------------------------- | ------------------------------------------------------------------------ |
| `@razorpay-js/*` latest major | ✅                                                                       |
| `razorpay-hook` 1.x           | Security fixes only, for 6 months after `@razorpay-js/react@1.0.0` ships |

## Using these packages safely

- Your **key secret** (`RAZORPAY_KEY_SECRET`) must only ever live on your server. The browser only needs the key ID.
- Always create orders on your server, and **verify `razorpay_signature` on your server** before fulfilling an order. A successful `openCheckout()` in the browser is not proof of payment.
- Releases are published from GitHub Actions with npm provenance. Check for the provenance badge on npm.
