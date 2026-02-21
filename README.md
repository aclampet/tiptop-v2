# TipTop.review v2.0

> **Portable professional reputation platform for service workers**

Build your reputation once, carry it everywhere. TipTop enables service workers to collect verified reviews across multiple positions and companies, creating a permanent professional record that travels with them throughout their career.

---

## 🎯 What's New in v2.0

### Multi-Position Architecture
- Workers can have multiple positions at different companies
- Each position gets its own QR code and review stream
- Reviews tied to specific positions, aggregated to overall worker rating

### Company Verification System
- **Verified Companies** — Admin-approved with email domain for instant verification
- **Registered Companies** — User-created with HR email for manual approval
- **Unverified Companies** — User-created, no verification required

### Dual Verification Paths
- **Email Domain Verification** — Instant for workers with company email (@company.com)
- **HR Approval** — Manual verification via email link to HR contact

### Admin Panel
- Review and approve company verification requests
- Manually add verified companies
- System statistics and monitoring
- Complete company management

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17.0 or higher
- npm 9.0.0 or higher
- Supabase account (free tier works)
- Vercel account (free tier works)

### 1. Clone & Install
```bash
# Install dependencies
npm install
```

### 2. Set Up Supabase

**Create Project:**
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization, name, password, region
4. Wait for setup to complete (~2 minutes)

**Run Database Migration:**
1. Go to SQL Editor in Supabase Dashboard
2. Copy the entire contents of `002_v2_schema.sql`
3. Paste and click "Run"
4. Verify tables created: `SELECT * FROM companies;`

**Get API Keys:**
1. Go to Settings → API
2. Copy `Project URL` and `anon public` key
3. Copy `service_role` key (keep this secret!)

**Configure Authentication:**
1. Go to Authentication → Providers → Email
2. **Disable** "Confirm email" (for MVP)
3. Go to Authentication → URL Configuration
4. Add your domains to "Redirect URLs":
   - `http://localhost:3000/**`
   - `https://your-domain.vercel.app/**`
   - `https://tiptop.review/**`

### 3. Configure Environment Variables

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your values
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## 📦 Deployment to Vercel

### Option A: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts to link/create project
# Set environment variables when prompted

# Deploy to production
vercel --prod
```

### Option B: Deploy via GitHub

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (use your Vercel URL)
5. Deploy

### Post-Deployment

1. **Update Supabase URLs:**
   - Add Vercel domain to Supabase URL Configuration
   - Update `NEXT_PUBLIC_APP_URL` in Vercel env vars

2. **Set Up Custom Domain (Optional):**
   - Add domain in Vercel project settings
   - Update DNS records as shown
   - Update `NEXT_PUBLIC_APP_URL`

3. **Enable Email (Optional):**
   - Sign up at https://resend.com
   - Add domain and verify DNS
   - Get API key
   - Add `RESEND_API_KEY` to Vercel env vars
   - Add `RESEND_FROM_EMAIL` (e.g., notifications@yourdomain.com)

---

## 👑 Create Your First Admin

After deployment, make yourself an admin:

```sql
-- In Supabase SQL Editor:

-- First, sign up through the app to create your account
-- Then get your user ID:
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Grant admin role:
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id-here', 'admin');
```

Now you can access `/admin` routes!

---

## 🏢 Add Your First Verified Company

**Option 1: Via Admin Panel (Recommended)**
1. Log in as admin
2. Go to `/admin/companies`
3. Click "+ Add Verified Company"
4. Fill in details:
   - Name: "Happy Valley Casino"
   - Email Domain: "happyvalley.com"
   - HR Email: "hr@happyvalley.com"
5. Click "Create Verified Company"

**Option 2: Via SQL**
```sql
INSERT INTO companies (
  name,
  slug,
  city,
  state,
  email_domain,
  hr_email,
  verification_status,
  verified_at,
  verified_by,
  created_by
)
SELECT
  'Happy Valley Casino',
  'happy-valley-casino',
  'State College',
  'PA',
  'happyvalley.com',
  'hr@happyvalley.com',
  'verified',
  NOW(),
  id,
  id
