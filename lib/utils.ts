import { NextRequest } from 'next/server'
import crypto from 'crypto'

/**
 * Generate URL-safe slug from text
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '')             // Trim - from end of text
}

/**
 * Format rating to 1 decimal place
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

/**
 * Get review URL for a QR token
 */
export function getReviewUrl(tokenId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tiptop.review'
  return `${baseUrl}/review/${tokenId}`
}

/**
 * Get worker profile URL
 */
export function getWorkerProfileUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tiptop.review'
  return `${baseUrl}/worker/${slug}`
}

/**
 * Get company profile URL
 */
export function getCompanyProfileUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tiptop.review'
  return `${baseUrl}/companies/${slug}`
}

/**
 * Generate device fingerprint for review deduplication
 */
export async function getDeviceFingerprint(request: NextRequest): Promise<string> {
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'

  // Create hash of identifying information
  const data = `${ip}|${userAgent}|${acceptLanguage}`
  const hash = crypto.createHash('sha256').update(data).digest('hex')
  
  return hash
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Extract domain from email
 */
export function getEmailDomain(email: string): string | null {
  if (!isValidEmail(email)) return null
  return email.split('@')[1]?.toLowerCase() || null
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

/**
 * Format date range (for positions)
 */
export function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate)
  const startFormatted = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short'
  }).format(start)

  if (!endDate) {
    return `${startFormatted} - Present`
  }

  const end = new Date(endDate)
  const endFormatted = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short'
  }).format(end)

  return `${startFormatted} - ${endFormatted}`
}

/**
 * Calculate duration in months
 */
export function getDurationMonths(startDate: string, endDate: string | null): number {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  
  const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                 (end.getMonth() - start.getMonth())
  
  return Math.max(0, months)
}

/**
 * Format duration for display
 */
export function formatDuration(months: number): string {
  if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'}`
  }
  
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  
  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}`
  }
  
  return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`
}

/**
 * Get verification badge text
 */
export function getVerificationBadge(
  emailVerified: boolean,
  hrVerified: boolean,
  companyVerificationStatus: 'verified' | 'registered' | 'unverified'
): string {
  if (emailVerified) return 'Email Verified'
  if (hrVerified) return 'HR Verified'
  if (companyVerificationStatus === 'verified') return 'Pending Verification'
  if (companyVerificationStatus === 'registered') return 'Pending HR Approval'
  return 'Unverified'
}

/**
 * Get verification badge color
 */
export function getVerificationBadgeColor(
  emailVerified: boolean,
  hrVerified: boolean
): 'green' | 'yellow' | 'gray' {
  if (emailVerified || hrVerified) return 'green'
  return 'gray'
}

/**
 * Generate verification token (for email links)
 * In production, use JWT or signed tokens
 */
export function generateVerificationToken(positionId: string): string {
  // Simple approach for MVP - just use position ID
  // In production, use JWT with expiration
  return positionId
}

/**
 * Verify email verification token
 */
export function verifyVerificationToken(token: string, positionId: string): boolean {
  // Simple approach for MVP
  return token === positionId
}

/**
 * Get company autocomplete display text
 */
export function formatCompanyAutocomplete(
  name: string,
  city: string | null,
  state: string | null,
  verificationStatus: 'verified' | 'registered' | 'unverified'
): string {
  const location = [city, state].filter(Boolean).join(', ')
  const badge = verificationStatus === 'verified' ? ' ✓' : ''
  
  return location ? `${name}${badge} — ${location}` : `${name}${badge}`
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
