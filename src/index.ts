import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { ValorTravelMCP } from './mcp-server';
import { searchFlightsRealtime, searchCheapestDates, getPriceCalendar } from './travelpayouts';
import { getCached, setCache, buildCacheKey } from './cache';
import { logUsage, checkRateLimit, hashIP } from './analytics';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'mcp-session-id'],
  exposeHeaders: ['mcp-session-id'],
}));

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Valor Travel MCP',
    version: '1.0.0',
    description: 'The simplest no-auth travel MCP for AI agents — real-time flights, price calendars, affiliate booking links.',
    mcp_endpoint: '/mcp',
    api_docs: '/openapi.json',
    tools: ['search_flights', 'search_cheapest_dates', 'get_price_calendar', 'get_booking_link'],
    status: 'operational',
  });
});

// OpenAPI spec
app.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.1.0',
    info: {
      title: 'Valor Travel API',
      version: '1.0.0',
      description: 'Real-time flight search, price calendars, and booking links. No authentication required.',
      contact: { name: 'Valor Travel', url: 'https://valorflights.com' },
    },
    servers: [{ url: 'https://valor-travel-mcp.ruben-s-org.workers.dev', description: 'Production' }],
    paths: {
      '/api/flights/search': {
        get: {
          operationId: 'searchFlights',
          summary: 'Search flights between airports',
          parameters: [
            { name: 'origin', in: 'query', required: true, schema: { type: 'string' }, description: 'Origin IATA code' },
            { name: 'destination', in: 'query', required: true, schema: { type: 'string' }, description: 'Destination IATA code' },
            { name: 'departure_date', in: 'query', required: true, schema: { type: 'string' }, description: 'YYYY-MM-DD' },
            { name: 'return_date', in: 'query', schema: { type: 'string' }, description: 'YYYY-MM-DD for round-trip' },
            { name: 'adults', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'cabin_class', in: 'query', schema: { type: 'string', enum: ['economy', 'business', 'first'] } },
            { name: 'max_stops', in: 'query', schema: { type: 'integer' } },
            { name: 'currency', in: 'query', schema: { type: 'string', default: 'usd' } },
          ],
          responses: { '200': { description: 'Flight results' } },
        },
      },
      '/api/flights/cheapest': {
        get: {
          operationId: 'searchCheapestDates',
          summary: 'Find cheapest flight dates',
          parameters: [
            { name: 'origin', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'destination', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'month', in: 'query', schema: { type: 'string' }, description: 'YYYY-MM' },
          ],
          responses: { '200': { description: 'Cheapest date results' } },
        },
      },
      '/api/flights/calendar': {
        get: {
          operationId: 'getPriceCalendar',
          summary: 'Monthly price calendar',
          parameters: [
            { name: 'origin', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'destination', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'month', in: 'query', required: true, schema: { type: 'string' }, description: 'YYYY-MM' },
          ],
          responses: { '200': { description: 'Price calendar entries' } },
        },
      },
      '/api/flights/booking-link': {
        get: {
          operationId: 'getBookingLink',
          summary: 'Generate booking link',
          parameters: [
            { name: 'origin', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'destination', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'departure_date', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'return_date', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Booking URL' } },
        },
      },
    },
  });
});

// Rate limit middleware for API routes
async function rateLimitMiddleware(c: any, next: () => Promise<void>) {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  const ipHash = hashIP(ip);
  const { allowed, remaining } = await checkRateLimit(c.env, ipHash);

  c.header('X-RateLimit-Remaining', remaining.toString());

  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded. Free tier allows 500 requests/day.', upgrade: 'Contact us for higher limits.' }, 429);
  }

  await next();
}

// REST API routes
app.get('/api/flights/search', rateLimitMiddleware, async (c) => {
  const { origin, destination, departure_date, return_date, adults, children, infants, cabin_class, max_stops, currency } = c.req.query();

  if (!origin || !destination || !departure_date) {
    return c.json({ error: 'Missing required parameters: origin, destination, departure_date' }, 400);
  }

  const cacheKey = buildCacheKey('search_flights', { origin, destination, departure_date, return_date, cabin_class, max_stops });
  const cached = await getCached(c.env, cacheKey);
  if (cached) return c.json({ flights: cached, source: 'cached' });

  const results = await searchFlightsRealtime({
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    departure_date,
    return_date,
    adults: adults ? parseInt(adults) : 1,
    children: children ? parseInt(children) : 0,
    infants: infants ? parseInt(infants) : 0,
    cabin_class: (cabin_class as any) || 'economy',
    max_stops: max_stops ? parseInt(max_stops) : undefined,
    currency: currency || 'usd',
  }, c.env);

  if (results.length > 0) await setCache(c.env, cacheKey, results, 300);
  return c.json({ flights: results, count: results.length });
});

