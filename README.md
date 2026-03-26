# Kanishka Creations

Astro storefront for a curated catalog backed by Convex, with an enquiry-only checkout flow and admin CRUD for products and categories.

## Current stack

- `Astro` for the storefront and server routes
- `Convex` for customers, addresses, orders, order items, catalog content, and admin state
- `Netlify` adapter for deployment

## Current behavior

- Catalog pages are rendered from Convex queries
- Customers add items to a cart stored in browser local storage under `kc_cart_v1`
- Checkout is enquiry-only:
  - name + shipping address collected on-site
  - no phone/email collected on-site
  - order is persisted in Convex
  - success page generates ready-to-send WhatsApp and email actions
- Admin dashboards are available under `/admin`, `/admin/products`, `/admin/categories`, and `/admin/orders`

## Environment variables

- `PUBLIC_CHECKOUT_MODE=enquiry`
- `PUBLIC_WHATSAPP_NUMBER`
- `PUBLIC_SALES_EMAIL`
- `CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `ADMIN_DASHBOARD_SECRET`

## Local development

```bash
pnpm install
pnpm convex:dev
pnpm dev
```

Run `pnpm build` to validate the Astro app.

## Future work

Razorpay is intentionally deferred. The intended future payment flow is:

- create a Razorpay order server-side from the validated cart
- launch Razorpay checkout from the frontend
- verify Razorpay webhooks server-side
- sync payment and refund status back into Convex

Until then, the site remains enquiry-only.
