# API Routes RLS Refactor Checklist

## Route Categorization

### (A) Service Role Required — unchanged
| Route | Reason |
|-------|--------|
| `POST /api/positions/[id]/verify-email` | Token-based, no session; system verifies via signed token |
| `POST /api/positions/[id]/hr-approve` | Token-based, no session; HR verifies via signed token |
| `GET /api/qr-tokens/[tokenId]/worker` | Public QR scan; must UPDATE `scan_count` (anon has no UPDATE on qr_tokens) |
| All `/api/admin/*` routes | Admin cross-tenant access; RLS has no admin bypass policies |

### (B) Session Client — refactored
| Route | Change |
|-------|--------|
| `GET /api/workers` | `createAdminClient` → `createClient` |
| `POST /api/workers` | `createAdminClient` → `createClient` |
| `PATCH /api/workers` | `createAdminClient` → `createClient` |
| `GET /api/positions` | `createAdminClient` → `createClient` |
| `POST /api/positions` | `createAdminClient` → `createClient` |
| `PATCH /api/positions/[id]` | `createAdminClient` → `createClient` |
| `DELETE /api/positions/[id]` | `createAdminClient` → `createClient`; simplified to single DELETE (CASCADE handles reviews/qr_tokens) |
| `POST /api/positions/[id]/resend-verification` | `createAdminClient` → `createClient` |
| `GET /api/qr-tokens` | `createAdminClient` → `createClient` |
| `POST /api/qr-tokens` | `createAdminClient` → `createClient` |
| `PATCH /api/qr-tokens` | `createAdminClient` → `createClient` |
| `GET /api/companies` | `createAdminClient` → `createClient` |
| `POST /api/companies` | `createAdminClient` → `createClient` |
| `PATCH /api/companies` | `createAdminClient` → `createClient` |
| `GET /api/companies/manage` | `createAdminClient` → `createClient` |
| `PATCH /api/companies/manage` | `createAdminClient` → `createClient` |
| `POST /api/companies/verify` | `createAdminClient` → `createClient` |
| `GET /api/reviews` | `createAdminClient` → `createClient` |
| `POST /api/reviews` | `createAdminClient` → `createClient` for all DB ops; `createAdminClient` kept only for `auth.admin.getUserById()` (email lookup) |

---

## RLS Policies Added

**File:** `supabase/migrations/003_rls_policy_additions.sql`

| Table | Policy | Purpose |
|-------|--------|---------|
| `positions` | `Workers can delete their own positions` | Allow workers to delete positions; CASCADE handles related rows |
| `companies` | `Admins can update companies` | Allow admins to update any company |
| `companies` | `Workers with positions can update company` | Allow workers to update company (e.g. add `hr_email`) when they have a position there |

---

## Migration Steps

1. Run the migration in Supabase SQL Editor:
   ```bash
   # Copy contents of supabase/migrations/003_rls_policy_additions.sql
   # and run in Supabase Dashboard → SQL Editor
   ```

2. Deploy the updated API routes (already refactored in codebase).

3. Verify behavior: user actions should still work; RLS now enforces authorization in addition to application checks.
