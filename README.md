# SteppersLife Stores

Vendor marketplace portal for the SteppersLife platform.

**Domain:** stores.stepperslife.com
**Port:** 3017
**Role:** Creator portal for product vendors

## Purpose

Vendors use this portal to:
- Create vendor profiles
- List products with variations
- Manage inventory
- Process product orders
- Track earnings and payouts
- Create vendor coupons

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Convex (shared backend)
- Stripe + PayPal payments
- Tailwind CSS 4 + Radix UI

## Development

```bash
npm install
npm run dev          # http://localhost:3017
```

## Build & Deploy

```bash
npm run build:with-convex   # Build with Convex deploy
```

Deploy via Coolify, then purge Cloudflare cache.

## Testing

```bash
npm run test                    # Unit tests
npm run test:e2e                # All E2E tests
npm run test:e2e:vendor         # Vendor-specific
npm run test:e2e:marketplace    # Marketplace tests
npm run test:e2e:cart           # Cart tests
npm run test:e2e:checkout       # Checkout tests
npm run test:marketplace:all    # Full marketplace suite
npm run test:payment:all        # Payment tests
```

## Related

- Platform docs: `~/.claude/references/stepperslife-platform.md`
- Main aggregator: stepperslife-landing
