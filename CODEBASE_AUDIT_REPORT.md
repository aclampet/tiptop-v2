# TipTop v2 Codebase Audit Report

Post-refactor analysis (RLS, company_memberships, hr_profiles, verification_events, etc.)

---

## 1. Database: Tables, Key Columns, Relationships

| Table | Key Columns | Relationships |
|-------|-------------|---------------|
| **workers** | id, auth_user_id, display_name, slug, overall_rating, is_public | auth.users(id) |
| **companies** | id, slug, name, hr_email, email_domain, verification_status, created_by | auth.users(created_by, verified_by) |
| **positions** | id, worker_id, company_id, title, verification_email, email_verified, hr_verified, hr_verified_by | workers(id), companies(id) |
| **qr_tokens** | id, position_id, scan_count, is_active | positions(id) |
| **reviews** | id, position_id, qr_token_id, rating, reviewer_fingerprint | positions(id), qr_tokens(id). UNIQUE(position_id, reviewer_fingerprint) |
| **badges** | id, name, tier, category | — |
| **worker_badges** | worker_id, badge_id | workers(id), badges(id) |
| **company_verification_requests** | id, company_id, submitted_by, status | companies(id), auth.users(submitted_by) |
| **user_roles** | user_id, role (worker|admin|company_admin|hr) | auth.users(id) |
| **company_memberships** | id, company_id, user_id, role (owner|admin) | companies(id), auth.users(id). UNIQUE(company_id, user_id) |
| **company_invites** | id, company_id, email, role (admin), invited_by | companies(id), auth.users(invited_by). UNIQUE(company_id, email) |
| **hr_profiles** | user_id (PK), company_id, work_email, status (pending|verified|rejected), verified_by | auth.users(id), companies(id) |
| **verification_events** | id, company_id, position_id, actor_user_id, actor_type (user|token), event_type, metadata | companies(id), positions(id), auth.users(actor_user_id) |

**Schema sources:** `002_v2_schema.sql`, `005_company_memberships.sql`, `006_hr_profiles.sql`, `007_verification_events.sql`, `009_verification_events_actor_type.sql`

---

## 2. RLS: Enabled Tables and Policies

| Table | RLS | Policies |
|-------|-----|----------|
| **workers** | ✅ | SELECT: public (is_public), own; UPDATE: own; INSERT: own |
| **companies** | ✅ | SELECT: public; INSERT: created_by; UPDATE: owners/admins/platform admin/created_by (005), workers limited (company_worker_update_allowed) |
| **positions** | ✅ | SELECT: public positions, own; INSERT/UPDATE: own; DELETE: own (003) |
| **qr_tokens** | ✅ | SELECT: public; ALL: own (via position) |
| **reviews** | ✅ | SELECT: public, own; INSERT: **Anyone can submit** (`WITH CHECK (TRUE)`) |
| **badges** | ✅ | SELECT: public |
| **worker_badges** | ✅ | SELECT: public |
| **company_verification_requests** | ✅ | SELECT/INSERT: own (submitted_by) |
| **user_roles** | ✅ | SELECT: own; INSERT: own hr role (006) |
| **company_memberships** | ✅ | SELECT: own, company owners/admins; INSERT: owners/admins OR claim; DELETE: owners only |
| **company_invites** | ✅ | ALL: owners/admins for their company |
| **hr_profiles** | ✅ | SELECT: own, company owners/admins; INSERT/UPDATE: own (status blocked by trigger) |
| **verification_events** | ✅ | SELECT: company owners/admins only. **No INSERT policy** (RPC writes via SECURITY DEFINER) |

**Policy concerns:**
- **reviews INSERT "Anyone can submit"** (`002_v2_schema.sql` line ~354): Very permissive. RLS allows anon to insert reviews; rate limiting and fingerprint dedup are in app layer only.
- **003 "Admins can update companies"** + **005 "Company owners and admins"**: 005 drops 003’s "Admins can update companies", so platform admins are covered by the 005 policy. No redundancy.
- **verification_events**: No INSERT policy is expected; writes go through `log_verification_event` RPC.

---

## 3. Service-Role (createAdminClient) Usage

