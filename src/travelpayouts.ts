import type { Env, FlightSearchParams, FlightResult, CheapestDateResult, PriceCalendarEntry, DataAPIPriceEntry } from './types';

const DATA_API_BASE = 'https://api.travelpayouts.com/aviasales';

function buildBookingUrl(origin: string, dest: string, date: string, returnDate?: string): string {
  const params = new URLSearchParams({ from: origin, to: dest, date: date.split('T')[0] });
  if (returnDate) params.set('return', returnDate.split('T')[0]);
  return `https://valorflights.com?${params}`;
}

export async function searchFlightsRealtime(params: FlightSearchParams, env: Env): Promise<FlightResult[]> {
  // Go straight to Data API — it returns deep links with deal-specific URLs
  return searchFlightsDataAPI(params, env);
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
      airport: d.origin_airport || params.origin,
      datetime: d.departure_at,
    },
    arrival: {
      airport: d.destination_airport || params.destination,
      datetime: '',
    },
    duration_minutes: d.duration_to || d.duration || 0,
    stops: d.transfers,
    price: {
      amount: d.price,
      currency: currency.toUpperCase(),
    },
    cabin_class: params.cabin_class || 'economy',
    booking_url: buildBookingUrl(params.origin, params.destination, params.departure_date, params.return_date),
    booking_agent: d.gate || undefined,
    expires_at: d.expires_at,
  }));
}

export async function searchCheapestDates(origin: string, destination: string, month?: string, env?: Env): Promise<CheapestDateResult[]> {
  if (!env) return [];
  const token = env.TRAVELPAYOUTS_TOKEN;
  const marker = env.AFFILIATE_MARKER || '137906';

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
    duration_minutes: d.duration_to || d.duration || 0,
    booking_agent: d.gate || undefined,
    booking_url: buildBookingUrl(origin, destination, d.departure_at.split('T')[0], d.return_at?.split('T')[0]),
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
    booking_agent: d.gate || undefined,
    booking_url: buildBookingUrl(origin, destination, date.split('T')[0]),
  }));
}