FROM auth.users
WHERE email = 'your-admin-email@example.com';
```

---

## 📖 User Guide

### For Workers

**1. Sign Up**
- Go to `/signup`
- Enter email and password
- Create profile with your name

**2. Add Your First Position**
- Dashboard → Positions → "+ Add Position"
- Search for company or create new
- Fill in position details (title, dates)
- If company has email domain, enter your work email

**3. Get Verified**
- **With company email:** Check email and click verification link
- **Without company email:** Wait for HR approval
- **Unverified company:** Position works immediately, shows "Unverified" badge

**4. Generate QR Code**
- Dashboard → QR Codes
- Download PNG or copy link
- Share with customers

**5. Collect Reviews**
- Customers scan QR code
- They rate and review your service
- Reviews appear in your dashboard
- Build your portable reputation!

### For Businesses

**Request Verification:**
1. Go to `/companies/register`
2. Fill in company details
3. Enter work email (@yourcompany.com)
4. Submit for review

**Once Verified:**
- Your employees can instantly verify positions with company email
- Company profile shows all employees
- Build reputation as an employer

### For Admins

**Review Verification Requests:**
1. Go to `/admin/verifications`
2. Review company details
3. Set email domain
4. Approve or deny
5. Requester gets email notification

**Manage Companies:**
1. Go to `/admin/companies`
2. Filter by verification status
3. Edit any company
4. Add verified companies manually

---

## 🗂️ Project Structure

```
tiptop-v2/
├── app/
│   ├── admin/                 # Admin panel
│   │   ├── companies/         # Company management
│   │   ├── verifications/     # Review requests
│   │   └── layout.tsx         # Admin layout
│   ├── api/                   # API routes
│   │   ├── workers/           # Worker CRUD
│   │   ├── positions/         # Position management
│   │   ├── companies/         # Company CRUD
│   │   ├── reviews/           # Review submission
│   │   ├── qr-tokens/         # QR code management
│   │   └── admin/             # Admin-only APIs
│   ├── dashboard/             # Worker dashboard
│   │   ├── positions/         # Position management
│   │   ├── qr/                # QR codes
│   │   └── reviews/           # Reviews
│   ├── review/[tokenId]/      # Public review submission
│   ├── worker/[slug]/         # Public worker profile
│   ├── companies/[slug]/      # Public company profile
│   ├── verify-position/       # Email verification landing
│   ├── hr/approve/            # HR approval landing
│   ├── login/                 # Authentication
│   └── signup/                # Registration
├── components/                # Reusable components
├── lib/                       # Utilities
│   ├── utils.ts               # Helper functions
│   ├── email.ts               # Email templates
│   └── badges.ts              # Badge logic
├── supabase/                  # Supabase client config
├── types/                     # TypeScript definitions
└── 002_v2_schema.sql          # Database schema
```

---

## 🔧 Configuration

### Supabase Settings

**Row Level Security (RLS):**
All tables have RLS enabled. Policies control access:
- Workers can only edit their own data
- Reviews are public for public workers
- Admins have special access via API routes

**Email Confirmation:**
- Disabled for MVP (instant signup)
- Re-enable in production with proper redirect URLs

**URL Configuration:**
Must include all domains where app is hosted

### Vercel Settings

**Environment Variables:**
Set these in project settings → Environment Variables:
- All `NEXT_PUBLIC_*` vars (exposed to browser)
- All secret vars (server-side only)
- Set to "All" environments or specific to Production/Preview/Development

**Build Settings:**
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

---

## 🧪 Testing Checklist

### Core Flows
- [ ] Sign up creates account
- [ ] Add position with company search
- [ ] Email verification works
- [ ] HR approval works
- [ ] QR code generates
- [ ] QR download works
- [ ] Review submission works
- [ ] Reviews appear in dashboard
- [ ] Worker profile displays positions
- [ ] Company profile shows employees

### Admin Functions
- [ ] Admin role restricts access
- [ ] Dashboard shows stats
- [ ] Company list loads
- [ ] Edit company works
- [ ] Add verified company works
- [ ] Verification review works
- [ ] Approve sends email
- [ ] Deny sends email

### Edge Cases
- [ ] Duplicate review prevention
- [ ] Inactive QR code rejection
- [ ] Non-admin /admin redirect
- [ ] Missing environment variables
- [ ] Invalid verification tokens

---

## 🐛 Troubleshooting

### Build Fails
**Error:** "Module not found: qrcode"
**Fix:** `npm install qrcode @types/qrcode`

**Error:** "Supabase URL not found"
**Fix:** Check environment variables are set in Vercel

### Authentication Issues
**Problem:** Can't sign up
**Fix:** Disable email confirmation in Supabase

**Problem:** Redirect after login fails
**Fix:** Add domain to Supabase URL Configuration

### Reviews Not Saving
**Problem:** 401 Unauthorized
**Fix:** Check Supabase RLS policies are enabled

**Problem:** Duplicate review error
**Fix:** Clear cookies or use incognito mode

### QR Codes Not Working
**Problem:** QR inactive
**Fix:** Position must be verified (email or HR)

**Problem:** Download fails
**Fix:** Check browser allows canvas.toBlob

### Admin Access
**Problem:** Can't access /admin
**Fix:** Check user_roles table has admin entry

**Problem:** Dashboard shows no stats
**Fix:** Verify tables have data, check RLS policies

---

## 🔒 Security Notes

### Environment Variables
- **Never commit** `.env.local` to git
- Service role key is **extremely sensitive**
- Use Vercel environment variables for secrets

### RLS Policies
- All tables protected by RLS
- Admin routes double-check role server-side
- API routes verify authentication

### Review Fraud Prevention
- Device fingerprinting prevents duplicates
- Rate limiting on review submission
- QR tokens can be deactivated

---

## 📊 Database Schema Overview

**Core Tables:**
- `workers` — User profiles
- `companies` — Businesses with verification status
- `positions` — Worker employment records
- `qr_tokens` — QR codes for review collection
- `reviews` — Customer reviews (immutable)
- `badges` — Achievement definitions
- `worker_badges` — Awarded badges

**Admin Tables:**
- `user_roles` — Admin permissions
- `company_verification_requests` — Business verification queue

**Key Relationships:**
- Worker → Positions (1:many)
- Position → Company (many:1)
- Position → QR Tokens (1:many)
- Position → Reviews (1:many)
- Reviews → Worker (via position, aggregated)

---

## 🎨 Customization

### Branding
Edit these files to customize branding:
- `app/layout.tsx` — Site title, fonts
- `tailwind.config.ts` — Colors, theme
- `public/` — Logo, favicon
- Email templates in `lib/email.ts`

### Features
Enable/disable features:
- Email notifications: Set/unset `RESEND_API_KEY`
- Email confirmation: Supabase settings
- Company self-registration: Remove `/companies/register` route

---

## 📈 Roadmap

**Completed:**
- ✅ Multi-position architecture
- ✅ Company verification system
- ✅ Email domain verification
- ✅ HR approval workflow
- ✅ Admin panel
- ✅ QR code generation
- ✅ Review submission
- ✅ Public profiles

**Future Enhancements:**
- [ ] Company dashboard for HR
- [ ] Pre-defined position titles per company
- [ ] Advanced badge system
- [ ] TipTop Academy courses
- [ ] API for third-party integrations
- [ ] Mobile app

---

## 🤝 Support

**Documentation:** See `DEPLOYMENT_GUIDE.md` for detailed deployment steps

**Issues:** Common issues and solutions in Troubleshooting section above

**Database:** All schema details in `002_v2_schema.sql`

---

## 📄 License

This is a custom-built application for TipTop.review. All rights reserved.

---

## 🎉 You're All Set!

Your TipTop.review v2.0 platform is ready to launch!

1. Deploy to Vercel
2. Run database migration
3. Create admin account
4. Add verified companies
5. Start onboarding workers

**Build professional reputations that travel with workers, not employers.**

---

Built with ❤️ using Next.js, Supabase, and Vercel
