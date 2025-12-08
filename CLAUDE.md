# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KREAM Price Tracker is a web service that compares Korean resale item prices on KREAM with Japanese retail prices. Users can input KREAM product URLs to see price differences, track items on a watchlist, and receive alerts when price thresholds are met.

## Technology Stack

- **Frontend & Backend**: Next.js (App Router) on Vercel
- **UI**: shadcn/ui (React + Tailwind CSS)
- **Database & Auth**: Supabase (PostgreSQL)
- **Background Jobs**: Vercel Cron
- **Email**: Resend API
- **Documentation**: Mintlify
- **Monetization**: Polar

## Core Architecture

### Application Structure

The project follows Next.js App Router conventions:

- `app/` - Application routes and pages
  - `app/page.tsx` - Landing page with KREAM URL input form
  - `app/result/page.tsx` - Price comparison results page
  - `app/login/page.tsx` - Authentication page
  - `app/dashboard/page.tsx` - User watchlist and price history
  - `app/settings/alerts/page.tsx` - Alert configuration
  - `app/api/` - API routes (see below)

### API Endpoints

1. **`POST /api/analyze-kream`** - Main price analysis endpoint
   - Accepts: `{ "url": "https://kream.co.kr/products/XXXX" }`
   - Validates URL and checks if item exists in database
   - Crawls KREAM page to extract product details and prices
   - Calculates price difference against Japanese reference price
   - Returns price comparison data with history

2. **`GET /api/item/[id]`** - Fetch single item details with price history

3. **`POST /api/watchlist`** - Add/remove items from user's watchlist
   - Requires authentication

4. **`POST /api/alerts`** - Configure price alert conditions
   - Set threshold percentages for notifications
   - Specify direction (KR more expensive vs JP more expensive)

5. **`POST /api/cron/refresh-prices`** - Periodic price refresh job
   - Called by Vercel Cron (1-4 hour intervals)
   - Re-crawls watchlist items
   - Triggers email alerts via Resend when conditions are met

### Database Schema (Supabase)

**Tables:**

- `users` - User accounts (id, email, created_at)
- `items` - Product catalog (id, kream_url, title, brand, model_code, image_url)
- `price_snapshots` - Historical price data (item_id, source, price, currency, captured_at)
  - source: 'KREAM' | 'JP_RETAIL' | 'JP_RESALE'
- `watch_items` - User watchlist (user_id, item_id, jp_reference_price, currency)
- `price_alerts` - Alert configurations (user_id, item_id, direction, threshold_percent, is_active)
  - direction: 'KR_MORE_EXPENSIVE' | 'JP_MORE_EXPENSIVE'

**Indexes:**
- `price_snapshots` has index on (item_id, source, captured_at desc) for efficient queries

**Row Level Security (RLS):**
- `watch_items` and `price_alerts` restricted to `user_id = auth.uid()`

## Key Implementation Details

### Web Crawling Strategy

The KREAM crawler runs server-side in Next.js API routes:
- Uses native `fetch` with appropriate User-Agent headers
- Parses HTML using a DOM parser (e.g., cheerio)
- Extracts: product name, brand, model code, image URL, and price data
- Handles rate limiting (429) and server errors with retry logic
- Logs parsing failures when HTML structure changes

### Price Comparison Logic

```
jp_price_krw = jp_price_jpy * exchange_rate
diff = last_kream_price_krw - jp_price_krw
diff_percent = (diff / jp_price_krw) * 100
```

Display results as: "Korean price is X% more expensive than Japan" or "Save Y KRW by buying in Japan"

### Japanese Price Data

- **MVP Phase 1**: Manual entry or internal reference table
- **MVP Phase 2**: Automated crawling of brand official Japanese websites
- **Exchange Rate**: Fetched periodically from external API and cached

## Development Commands

Since this is a new project, these commands will be standard once initialized:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint

# Database migrations (Supabase)
npx supabase migration new <migration_name>
npx supabase db push
```

## Environment Variables

Required environment variables (configured in Vercel):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
POLAR_API_KEY=
EXCHANGE_RATE_API_KEY=
```

## Development Status

All phases completed:

1. **Phase 0**: ✅ Project setup (Next.js + shadcn/ui + Supabase)
2. **Phase 1**: ✅ Core MVP - URL analysis with price comparison
3. **Phase 2**: ✅ Authentication + watchlist functionality
4. **Phase 3**: ✅ Cron jobs + email alerts
5. **Phase 4**: ✅ Monetization (Polar integration with FREE/PRO tiers)

### Key Features Implemented

**Authentication (Phase 2)**
- Magic link authentication via Supabase Auth
- Protected routes with middleware
- User session management
- Login/logout functionality

**Watchlist (Phase 2)**
- Add/remove items to/from watchlist
- Plan-based limits (FREE: 3 items, PRO: 50 items)
- Dashboard with watchlist display
- Direct links to KREAM and item details

**Price Alerts (Phase 3)**
- Configure alert conditions per item
- Direction-based alerts (KR more expensive vs JP more expensive)
- Threshold percentage settings
- Vercel Cron job running every 4 hours
- Automatic email notifications via Resend

**Monetization (Phase 4)**
- Polar webhook integration
- FREE and PRO plan management
- Automatic plan upgrades/downgrades
- Feature restrictions based on plan

## Monetization Strategy

- **FREE Plan**: Up to 3 watchlist items, basic alerts
- **PRO Plan**: 50+ watchlist items, frequent price updates, extended history

Polar handles checkout and webhooks to update user plan status in Supabase.

## Important Notes

- All API routes that modify user data must verify authentication via Supabase Auth
- Crawling must respect rate limits and include error handling for HTML structure changes
- Price snapshots should be inserted on every crawl to maintain historical data
- Email alerts only trigger when price conditions cross thresholds
- Service role key must only be used server-side, never exposed to client
