# Enquiry-Only Checkout with Convex Backend

## Summary
Implement an enquiry-first commerce flow now, and defer Razorpay entirely. The site will keep `Keystatic` as the catalog source, add `Convex` for backend/database, and replace the current local-only inquiry cart with a real enquiry checkout that creates backend records, generates WhatsApp/email-ready messages, and supports admin order management, cancellation, and refund tracking.

Razorpay is explicitly out of scope for this implementation and should only be documented as a future step in `README.md`.

---

## Final Scope

### In scope now
- Convex setup for backend and DB
- Cart model refactor
- Enquiry checkout as the only active checkout mode
- No on-site phone/email requirement
- Customer name + shipping address capture
- Backend order creation in Convex
- WhatsApp and email CTA generation from backend-created enquiry order
- Admin order list/detail screens
- Manual cancel/refund/admin status flows
- README note for future Razorpay integration

### Out of scope now
- Razorpay code paths
- Payment UI
- Payment API routes
- Webhooks
- Real checkout payment collection
- Customer login/accounts
- Shipping rate calculation
- Inventory management

---

## Product Behavior

### Checkout mode
- The app should behave as `enquiry-only`
- No mode switch UI is needed now
- Still keep architecture extensible for future paid checkout
- Set env/config defaults so enquiry mode is the active and only used mode

### Customer form fields
Required on-site:
- full name
- address line 1
- address line 2 optional
- landmark optional
- city
- state
- postal code
- country default `India`
- notes optional

Not collected on-site:
- phone
- email

### Post-checkout behavior
After submitting checkout:
- create customer + address + order + order items in Convex
- generate:
  - WhatsApp link
  - email `mailto:` link
- show order reference and enquiry summary
- allow user to send via:
  - WhatsApp
  - Email

---

## Architecture

### Catalog
- Keep catalog in Keystatic/content collections
- Astro pages continue using content collections for product/category rendering

### Backend
- Add Convex for all transactional and admin data
- Astro server endpoints call Convex server functions
- No browser-direct Convex usage

### Frontend
- Astro pages remain the storefront shell
- Cart and checkout use browser state + Astro API endpoints
- Admin pages are Astro pages backed by protected Astro API routes

---

## Public Interfaces / Types / Config

