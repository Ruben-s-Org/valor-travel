import type { Env } from './types';

const DEFAULT_TTL = 300; // 5 minutes

export async function getCached<T>(env: Env, key: string): Promise<T | null> {
  try {
    const raw = await env.CACHE.get(key, 'text');
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCache(env: Env, key: string, data: unknown, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
  try {
    await env.CACHE.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds });
  } catch {
    // Cache write failure is non-fatal
  }
}

export function buildCacheKey(tool: string, params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `vt:${tool}:${sorted}`;
}