| File | Usage | Justified? |
|------|-------|------------|
| `app/admin/layout.tsx` | Check user_roles for admin | ✅ Admin gating |
| `app/admin/page.tsx` | Load admin data | ✅ Admin only |
| `app/admin/companies/page.tsx` | List companies | ✅ Admin only |
| `app/admin/companies/[id]/page.tsx` | — | (same layout) |
| `app/admin/workers/page.tsx` | List workers | ✅ Admin only |
| `app/admin/reviews/page.tsx` | List reviews | ✅ Admin only |
| `app/api/admin/companies/route.ts` | List/create companies | ✅ Admin auth checked |
| `app/api/admin/companies/[id]/route.ts` | Get/update company | ✅ Admin auth checked |
| `app/api/admin/verifications/route.ts` | Get/patch verifications | ✅ Admin auth checked |
| `app/api/positions/[id]/hr-approve/route.ts` | Read position, update positions/qr_tokens | ⚠️ **Could move to RPC** – token-based flow needs bypass; session flow could use session client |
| `app/api/positions/[id]/verify-email/route.ts` | Read position, update positions/qr_tokens | ⚠️ **Token-based, no session** – admin client needed to update without RLS |
| `app/api/reviews/route.ts` | `auth.admin.getUserById` for email | ✅ Service-only; no session-based alternative |
| `app/companies/[slug]/page.tsx` | Load company + positions | ⚠️ Could use session client if RLS covers it |
| `app/worker/[slug]/page.tsx` | Load worker + positions | ⚠️ Could use session client |
| `app/dashboard/page.tsx` | Load worker + positions | ⚠️ Auth required; could use session client |
| `app/dashboard/positions/page.tsx` | Load positions | ⚠️ Could use session client |
| `app/dashboard/positions/[id]/page.tsx` | Load position | ⚠️ Could use session client |
| `app/dashboard/reviews/page.tsx` | Load reviews | ⚠️ Could use session client |
| `app/dashboard/qr/page.tsx` | Load qr_tokens | ⚠️ Could use session client |
| `app/dashboard/badges/page.tsx` | Load badges | ⚠️ Could use session client |
| `app/api/hr/pending-positions/route.ts` | Load positions for verified HR | ⚠️ Needs positions not visible to session; RLS may block. Justified if RLS restricts. |
| `lib/badges.ts` | Check badge eligibility | ⚠️ Depends on usage context |

**Summary:** Admin routes and token-based flows (verify-email, hr-approve) reasonably use admin client. Dashboard and public pages could be migrated to session client if RLS policies allow.

---

## 4. Public Endpoints (No Auth)

| Route | Method | Action | Notes |
|-------|--------|--------|-------|
| `GET /api/companies?query=` | GET | Read | Company search; `app/api/companies/route.ts` – no `getUser` |
| `GET /api/reviews?position_id=` | GET | Read | Public review list |
| `POST /api/reviews` | POST | **Write** | **Public review submit** – no auth; RLS allows anon INSERT |
| `GET /api/qr-tokens/[tokenId]/worker` | GET | Read + **Write** | Returns token/position/worker and calls `increment_qr_scan` RPC |
| `POST /api/positions/[id]/verify-email` | POST | **Write** | Token-based; no auth; updates positions + qr_tokens |
| `POST /api/positions/[id]/hr-approve` | POST | **Write** | Token path: no auth; updates positions + calls `log_verification_event` |

**Public write risk:** `POST /api/reviews` – anyone can submit reviews. Mitigations: rate limiting (in-memory), fingerprint dedup, qr_token + position validation. No auth.

---

## 5. Verification Flows (End-to-End)

### 5.1 Company claim
1. User visits `/companies/[slug]/manage` (must have access: created_by, membership, or position)
2. Manage API: `GET /api/companies/manage?slug=` (`app/api/companies/manage/route.ts`) – checks created_by, membership, or position
3. UI shows “Claim this business” when `can_claim` (no owner and (created_by or position))
4. `POST /api/companies/[companyId]/claim` (`app/api/companies/[companyId]/claim/route.ts`) – session auth, inserts into `company_memberships` with role=owner
5. **No verification_events** for claim

### 5.2 HR onboarding + approval
1. User adds `hr` role via `POST /api/hr/request-role` (006 policy)
2. User creates/updates `hr_profiles` via `POST /api/hr/profile` (work_email, company_id)
3. Owner/admin on company manage page sees “HR Verification Requests”
4. `PATCH /api/companies/[companyId]/hr-profiles/[userId]` with status=verified|rejected (and reason_code for reject)
5. **verification_events:** `log_verification_event` RPC – `hr_profile_approved` or `hr_profile_rejected` (`app/api/companies/[companyId]/hr-profiles/[userId]/route.ts`)

