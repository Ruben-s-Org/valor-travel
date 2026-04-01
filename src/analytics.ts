import type { Env } from './types';

export async function logUsage(
  env: Env,
  data: {
    tool_name: string;
    origin?: string;
    destination?: string;
    departure_date?: string;
    return_date?: string;
    passengers?: number;
    cabin_class?: string;
    ip_hash?: string;
    user_agent?: string;
    cached?: boolean;
    response_time_ms?: number;
    error?: string;
  }
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO usage_log (tool_name, origin, destination, departure_date, return_date, passengers, cabin_class, ip_hash, user_agent, cached, response_time_ms, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.tool_name,
        data.origin || null,
        data.destination || null,
        data.departure_date || null,
        data.return_date || null,
        data.passengers || 1,
        data.cabin_class || 'economy',
        data.ip_hash || null,
        data.user_agent || null,
        data.cached ? 1 : 0,
        data.response_time_ms || null,
        data.error || null
      )
      .run();
  } catch {
    // Analytics failure is non-fatal
  }
}

export async function checkRateLimit(env: Env, ipHash: string, limit: number = 500): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];
  try {
    const row = await env.DB.prepare('SELECT call_count FROM rate_limits WHERE ip_hash = ? AND date = ?')
      .bind(ipHash, today)
      .first<{ call_count: number }>();

    const count = row?.call_count || 0;
    if (count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await env.DB.prepare(
      `INSERT INTO rate_limits (ip_hash, date, call_count) VALUES (?, ?, 1)
       ON CONFLICT(ip_hash, date) DO UPDATE SET call_count = call_count + 1`
    )
      .bind(ipHash, today)
      .run();

    return { allowed: true, remaining: limit - count - 1 };
  } catch {
    return { allowed: true, remaining: limit };
  }
}

export function hashIP(ip: string): string {
  // Simple hash for privacy — not cryptographic
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}
