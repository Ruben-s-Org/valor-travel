# Valor Travel MCP

The simplest no-auth travel MCP for AI agents. Real-time flight search, price calendars, and affiliate booking links. Mount in Claude, ChatGPT, or any agent in seconds.

## Quick Start — Use It Now

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "valor-travel": {
      "url": "https://valor-travel-mcp.rubencharlestouitou.workers.dev/mcp"
    }
  }
}
```

That's it. No API key. No signup. Ask Claude: *"Find me cheap flights from NYC to London in July"*

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_flights` | Real-time flight search with prices and booking links |
| `search_cheapest_dates` | Find the cheapest dates to fly on any route |
| `get_price_calendar` | Monthly price trends by day |
| `get_booking_link` | Generate direct booking URLs |

## REST API

```bash
# Search flights
curl "https://valor-travel-mcp.rubencharlestouitou.workers.dev/api/flights/search?origin=JFK&destination=LHR&departure_date=2025-07-15"

# Cheapest dates
curl "https://valor-travel-mcp.rubencharlestouitou.workers.dev/api/flights/cheapest?origin=LAX&destination=NRT&month=2025-08"

# Price calendar
curl "https://valor-travel-mcp.rubencharlestouitou.workers.dev/api/flights/calendar?origin=SFO&destination=CDG&month=2025-09"

# Booking link
curl "https://valor-travel-mcp.rubencharlestouitou.workers.dev/api/flights/booking-link?origin=ORD&destination=BCN&departure_date=2025-06-20"
```

## Deploy Your Own (Under 5 Minutes)

### Prerequisites
- [Node.js](https://nodejs.org) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- [Travelpayouts API token](https://www.travelpayouts.com/developers/api)

### 1. Clone & Install

```bash
git clone https://github.com/Ruben-s-Org/valor-travel.git
cd valor-travel
npm install
```

### 2. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create valor-travel-db
# Copy the database_id into wrangler.toml

# Create KV namespace
wrangler kv namespace create CACHE
# Copy the id into wrangler.toml
```

### 3. Add Secrets

```bash
wrangler secret put TRAVELPAYOUTS_TOKEN
# Paste your Travelpayouts API token
```

### 4. Initialize Database & Deploy

```bash
npm run db:init
npm run deploy
```

### 5. Deploy Landing Page

```bash
cd landing
npm install
npm run build
wrangler pages deploy dist --project-name=valor-travel-landing
```

## Getting a Travelpayouts API Token

1. Sign up at [travelpayouts.com](https://www.travelpayouts.com/)
2. Join the Aviasales affiliate program
3. Go to **Tools → API** and copy your token
4. Approval usually takes 1-2 business days

## Project Structure

```
valor-travel/
├── src/
│   ├── index.ts          # Hono routes + MCP routing
│   ├── mcp-server.ts     # MCP Durable Object with tools
│   ├── travelpayouts.ts  # Travelpayouts API client
│   ├── cache.ts          # KV caching layer
│   ├── analytics.ts      # D1 usage tracking & rate limiting
│   └── types.ts          # TypeScript types
├── landing/              # Vue 3 + shadcn-vue landing page
│   └── src/
│       ├── App.vue       # Main landing page
│       └── components/   # shadcn-vue UI components
├── schema.sql            # D1 schema
├── wrangler.toml         # Cloudflare Worker config
└── package.json
```

## Architecture

- **Backend**: Cloudflare Workers + Durable Objects (MCP server)
- **Database**: D1 (usage tracking, rate limiting)
- **Cache**: KV (5-10 min TTL on flight results)
- **Frontend**: Vue 3 + shadcn-vue + Tailwind CSS
- **Search**: Travelpayouts real-time search with Data API fallback
- **Transport**: MCP Streamable HTTP + REST API + OpenAPI 3.1

## Marketplace Listings

- **MCP Manifest**: `/mcp-manifest.json`
- **OpenAPI Spec**: `/openapi.json`
- **GPT Actions**: `/gpt-actions.json`

## Rate Limits

| Tier | Limit | Auth |
|------|-------|------|
| Free | 500 requests/day | None |
| Pro | Unlimited | API key (coming soon) |

## License

MIT
