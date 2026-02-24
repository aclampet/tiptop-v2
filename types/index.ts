// ============================================================
// TipTop.review v2.0 — TypeScript Type Definitions
// ============================================================

// ============================================================
// DATABASE TYPES
// ============================================================

export type VerificationStatus = 'verified' | 'registered' | 'unverified'
export type VerificationRequestStatus = 'pending' | 'approved' | 'denied' | 'needs_info'
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type BadgeCategory = 'volume' | 'rating' | 'streak' | 'specialty' | 'course'
export type UserRole = 'worker' | 'admin' | 'company_admin'

// ============================================================
// WORKERS
// ============================================================

export interface Worker {
  id: string
  auth_user_id: string
  display_name: string
  slug: string
  bio: string | null
  avatar_url: string | null
  overall_rating: number
  total_reviews: number
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface WorkerWithPositions extends Worker {
  positions: Position[]
  badges?: WorkerBadge[]
}

// ============================================================
// COMPANIES
// ============================================================

export interface Company {
  id: string
  name: string
  slug: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string
  industry: string | null
  email_domain: string | null
  hr_email: string | null
  website: string | null
  logo_url: string | null
  verification_status: VerificationStatus
  verified_at: string | null
  verified_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CompanyWithStats extends Company {
  employee_count?: number
  average_rating?: number
  total_reviews?: number
}

// ============================================================
// POSITIONS
// ============================================================

export interface Position {
  id: string
  worker_id: string
  company_id: string
  title: string
  start_date: string
  end_date: string | null
  verification_email: string | null
  email_verified: boolean
  email_verified_at: string | null
  hr_verified: boolean
  hr_verified_at: string | null
  hr_verified_by: string | null
  rating: number
  review_count: number
  is_active: boolean
  is_current?: boolean
  show_on_company_page?: boolean
  started_at?: string | null
  ended_at?: string | null
  created_at: string
  updated_at: string
}

export interface PositionWithCompany extends Position {
  company: Company
}

export interface PositionWithReviews extends PositionWithCompany {
  reviews: Review[]
  qr_token?: QRToken
}

// ============================================================
// QR TOKENS
// ============================================================

export interface QRToken {
  id: string
  position_id: string
  label: string
  scan_count: number
  is_active: boolean
  created_at: string
}

export interface QRTokenWithPosition extends QRToken {
  position: Position
}

// ============================================================
// REVIEWS
// ============================================================

export interface Review {
  id: string
  position_id: string
  qr_token_id: string
  rating: number
  comment: string | null
  reviewer_name: string | null
  reviewer_fingerprint: string
  is_verified: boolean
  is_flagged: boolean
  created_at: string
}

export interface ReviewWithPosition extends Review {
  position: PositionWithCompany
}

// ============================================================
// BADGES
// ============================================================

export interface Badge {
  id: string
  name: string
  tier: BadgeTier
  category: BadgeCategory
  criteria_json: Record<string, any>
  icon_url: string | null
  description: string
  created_at: string
}

export interface WorkerBadge {
  id: string
  worker_id: string
  badge_id: string
  awarded_at: string
  awarded_by: string
  badge?: Badge
}

// ============================================================
// COMPANY VERIFICATION REQUESTS
// ============================================================

export interface CompanyVerificationRequest {
  id: string
  company_id: string
  submitted_by: string
  submitted_email: string
  requested_domain: string | null
  status: VerificationRequestStatus
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface CompanyVerificationRequestWithCompany extends CompanyVerificationRequest {
  company: Company
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

// Worker API
export interface CreateWorkerRequest {
  display_name: string
  slug: string
}

export interface UpdateWorkerRequest {
  display_name?: string
  bio?: string
  avatar_url?: string
  is_public?: boolean
}

// Company API
export interface CreateCompanyRequest {
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  industry?: string
  website?: string
}

export interface UpdateCompanyRequest {
  name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  industry?: string
  website?: string
  logo_url?: string
}

export interface SearchCompaniesRequest {
  query: string
  limit?: number
}

export interface SearchCompaniesResponse {
  companies: Company[]
  exact_match: Company | null
}

// Position API
export interface CreatePositionRequest {
  company_id?: string  // If selecting existing
  company_name?: string  // If creating new
  company_address?: string
  company_city?: string
  company_state?: string
  company_zip?: string
  company_industry?: string
  company_hr_email?: string
  title: string
  start_date: string
  end_date?: string | null
  verification_email?: string
}

export interface UpdatePositionRequest {
  title?: string
  start_date?: string
  end_date?: string | null
  is_active?: boolean
}

export interface VerifyPositionEmailRequest {
  token: string  // From email verification link
}

// QR Token API
export interface CreateQRTokenRequest {
  position_id: string
  label?: string
}

export interface UpdateQRTokenRequest {
  label?: string
  is_active?: boolean
}

// Review API
export interface SubmitReviewRequest {
  position_id: string
  qr_token_id: string
  rating: number
  comment?: string
  reviewer_name?: string
}

// Company Verification API
export interface SubmitCompanyVerificationRequest {
  company_id: string
  verification_email: string
  requested_domain: string
}

export interface ReviewCompanyVerificationRequest {
  status: 'approved' | 'denied' | 'needs_info'
  admin_notes?: string
  email_domain?: string  // If approved
}

// ============================================================
// UI STATE TYPES
// ============================================================

export interface DashboardStats {
  overall_rating: number
  total_reviews: number
  total_badges: number
  active_positions: number
  recent_reviews: Review[]
}

export interface PositionStats {
  rating: number
  review_count: number
  recent_reviews: Review[]
}

// ============================================================
// FORM TYPES
// ============================================================

export interface SignupFormData {
  email: string
  password: string
  display_name: string
}

export interface AddPositionFormData {
  company_id: string | null
  company_name: string
  company_address: string
  company_city: string
  company_state: string
  company_zip: string
  company_industry: string
  company_hr_email: string
  title: string
  start_date: string
  end_date: string | null
  verification_email: string
}

// ============================================================
// HELPER TYPES
// ============================================================

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// ============================================================
// COMPANY AUTOCOMPLETE
// ============================================================

export interface CompanyAutocompleteOption {
  id: string
  name: string
  city: string | null
  state: string | null
  verification_status: VerificationStatus
  email_domain: string | null
}

// ============================================================
// ADMIN TYPES
// ============================================================

export interface AdminStats {
  total_workers: number
  total_companies: number
  total_reviews: number
  pending_verifications: number
  verified_companies: number
  registered_companies: number
  unverified_companies: number
}

export interface AdminCompanyListItem extends Company {
  position_count: number
  review_count: number
  average_rating: number
}
