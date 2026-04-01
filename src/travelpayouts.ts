import type { Env, FlightSearchParams, FlightResult, CheapestDateResult, PriceCalendarEntry, DataAPIPriceEntry } from './types';

const DATA_API_BASE = 'https://api.travelpayouts.com/aviasales';
const SEARCH_API_BASE = 'https://api.travelpayouts.com/v1';
const AVIASALES_SEARCH = 'https://lyssa.aviasales.ru';

function buildBookingUrl(origin: string, dest: string, departureDate: string, returnDate?: string, marker?: string): string {
  const m = marker || '137906';
  const dep = departureDate.replace(/-/g, '');
  let route = `${origin}${dep}${dest}`;
  if (returnDate) {
    route += returnDate.replace(/-/g, '');
  }
  return `https://www.aviasales.com/search/${route}?marker=${m}`;
}

export async function searchFlightsRealtime(params: FlightSearchParams, env: Env): Promise<FlightResult[]> {
  const marker = env.AFFILIATE_MARKER || '137906';
  const token = env.TRAVELPAYOUTS_TOKEN;

  // Step 1: Start search
  const searchParams = new URLSearchParams({
    marker,
    host: 'valorflights.com',
    user_ip: '127.0.0.1',
    locale: params.locale || 'en',
    trip_class: params.cabin_class === 'business' ? 'B' : params.cabin_class === 'first' ? 'F' : 'Y',
    passengers: JSON.stringify({
      adults: params.adults || 1,
      children: params.children || 0,
      infants: params.infants || 0,
    }),
    segments: JSON.stringify([
      {
        origin: params.origin,
        destination: params.destination,
        date: params.departure_date,
      },
      ...(params.return_date
        ? [{
            origin: params.destination,
            destination: params.origin,
            date: params.return_date,
          }]
        : []),
    ]),
  });

  const startUrl = `${AVIASALES_SEARCH}/search/affiliate/start?${searchParams}&signature=placeholder&token=${token}`;

  try {
    const startRes = await fetch(startUrl);
    if (!startRes.ok) {
      throw new Error(`Search start failed: ${startRes.status}`);
    }
    const startData = (await startRes.json()) as any;
    const searchId = startData.search_id;

    if (!searchId) {
      throw new Error('No search_id returned');
    }

    // Step 2: Poll for results (max 30s)
    const resultsUrl = `${AVIASALES_SEARCH}/search/affiliate/results?uuid=${searchId}`;
    let attempts = 0;
    let allProposals: any[] = [];
    let airlines: Record<string, any> = {};

    while (attempts < 10) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(resultsUrl);
      if (!pollRes.ok) break;
      const pollData = (await pollRes.json()) as any;

      if (pollData.airlines) airlines = { ...airlines, ...pollData.airlines };
      if (pollData.proposals?.length) {
        allProposals.push(...pollData.proposals);
      }
      if (pollData.search_id && !pollData.proposals?.length && attempts > 2) break;
      attempts++;
    }

    if (allProposals.length === 0) {
      // Fallback to Data API
      return searchFlightsDataAPI(params, env);
    }

    // Parse proposals
    const results: FlightResult[] = allProposals
      .slice(0, 20)
      .map((p: any) => {
        const segment = p.segment?.[0] || {};
        const flight = segment.flight?.[0] || {};
        const airlineCode = flight.operating_carrier || flight.carrier || p.validating_carrier || '';
        const airlineName = airlines[airlineCode]?.name || airlineCode;

        return {
          airline: airlineCode,
          airline_name: airlineName,
          flight_number: `${airlineCode}${flight.number || ''}`,
          departure: {
            airport: params.origin,
            datetime: flight.departure || params.departure_date,
          },
          arrival: {
            airport: params.destination,
            datetime: flight.arrival || '',
          },
          duration_minutes: flight.duration || segment.duration || 0,
          stops: (segment.flight?.length || 1) - 1,
          price: {
            amount: p.terms?.price?.unified_price || p.terms?.[Object.keys(p.terms || {})[0]]?.unified_price || 0,
            currency: params.currency || 'USD',
          },
          cabin_class: params.cabin_class || 'economy',
          booking_url: buildBookingUrl(params.origin, params.destination, params.departure_date, params.return_date, marker),
        };
      })
      .filter((r) => r.price.amount > 0);

    // Apply max_stops filter
    if (params.max_stops !== undefined) {
      return results.filter((r) => r.stops <= params.max_stops!);
    }

    return results;
  } catch {
    // Fallback to Data API on any error
    return searchFlightsDataAPI(params, env);
  }
}