### 5.3 Position approval via dashboard (session)
1. Verified HR visits `/dashboard/hr`
2. `GET /api/hr/pending-positions` – positions awaiting HR verification
3. Clicks Approve → `POST /api/positions/[id]/hr-approve` with `{ action: 'approve' }` (no token)
4. API checks verified `hr_profiles` for company; updates positions + qr_tokens; calls `log_verification_event` with `p_actor_type='user'`
5. **verification_events:** `position_approved`, actor_type=user

### 5.4 Position approval via token link
1. HR gets email with approve/deny URLs (`lib/email.ts`)
2. Deny: `/hr/approve?id=&token=&action=deny` or `&reason=not_employee`
3. Approve: `/hr/approve?id=&token=&action=approve`
4. `POST /api/positions/[id]/hr-approve` with `{ token, action }` (and reason_code for deny)
5. API verifies token (`verifyVerificationToken` in `lib/utils.ts`); updates positions; calls `log_verification_event` with `p_actor_type='token'`
6. **verification_events:** `position_approved` or `position_denied`, actor_type=token

### 5.5 QR scan count increment
1. User scans QR → `GET /api/qr-tokens/[tokenId]/worker` (`app/api/qr-tokens/[tokenId]/worker/route.ts`)
2. No auth; in-memory rate limit (20/min per IP)
3. Session client fetches token; `supabase.rpc('increment_qr_scan', { p_token_id })`
4. **No verification_events** for scan

---

## 6. Risks / Gaps (Top 10)

| # | Risk | Location | Fix |
|---|------|----------|-----|
| 1 | **Review spam / abuse** – public POST, no auth | `app/api/reviews/route.ts`, RLS reviews INSERT | Add auth or tighten RLS; consider CAPTCHA or stricter rate limits |
| 2 | **QR scan rate limit in memory** | `app/api/qr-tokens/[tokenId]/worker/route.ts` | Use Redis/DB or edge KV; per-process Map is lost on restart |
| 3 | **Verification token replay** | `lib/utils.ts` verifyVerificationToken | Tokens are HMAC+signed with expiry; no one-time-use. Consider adding used_at / single-use flag |
| 4 | **HR role self-assignment** | 006 `Users can insert own hr role` | Intentional for onboarding; could add invite-only flow later |
| 5 | **log_verification_event(actor_type=token) callable by anon** | 008 RPC GRANT anon | Needed for token flow; RPC does not re-validate token. API is gatekeeper; anon could still spam events if they bypass API |
| 6 | **increment_qr_scan has no RLS** | 004 RPC | Intended; any anon/authenticated can increment any token. Abuse via rapid scans limited by rate limit only |
| 7 | **Self-service hr role** | `app/api/hr/request-role/route.ts` | Any user can add `hr`; low impact, used for onboarding |
| 8 | **company_invites SELECT via FOR ALL** | 005 | Owners/admins can read all invites; no exposure beyond that |
| 9 | **hr_profiles status trigger** | 006 | Correct; users cannot change status; owners/admins can |
| 10 | **No verification_events for email verification** | `verify-email` route | `verify-email` does not write verification_events; only hr-approve/deny and hr_profile approve/reject do |

---

## 7. Recommended Next Steps

1. **Move QR scan rate limit to durable store** – Replace in-memory Map with Redis or Supabase table so limits survive restarts and scale across instances.
2. **Add verification_events for email verification** – Extend `log_verification_event` (or add a variant) and call it from `POST /api/positions/[id]/verify-email` for audit completeness.

---

**Files / Migrations Referenced**

- Schema: `002_v2_schema.sql`
- RLS additions: `003_rls_policy_additions.sql`
- QR scan RPC: `004_increment_qr_scan_rpc.sql`
- Company memberships: `005_company_memberships.sql`
- HR profiles: `006_hr_profiles.sql`
- Verification events: `007_verification_events.sql`
- Log RPC: `008_log_verification_event_rpc.sql`
- Actor type: `009_verification_events_actor_type.sql`
- Denial reasons: `010_verification_denial_reasons.sql`
