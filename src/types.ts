export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  TRAVELPAYOUTS_TOKEN: string;
  AFFILIATE_MARKER?: string;
  BASE_URL?: string;
  MCP_SERVER: DurableObjectNamespace;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabin_class?: 'economy' | 'business' | 'first';
  max_stops?: number;
  currency?: string;
  locale?: string;
}

export interface FlightResult {
  airline: string;
  airline_name?: string;
  flight_number: string;
  departure: {
    airport: string;
    datetime: string;
  };
  arrival: {
    airport: string;
    datetime: string;
  };
  duration_minutes: number;
  stops: number;
  price: {
    amount: number;
    currency: string;
  };
  cabin_class: string;
  booking_url: string;
  booking_agent?: string;
  expires_at?: string;
}

export interface CheapestDateResult {
  departure_date: string;
  return_date?: string;
  price: number;
  currency: string;
  airline: string;
  flight_number?: string;
  stops: number;
  duration_minutes?: number;
  booking_agent?: string;
  booking_url: string;
}

export interface PriceCalendarEntry {
  date: string;
  price: number;
  currency: string;
  airline?: string;
  direct?: boolean;
  booking_agent?: string;
  booking_url: string;
}

export interface SearchStartResponse {
  search_id: string;
  results_url?: string;
}

export interface TravelpayoutsSearchResult {
  proposals?: any[];
  airlines?: Record<string, { name: string }>;
  airports?: Record<string, { name: string; city: string }>;
  gates_info?: Record<string, any>;
  currency_rates?: Record<string, number>;
}

export interface DataAPIPriceEntry {
  price: number;
  airline: string;
  flight_number: string;
  departure_at: string;
  return_at?: string;
  transfers: number;
  expires_at: string;
  link: string;
  gate: string;
  duration: number;
  duration_to: number;
  duration_back: number;
  origin_airport: string;
  destination_airport: string;
}
