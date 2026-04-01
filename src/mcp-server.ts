import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from './types';
import { searchFlightsRealtime, searchCheapestDates, getPriceCalendar } from './travelpayouts';
import { getCached, setCache, buildCacheKey } from './cache';
import { logUsage } from './analytics';

export class ValorTravelMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'valor-travel',
    version: '1.0.0',
  });

  async init() {
    // search_flights
    this.server.tool(
      'search_flights',
      `Search for flights between any two airports worldwide. Returns real-time pricing, airline details, number of stops, and direct booking links.

Supports one-way and round-trip searches. Results include affiliate booking URLs that open directly to the checkout page.

IMPORTANT: Always use 3-letter IATA airport codes (e.g., JFK, LAX, LHR, NRT). Dates must be in YYYY-MM-DD format.

Example: Search New York to London round-trip:
  origin: "JFK", destination: "LHR", departure_date: "2025-06-15", return_date: "2025-06-22"`,
      {
        origin: z.string().length(3).describe('Origin airport IATA code (e.g., JFK, LAX, LHR)'),
        destination: z.string().length(3).describe('Destination airport IATA code (e.g., CDG, NRT, SFO)'),
        departure_date: z.string().describe('Departure date in YYYY-MM-DD format'),
        return_date: z.string().optional().describe('Return date in YYYY-MM-DD format (omit for one-way)'),
        adults: z.number().min(1).max(9).default(1).describe('Number of adult passengers (1-9)'),
        children: z.number().min(0).max(9).default(0).describe('Number of child passengers 2-11 years (0-9)'),
        infants: z.number().min(0).max(9).default(0).describe('Number of infant passengers under 2 (0-9)'),
        cabin_class: z.enum(['economy', 'business', 'first']).default('economy').describe('Cabin class: economy, business, or first'),
        max_stops: z.number().min(0).max(3).optional().describe('Maximum number of stops (0 for direct flights only)'),
        currency: z.string().default('usd').describe('Currency code for prices (default: usd)'),
      },
      async (params: any) => {
        const start = Date.now();
        const env = this.env;
        const cacheKey = buildCacheKey('search_flights', params);

        const cached = await getCached<any>(env, cacheKey);
        if (cached) {
          await logUsage(env, { tool_name: 'search_flights', origin: params.origin, destination: params.destination, departure_date: params.departure_date, cached: true, response_time_ms: Date.now() - start });
          return { content: [{ type: 'text' as const, text: JSON.stringify({ flights: cached, source: 'cached', note: 'Results cached for freshness. Use booking_url to book directly.' }, null, 2) }] };
        }

        try {
          const results = await searchFlightsRealtime({
            origin: params.origin.toUpperCase(),
            destination: params.destination.toUpperCase(),
            departure_date: params.departure_date,
            return_date: params.return_date,
            adults: params.adults,
            children: params.children,
            infants: params.infants,
            cabin_class: params.cabin_class,
            max_stops: params.max_stops,
            currency: params.currency,
          }, env);

          if (results.length > 0) {
            await setCache(env, cacheKey, results, 300);
          }

          await logUsage(env, { tool_name: 'search_flights', origin: params.origin, destination: params.destination, departure_date: params.departure_date, response_time_ms: Date.now() - start });

          if (results.length === 0) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  flights: [],
                  message: `No flights found from ${params.origin} to ${params.destination} on ${params.departure_date}. Try different dates or nearby airports.`,
                  suggestions: ['Try flexible dates with search_cheapest_dates', 'Check price_calendar for the cheapest day to fly'],
                }, null, 2),
              }],
            };
          }

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                flights: results,
                count: results.length,
                search: { origin: params.origin, destination: params.destination, departure: params.departure_date, return: params.return_date },
                note: 'Click any booking_url to book directly. Prices may vary at time of booking.',
              }, null, 2),
            }],
          };
        } catch (err: any) {
          await logUsage(env, { tool_name: 'search_flights', origin: params.origin, destination: params.destination, error: err.message, response_time_ms: Date.now() - start });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Flight search temporarily unavailable. Please try again.', details: err.message }) }],
            isError: true,
          };
        }
      }
    );

    // search_cheapest_dates
    this.server.tool(
      'search_cheapest_dates',
      `Find the cheapest flight dates for a route. Perfect for flexible travelers who want the best deal.

Returns up to 30 cheapest options sorted by price, with booking links for each date.

Use this when a user says "find me cheap flights" or "when is the cheapest time to fly" or wants flexible date searching.

Example: Find cheapest dates NYC to Paris in June:
  origin: "JFK", destination: "CDG", month: "2025-06"`,
      {
        origin: z.string().length(3).describe('Origin airport IATA code'),
        destination: z.string().length(3).describe('Destination airport IATA code'),
        month: z.string().optional().describe('Month to search in YYYY-MM format (omit for any date)'),
      },
      async (params: any) => {
        const start = Date.now();
        const env = this.env;
        const cacheKey = buildCacheKey('cheapest_dates', params);

        const cached = await getCached<any>(env, cacheKey);
        if (cached) {
          await logUsage(env, { tool_name: 'search_cheapest_dates', origin: params.origin, destination: params.destination, cached: true, response_time_ms: Date.now() - start });
          return { content: [{ type: 'text' as const, text: JSON.stringify({ dates: cached, source: 'cached' }, null, 2) }] };
        }

        try {
          const results = await searchCheapestDates(params.origin.toUpperCase(), params.destination.toUpperCase(), params.month, env);
          if (results.length > 0) await setCache(env, cacheKey, results, 600);

          await logUsage(env, { tool_name: 'search_cheapest_dates', origin: params.origin, destination: params.destination, response_time_ms: Date.now() - start });

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                cheapest_dates: results,
                count: results.length,
                route: `${params.origin} → ${params.destination}`,
                period: params.month || 'all upcoming',
                tip: 'The first result is the cheapest option. Use booking_url to book directly.',
              }, null, 2),
            }],
          };
        } catch (err: any) {
          await logUsage(env, { tool_name: 'search_cheapest_dates', origin: params.origin, destination: params.destination, error: err.message, response_time_ms: Date.now() - start });
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Could not fetch cheapest dates.', details: err.message }) }], isError: true };
        }
      }
    );

    // get_price_calendar
    this.server.tool(
      'get_price_calendar',
      `Get a monthly price calendar showing the cheapest flight price for each day. Ideal for visualizing price trends and finding the best travel window.

Returns daily prices for an entire month, with direct/non-stop indicators and booking links.

Example: Price calendar for LAX to Tokyo in July:
  origin: "LAX", destination: "NRT", month: "2025-07"`,
      {
        origin: z.string().length(3).describe('Origin airport IATA code'),
        destination: z.string().length(3).describe('Destination airport IATA code'),
        month: z.string().describe('Month in YYYY-MM format'),
      },
      async (params: any) => {
        const start = Date.now();
        const env = this.env;
        const cacheKey = buildCacheKey('price_calendar', params);

        const cached = await getCached<any>(env, cacheKey);
        if (cached) {
          await logUsage(env, { tool_name: 'get_price_calendar', origin: params.origin, destination: params.destination, cached: true, response_time_ms: Date.now() - start });
          return { content: [{ type: 'text' as const, text: JSON.stringify({ calendar: cached, source: 'cached' }, null, 2) }] };
        }

        try {
          const results = await getPriceCalendar(params.origin.toUpperCase(), params.destination.toUpperCase(), params.month, env);
          if (results.length > 0) await setCache(env, cacheKey, results, 600);

          await logUsage(env, { tool_name: 'get_price_calendar', origin: params.origin, destination: params.destination, response_time_ms: Date.now() - start });

          const cheapest = results.length > 0 ? results.reduce((min, r) => (r.price < min.price ? r : min), results[0]) : null;

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                calendar: results,
                count: results.length,
                route: `${params.origin} → ${params.destination}`,
                month: params.month,
                cheapest_day: cheapest ? { date: cheapest.date, price: cheapest.price } : null,
                tip: 'Green means direct flight available. Use booking_url for any date to book.',
              }, null, 2),
            }],
          };
        } catch (err: any) {
          await logUsage(env, { tool_name: 'get_price_calendar', origin: params.origin, destination: params.destination, error: err.message, response_time_ms: Date.now() - start });
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Price calendar unavailable.', details: err.message }) }], isError: true };
        }
      }
    );

    // get_booking_link
    this.server.tool(
      'get_booking_link',
      `Generate a direct booking link for a specific flight route and date. The link opens Aviasales with the exact search pre-filled so the user can book immediately.

Use this to create shareable booking links or when a user wants to book a specific flight they found.

Example: Booking link for JFK to LHR on June 15, returning June 22:
  origin: "JFK", destination: "LHR", departure_date: "2025-06-15", return_date: "2025-06-22"`,
      {
        origin: z.string().length(3).describe('Origin airport IATA code'),
        destination: z.string().length(3).describe('Destination airport IATA code'),
        departure_date: z.string().describe('Departure date YYYY-MM-DD'),
        return_date: z.string().optional().describe('Return date YYYY-MM-DD (omit for one-way)'),
        adults: z.number().default(1).describe('Number of adults'),
        cabin_class: z.enum(['economy', 'business', 'first']).default('economy').describe('Cabin class'),
      },
      async (params: any) => {
        const marker = this.env.AFFILIATE_MARKER || '395498';
        const dep = params.departure_date.replace(/-/g, '');
        let route = `${params.origin}${dep}${params.destination}`;
        if (params.return_date) {
          route += params.return_date.replace(/-/g, '');
        }

        const url = `https://www.aviasales.com/search/${route}?marker=${marker}&with_request=true&passengers=${params.adults}&trip_class=${params.cabin_class === 'business' ? 1 : params.cabin_class === 'first' ? 2 : 0}`;

        await logUsage(this.env, { tool_name: 'get_booking_link', origin: params.origin, destination: params.destination, departure_date: params.departure_date });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              booking_url: url,
              route: `${params.origin} → ${params.destination}${params.return_date ? ` → ${params.origin}` : ' (one-way)'}`,
              departure: params.departure_date,
              return: params.return_date || null,
              passengers: params.adults,
              cabin: params.cabin_class,
              note: 'This link opens a live search with current prices. Final price may differ from earlier quotes.',
            }, null, 2),
          }],
        };
      }
    );
  }
}
