/**
 * Durable rate limiting: Upstash Redis (preferred) or Supabase RPC fallback.
 * Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

import crypto from 'crypto'
import { createClient } from '@/supabase/server'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetSeconds: number
}

function useRedis(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

// Lua: INCR + conditional EXPIRE + TTL in one round trip
const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`

let redisInstance: InstanceType<typeof import('@upstash/redis').Redis> | null = null

async function getRedis(): Promise<InstanceType<typeof import('@upstash/redis').Redis>> {
  if (!redisInstance) {
    const { Redis } = await import('@upstash/redis')
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redisInstance
}

async function upstashLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = await getRedis()
  const prefixed = `rl:${key}`
  const result = await redis.eval(RATE_LIMIT_SCRIPT, [prefixed], [String(windowSeconds)])
  const [count, ttl] = Array.isArray(result) ? result : [1, -1]
  const countNum = typeof count === 'number' ? count : parseInt(String(count), 10) || 1
  const ttlNum = typeof ttl === 'number' ? ttl : parseInt(String(ttl), 10) ?? -1
  // TTL: -1 = no expiry, -2 = key missing (shouldn't happen). Use windowSeconds fallback.
  const resetSeconds = ttlNum >= 0 ? ttlNum : windowSeconds
  const remaining = Math.max(0, limit - countNum)
  return {
    allowed: countNum <= limit,
    remaining,
    resetSeconds: Math.max(0, resetSeconds),
  }
}

async function supabaseLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('rate_limit_hit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    throw new Error(`rate_limit_hit failed: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : data
  const count = row?.count_out ?? row?.count ?? 1
  const resetAt = row?.reset_at_out ?? row?.reset_at
  const now = Date.now()
  const resetAtMs = resetAt ? new Date(resetAt).getTime() : now + windowSeconds * 1000
  const resetSeconds = Math.max(0, Math.ceil((resetAtMs - now) / 1000))
  const remaining = Math.max(0, limit - count)

  return {
    allowed: count <= limit,
    remaining,
    resetSeconds,
  }
}

export async function rateLimit(options: {
  key: string
  limit: number
  windowSeconds: number
}): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = options
  if (useRedis()) {
    return upstashLimit(key, limit, windowSeconds)
  }
  return supabaseLimit(key, limit, windowSeconds)
}

/** Short hash of user-agent for fallback when IP is unknown */
function shortHash(value: string): string {
  if (!value) return '0'
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 8)
}

/**
 * Extract IP from request (x-forwarded-for first, x-real-ip, request.ip).
 * If IP is unknown, appends short hash of user-agent so keys differ by client.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const firstIp = forwarded?.split(',')[0]?.trim()
  if (firstIp) return firstIp
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  const req = request as Request & { ip?: string }
  if (req.ip) return req.ip
  const ua = request.headers.get('user-agent') || ''
  return `unknown:${shortHash(ua)}`
}

// Env-backed limits (optional overrides)
const env = {
  review: {
    limit: parseInt(process.env.RATE_LIMIT_REVIEW_MAX || '5', 10),
    window: parseInt(process.env.RATE_LIMIT_REVIEW_WINDOW_SECONDS || '60', 10),
  },
  qrScan: {
    limit: parseInt(process.env.RATE_LIMIT_QR_SCANS_MAX || '20', 10),
    window: parseInt(process.env.RATE_LIMIT_QR_SCANS_WINDOW_SECONDS || '60', 10),
  },
  verifyEmail: {
    limit: parseInt(process.env.RATE_LIMIT_VERIFY_EMAIL_MAX || '10', 10),
    window: parseInt(process.env.RATE_LIMIT_VERIFY_EMAIL_WINDOW_SECONDS || '60', 10),
  },
  hrApprove: {
    limit: parseInt(process.env.RATE_LIMIT_HR_APPROVE_MAX || '10', 10),
    window: parseInt(process.env.RATE_LIMIT_HR_APPROVE_WINDOW_SECONDS || '60', 10),
  },
  claim: {
    limit: parseInt(process.env.RATE_LIMIT_CLAIM_MAX || '5', 10),
    window: parseInt(process.env.RATE_LIMIT_CLAIM_WINDOW_SECONDS || '600', 10),
  },
  search: {
    limit: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '60', 10),
    window: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_SECONDS || '60', 10),
  },
  membersInvite: {
    limit: parseInt(process.env.RATE_LIMIT_MEMBERS_INVITE_MAX || '20', 10),
    window: parseInt(process.env.RATE_LIMIT_MEMBERS_INVITE_WINDOW_SECONDS || '86400', 10),
  },
}

export async function limitReview(ip: string, positionId: string): Promise<RateLimitResult> {
  return rateLimit({
    key: `review:${ip}:${positionId}`,
    limit: env.review.limit,
    windowSeconds: env.review.window,
  })
}

export async function limitQrScan(ip: string, tokenId: string): Promise<RateLimitResult> {
  return rateLimit({
    key: `qr-scan:${ip}:${tokenId}`,
    limit: env.qrScan.limit,
    windowSeconds: env.qrScan.window,
  })
}

export async function limitVerifyEmail(ip: string, positionId: string): Promise<RateLimitResult> {
  return rateLimit({
    key: `verify-email:${ip}:${positionId}`,
    limit: env.verifyEmail.limit,
    windowSeconds: env.verifyEmail.window,
  })
}

export async function limitHrApprove(ip: string, positionId: string): Promise<RateLimitResult> {
  return rateLimit({
    key: `hr-approve:${ip}:${positionId}`,
    limit: env.hrApprove.limit,
    windowSeconds: env.hrApprove.window,
  })
}

export async function limitClaim(ip: string, companyId: string): Promise<RateLimitResult> {
  return rateLimit({
    key: `claim:${ip}:${companyId}`,
    limit: env.claim.limit,
    windowSeconds: env.claim.window,
  })
}

export async function limitMembersInvite(userId: string, companyId: string): Promise<RateLimitResult> {
  return rateLimit({
    key: `members-invite:${userId}:${companyId}`,
    limit: env.membersInvite.limit,
    windowSeconds: env.membersInvite.window,
  })
}

export async function limitSearch(ip: string): Promise<RateLimitResult> {
  return rateLimit({
    key: `search:${ip}`,
    limit: env.search.limit,
    windowSeconds: env.search.window,
  })
}