### Environment variables
Use these now:
- `PUBLIC_CHECKOUT_MODE=enquiry`
- `PUBLIC_WHATSAPP_NUMBER`
- `PUBLIC_SALES_EMAIL`
- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL` or the Convex URL expected by chosen package
- `ADMIN_DASHBOARD_SECRET`

Do not add Razorpay env vars now.

### Shared TypeScript types
Create shared types for:
- `CartItemInput`
- `LocalCart`
- `AddressInput`
- `EnquiryCustomerInput`
- `NormalizedCartItem`
- `OrderSummary`
- `OrderStatus`
- `RefundStatus`
- `FulfillmentStatus`

### Frontend routes
Implement:
- `/cart`
- `/checkout`
- `/checkout/success`
- `/admin/login`
- `/admin/orders`
- `/admin/orders/[id]`

### API routes
Implement:
- `POST /api/cart/validate`
- `POST /api/checkout/create-enquiry-order`
- `GET /api/orders/:id`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `POST /api/admin/orders/:id/status`
- `POST /api/admin/orders/:id/cancel`
- `POST /api/admin/orders/:id/refund`

No payment routes now.

---

## Convex Data Model

### `customers`
Fields:
- `customerUid`
- `fullName`
- `email` nullable
- `phone` nullable
- `source` = `checkout_enquiry`
- `createdAt`
- `updatedAt`

### `addresses`
Fields:
- `customerId`
- `line1`
- `line2`
- `landmark`
- `city`
- `state`
- `postalCode`
- `country`
- `createdAt`
- `updatedAt`

### `orders`
Fields:
- `orderNumber`
- `customerId`
- `addressId`
- `checkoutMode` = `enquiry`
- `orderStatus`
- `paymentStatus` = `not_applicable`
- `refundStatus`
- `fulfillmentStatus`
- `currency` = `INR`
- `subtotalInr`
- `discountInr` = `0`
- `shippingInr` = `0`
- `totalInr`
- `notesFromCustomer`
- `internalAdminNotes`
- `createdAt`
- `updatedAt`

### `orderItems`
Fields:
- `orderId`
- `productSlug`
- `productLegacyId`
- `productTitleSnapshot`
- `productImageSnapshot`
- `unitPriceInr`
- `quantity`
- `lineTotalInr`
- `productCategorySnapshot`

### `orderEvents`
Fields:
- `orderId`
- `eventType`
- `actorType`
- `actorId` nullable
- `message`
- `metadata`
- `createdAt`

### Suggested status enums

`orderStatus`
- `submitted`
- `awaiting_confirmation`
- `confirmed`
- `cancel_requested`
- `cancelled`
- `completed`

`paymentStatus`
- `not_applicable`

`fulfillmentStatus`
- `unstarted`
- `processing`
- `packed`
- `shipped`
- `delivered`

`refundStatus`
- `not_requested`
- `requested`
- `pending`
- `refunded`
- `rejected`

---

## Frontend Implementation

### 1. Cart refactor
Replace current inquiry storage with:
- `kc_cart_v1`

Shape:
```ts
type LocalCart = {
  items: Array<{
    productSlug: string;
    quantity: number;
  }>;
  updatedAt: string;
};
```

Migration:
- If old `product_inquiries` exists, convert each saved product to quantity `1`

### 2. Product page
Replace `ADD TO INQUIRY` behavior with:
- `Add to Cart`
- quantity defaults to `1`
- cart badge shows total quantity count

### 3. Cart page
Refactor [src/pages/cart.astro](C:\Users\A5IN\Coding\Repos\Kanishkacreations\src\pages\cart.astro) to:
- show quantity controls
- show line totals
- show subtotal
- remove items
- CTA to `/checkout`

### 4. Checkout page
Create `/checkout` page with:
- customer name + address form
- cart summary sidebar
- inline validation
- submit button: `Create Enquiry`

Submit flow:
1. call `/api/cart/validate`
2. call `/api/checkout/create-enquiry-order`
3. redirect to `/checkout/success?order=...`

### 5. Success page
Show:
- order number
- address summary
- line items
- totals
- next step text
- `Send via WhatsApp`
- `Send via Email`

The message/body must include:
- order number
- customer name
- shipping address
- notes
- itemized products with quantity
- subtotal/total

---

## Backend Logic

### Catalog authority
Prices and product metadata must be read from Keystatic/Astro content collections at checkout time.

Rules:
- never trust cart price from the browser
- normalize product slugs against catalog
- compute totals server-side
- snapshot product data into `orderItems`

### Astro API responsibilities

#### `POST /api/cart/validate`
Input:
- cart items

Output:
- normalized items
- subtotal
- warnings for removed invalid products

Validation:
- product must exist
- quantity integer `>= 1`
- default line max `50`

#### `POST /api/checkout/create-enquiry-order`
Input:
- customer name
- address object
- notes
- cart items

Behavior:
- validate cart from catalog
- create customer
- create address
- create order
- create order items
- append order event
- generate WhatsApp URL
- generate email URL

Output:
- order ID
- order number
- success URL
- WhatsApp URL
- email URL

#### `GET /api/orders/:id`
Used for:
- success page internal fetch
- admin detail fetch if needed

#### Admin routes
Protected by admin cookie created from shared secret.

---

## Admin Plan

### Auth
Implement simple admin auth:
- `/admin/login` asks for secret
- successful login sets signed HTTP-only cookie
- `/api/admin/*` validates cookie
- invalid access redirects to login

### `/admin/orders`
List view with:
- order number
- created date
- customer name
- total
- order status
- fulfillment status
- refund status

Filters:
- status
- date range
- search by order number or customer name

### `/admin/orders/[id]`
Show:
- customer details
- address
- line items
- notes
- internal notes
- event timeline

Actions:
- mark awaiting confirmation
- confirm order
- mark packed
- mark shipped
- mark delivered
- request cancel
- mark cancelled
- mark refund pending
- mark refunded
- reject refund request
- add internal note

---

## Cancel and Refund Flow

### Cancellation
Backend-supported states:
- `submitted -> cancel_requested`
- `cancel_requested -> cancelled`
- `cancel_requested -> confirmed` for rejected cancel

### Refund
Even though payment is not active yet, keep refund workflow for admin recordkeeping:
- `not_requested -> requested`
- `requested -> pending`
- `pending -> refunded`
- `requested|pending -> rejected`

These are manual admin bookkeeping states only for now.

---

## Files to Add / Refactor

### New Convex files
- `convex/schema.ts`
- `convex/customers.ts`
- `convex/orders.ts`
- `convex/admin.ts`

### New app modules
- `src/lib/checkout/types.ts`
- `src/lib/checkout/cart.ts`
- `src/lib/checkout/validation.ts`
- `src/lib/checkout/messages.ts`
- `src/lib/admin/auth.ts`

### New pages/routes
- `src/pages/checkout.astro`
- `src/pages/checkout/success.astro`
- `src/pages/admin/login.astro`
- `src/pages/admin/orders/index.astro`
- `src/pages/admin/orders/[id].astro`
- `src/pages/api/cart/validate.ts`
- `src/pages/api/checkout/create-enquiry-order.ts`
- `src/pages/api/admin/login.ts`
- `src/pages/api/admin/logout.ts`
- `src/pages/api/admin/orders/[id]/status.ts`
- `src/pages/api/admin/orders/[id]/cancel.ts`
- `src/pages/api/admin/orders/[id]/refund.ts`

### Existing files to refactor
- [src/pages/cart.astro](C:\Users\A5IN\Coding\Repos\Kanishkacreations\src\pages\cart.astro)
- [src/pages/products/[slug].astro](C:\Users\A5IN\Coding\Repos\Kanishkacreations\src\pages\products\[slug].astro)
- [src/components/Navbar.astro](C:\Users\A5IN\Coding\Repos\Kanishkacreations\src\components\Navbar.astro)
- shared cart helpers and badge logic
- `README.md` for future Razorpay note

---

## README Note

Add a “Future Work” section to `README.md` covering:
- Razorpay integration planned later
- intended future flow:
  - create Razorpay order server-side
  - launch payment checkout
  - handle webhook verification
  - sync payment/refund status back into Convex
- explicitly note that current implementation is enquiry-only

---

## Tests and Acceptance Criteria

### Build
- `pnpm run build` passes

### Core scenarios
- add product to cart
- update quantity
- remove product
- migrate old inquiry storage to new cart model
- checkout with valid name + address succeeds
- Convex order/customer/address/orderItems created
- success page shows order number and generated WhatsApp/email actions
- invalid or empty cart blocks checkout

### Admin scenarios
- invalid secret rejected
- valid secret grants admin access
- orders list loads
- order detail loads
- status changes persist
- cancel/refund changes persist
- order event log is appended for admin actions

### Data integrity
- total equals summed line items
- order items are catalog snapshots
- cancelled orders cannot be shipped
- invalid state transitions are rejected server-side

---

## Assumptions and Defaults
- Enquiry is the only active checkout mode for now
- Phone/email are intentionally not collected on-site
- Convex is backend/database only
- Keystatic remains catalog authority
- Shipping cost is fixed to `0` in v1
- Admin auth is shared-secret based
- Refund flow is administrative bookkeeping only until payment exists
- Razorpay is deferred and documented only in README