async function searchFlightsDataAPI(params: FlightSearchParams, env: Env): Promise<FlightResult[]> {
  const token = env.TRAVELPAYOUTS_TOKEN;
  const marker = env.AFFILIATE_MARKER || '137906';
  const currency = params.currency || 'usd';

  const url = `${DATA_API_BASE}/v3/prices_for_dates?origin=${params.origin}&destination=${params.destination}&departure_at=${params.departure_date}${params.return_date ? `&return_at=${params.return_date}` : ''}&currency=${currency}&sorting=price&direct=${params.max_stops === 0 ? 'true' : 'false'}&limit=15&token=${token}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data API error: ${res.status}`);
  const data = (await res.json()) as { data: DataAPIPriceEntry[]; success: boolean };

  if (!data.success || !data.data?.length) return [];

  return data.data.map((d) => ({
    airline: d.airline,
    flight_number: d.flight_number ? `${d.airline}${d.flight_number}` : d.airline,
    departure: {
      airport: params.origin,
      datetime: d.departure_at,
    },
    arrival: {
      airport: params.destination,
      datetime: '',
    },
    duration_minutes: 0,
    stops: d.transfers,
    price: {
      amount: d.price,
      currency: currency.toUpperCase(),
    },
    cabin_class: params.cabin_class || 'economy',
    booking_url: buildBookingUrl(params.origin, params.destination, params.departure_date, params.return_date, marker),
    expires_at: d.expires_at,
  }));
}

export async function searchCheapestDates(origin: string, destination: string, month?: string, env?: Env): Promise<CheapestDateResult[]> {
  if (!env) return [];
  const token = env.TRAVELPAYOUTS_TOKEN;
  const marker = env.AFFILIATE_MARKER || '137906';

  // Use prices/cheap endpoint
  const url = `${DATA_API_BASE}/v3/prices_for_dates?origin=${origin}&destination=${destination}${month ? `&departure_at=${month}` : ''}&currency=usd&sorting=price&limit=30&token=${token}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cheapest dates API error: ${res.status}`);
  const data = (await res.json()) as { data: DataAPIPriceEntry[]; success: boolean };

  if (!data.success || !data.data?.length) return [];

  return data.data.map((d) => ({
    departure_date: d.departure_at,
    return_date: d.return_at || undefined,
    price: d.price,
    currency: 'USD',
    airline: d.airline,
    flight_number: d.flight_number ? `${d.airline}${d.flight_number}` : undefined,
    stops: d.transfers,
    booking_url: buildBookingUrl(origin, destination, d.departure_at.split('T')[0], d.return_at?.split('T')[0], marker),
  }));
}

export async function getPriceCalendar(origin: string, destination: string, month: string, env: Env): Promise<PriceCalendarEntry[]> {
  const token = env.TRAVELPAYOUTS_TOKEN;
  const marker = env.AFFILIATE_MARKER || '137906';

  const url = `${DATA_API_BASE}/v3/grouped_prices?origin=${origin}&destination=${destination}&departure_at=${month}&group_by=departure_at&currency=usd&sorting=price&token=${token}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  const data = (await res.json()) as { data: Record<string, DataAPIPriceEntry>; success: boolean };

  if (!data.success || !data.data) return [];

  return Object.entries(data.data).map(([date, d]) => ({
    date,
    price: d.price,
    currency: 'USD',
    airline: d.airline,
    direct: d.transfers === 0,
    booking_url: buildBookingUrl(origin, destination, date.split('T')[0], undefined, marker),
  }));
}