app.get('/api/flights/cheapest', rateLimitMiddleware, async (c) => {
  const { origin, destination, month } = c.req.query();
  if (!origin || !destination) return c.json({ error: 'Missing: origin, destination' }, 400);

  const cacheKey = buildCacheKey('cheapest_dates', { origin, destination, month });
  const cached = await getCached(c.env, cacheKey);
  if (cached) return c.json({ dates: cached, source: 'cached' });

  const results = await searchCheapestDates(origin.toUpperCase(), destination.toUpperCase(), month, c.env);
  if (results.length > 0) await setCache(c.env, cacheKey, results, 600);
  return c.json({ cheapest_dates: results, count: results.length });
});

app.get('/api/flights/calendar', rateLimitMiddleware, async (c) => {
  const { origin, destination, month } = c.req.query();
  if (!origin || !destination || !month) return c.json({ error: 'Missing: origin, destination, month' }, 400);

  const cacheKey = buildCacheKey('price_calendar', { origin, destination, month });
  const cached = await getCached(c.env, cacheKey);
  if (cached) return c.json({ calendar: cached, source: 'cached' });

  const results = await getPriceCalendar(origin.toUpperCase(), destination.toUpperCase(), month, c.env);
  if (results.length > 0) await setCache(c.env, cacheKey, results, 600);
  return c.json({ calendar: results, count: results.length });
});

app.get('/api/flights/booking-link', async (c) => {
  const { origin, destination, departure_date, return_date } = c.req.query();
  if (!origin || !destination || !departure_date) return c.json({ error: 'Missing: origin, destination, departure_date' }, 400);

  const marker = c.env.AFFILIATE_MARKER || '395498';
  const dep = departure_date.replace(/-/g, '');
  let route = `${origin.toUpperCase()}${dep}${destination.toUpperCase()}`;
  if (return_date) route += return_date.replace(/-/g, '');

  return c.json({
    booking_url: `https://www.aviasales.com/search/${route}?marker=${marker}`,
    route: `${origin} → ${destination}`,
  });
});

// Stats endpoint
app.get('/api/stats', async (c) => {
  const today = new Date().toISOString().split('T')[0];
  const stats = await c.env.DB.prepare(
    `SELECT COUNT(*) as total, SUM(CASE WHEN cached = 1 THEN 1 ELSE 0 END) as cache_hits FROM usage_log WHERE created_at >= ?`
  ).bind(today).first();
  return c.json({ today, ...stats });
});

// MCP manifest for marketplace
app.get('/mcp-manifest.json', (c) => {
  return c.json({
    name: 'Valor Travel',
    description: 'The easiest no-auth travel MCP for AI agents — real-time flights, price calendars, affiliate booking links. Mount in seconds.',
    version: '1.0.0',
    transport: { type: 'streamable-http', url: '/mcp' },
    tools: [
      { name: 'search_flights', description: 'Search real-time flight prices between any airports' },
      { name: 'search_cheapest_dates', description: 'Find the cheapest dates to fly on a route' },
      { name: 'get_price_calendar', description: 'Monthly price calendar with daily lowest prices' },
      { name: 'get_booking_link', description: 'Generate direct booking links for flights' },
    ],
    authentication: 'none',
    rate_limit: '500 requests/day (free tier)',
    homepage: 'https://valorflights.com',
  });
});

// GPT Actions schema
app.get('/gpt-actions.json', (c) => {
  return c.json({
    schema_version: 'v1',
    name_for_human: 'Valor Travel',
    name_for_model: 'valor_travel',
    description_for_human: 'Search flights, find cheap dates, and get booking links for travel worldwide.',
    description_for_model: 'Search for flights between airports worldwide. Find cheapest travel dates, view monthly price calendars, and generate direct booking links. All prices include affiliate booking URLs. Use IATA airport codes (JFK, LHR, NRT, etc.) and YYYY-MM-DD dates.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: 'https://valor-travel-mcp.ruben-s-org.workers.dev/openapi.json',
    },
  });
});

// MCP endpoint — handled by Durable Object
app.all('/mcp', async (c) => {
  const url = new URL(c.req.url);
  // Route to the MCP Durable Object
  const id = c.env.MCP_SERVER.idFromName('default');
  const stub = c.env.MCP_SERVER.get(id);
  return stub.fetch(c.req.raw);
});

app.all('/mcp/message', async (c) => {
  const id = c.env.MCP_SERVER.idFromName('default');
  const stub = c.env.MCP_SERVER.get(id);
  return stub.fetch(c.req.raw);
});

app.all('/sse', async (c) => {
  const id = c.env.MCP_SERVER.idFromName('default');
  const stub = c.env.MCP_SERVER.get(id);
  return stub.fetch(c.req.raw);
});

export { ValorTravelMCP };

export default app;
