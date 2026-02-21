# TipTop.review v2.0 — Deployment Guide

## 🎯 What's New in v2.0

**Multi-Position Architecture:**
- Workers can have multiple positions at different companies
- Each position gets its own QR code and review stream
- Companies have 3-tier verification system
- Email domain instant verification for verified companies
- HR approval workflow for position verification

---

## 📋 Pre-Deployment Checklist

Before you start, make sure you have:
- [ ] Current system backed up (export data from Supabase if needed)
- [ ] Supabase project ready (same one or new one)
- [ ] Vercel project (will update existing deployment)
- [ ] GitHub repo ready to receive new code
- [ ] 30-60 minutes of focused time

---

## 🗄️ Step 1: Database Migration

**Option A: Fresh Start (Recommended for testing)**
1. Go to Supabase → SQL Editor → New Query
2. Copy the entire contents of `002_v2_schema.sql`
3. Paste and click **Run**
4. Verify tables created: `SELECT * FROM companies;`

**Option B: Migrating Existing Data**
If you have workers/reviews in production:
1. Export existing data first
2. Comment out the DROP TABLE section in the migration
3. Run the migration
4. Manually migrate worker data to new structure
5. Create a position for each existing worker
6. Link existing QR codes and reviews to positions

---

## 📦 Step 2: Deploy New Codebase

### 2.1 — Backup Current Code
```bash
cd /path/to/your/tiptop-repo
git checkout -b v1-backup
git push origin v1-backup
git checkout main
```

### 2.2 — Replace with v2.0 Code
1. Download `tiptop-v2.zip` from this conversation
2. Unzip it
3. Delete everything in your repo EXCEPT `.git` folder:
   ```bash
   # On Mac/Linux:
   find . -not -path './.git*' -delete
   
   # On Windows PowerShell:
   Get-ChildItem -Exclude .git | Remove-Item -Recurse -Force
   ```
4. Copy all files from unzipped `tiptop-v2` folder into your repo
5. Verify `package.json` is at the root level

### 2.3 — Commit and Push
```bash
git add .
git commit -m "v2.0: Multi-position architecture with company verification"
git push origin main
```

Vercel will auto-deploy within 1-2 minutes.

---

## ⚙️ Step 3: Update Environment Variables

**No changes needed!** Your existing env vars work with v2.0:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (keep as `https://tiptop.review`)
- `RESEND_FROM_EMAIL` (optional)
- `RESEND_API_KEY` (optional)

---

## 👤 Step 4: Create Your Admin Account

v2.0 includes an admin role for managing company verifications.

1. Sign up at `https://tiptop.review/signup`
2. Use your personal email (this becomes your admin account)
3. Go to Supabase → SQL Editor → Run:
   ```sql
   -- Make your account an admin
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE email = 'your-email@example.com';
   ```
4. Refresh the site → you'll now see "Admin" in the sidebar

---

## 🏢 Step 5: Add Your First Verified Company

### 5.1 — Create Company
Go to Supabase → SQL Editor:
```sql
INSERT INTO companies (
  name,
  slug,
  address,
  city,
  state,
  zip,
  industry,
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
  '123 Happy Valley Drive',
  'State College',
  'PA',
  '16803',
  'Hospitality',
  'happyvalley.com',  -- Email domain for instant verification
  'hr@happyvalley.com',
  'verified',
  NOW(),
  auth.users.id,  -- Your user ID
  auth.users.id
FROM auth.users
WHERE email = 'your-email@example.com';
```

### 5.2 — Test Email Domain Verification
1. Sign up a test worker with email `test@happyvalley.com`
2. Add position at Happy Valley Casino
3. Enter verification email: `test@happyvalley.com`
4. System sends verification email
5. Click link → position instantly verified ✅

---

## 🧪 Step 6: Test Complete Flow

### Test 1: Email Domain Verification
1. Create worker account with company email
2. Add position at verified company
3. Verify with company email
4. Position should be instantly verified
5. QR code should activate immediately

### Test 2: HR Approval Flow
1. Create worker account with personal email
2. Add position at verified company
3. System sends email to HR contact
4. Simulate HR clicking "Approve"
5. Position gets verified

### Test 3: Unverified Company
1. Create worker account
2. Add position at non-existent company
3. Fill in company details (no HR email)
4. Position shows as "Unverified"
5. QR still works, reviews collect normally

### Test 4: Review Submission
1. Get QR link from any position
2. Open in incognito window
3. Submit 5-star review
4. Verify review shows in worker dashboard
5. Check position rating updated
6. Check worker overall rating updated

---

## 📊 Step 7: Admin Dashboard Usage

### Manage Company Verification Requests
1. Go to `/admin/companies`
2. See pending verification requests
3. Review company details
4. Approve/Deny/Request More Info
5. Approved companies get email domain enabled

### Manually Add Verified Companies
1. Go to `/admin/companies/new`
2. Fill in company details
3. Add email domain for instant verification
4. Save → company becomes verified

---

## 🚨 Troubleshooting

### Build fails on Vercel
- Check that `vercel.json` exists in root
- Verify all dependencies in `package.json`
- Check build logs for specific error

### Position verification emails not sending
- Check `RESEND_API_KEY` is set in Vercel
- Verify email templates in `lib/email.ts`
- Check Resend dashboard for delivery status

### QR codes not working
- Verify position has `is_active = true`
- Check `qr_tokens` table has entries
- Verify position is linked to worker

### Reviews not appearing
- Check RLS policies are enabled
- Verify `reviews` table has data
- Check position has public worker

### Admin dashboard not showing
- Verify admin role in `user_roles` table
- Clear browser cache
- Check console for errors

---

## 📈 Monitoring & Maintenance

### Weekly Tasks
- Review pending company verifications
- Check for spam/fake positions
- Monitor error logs in Vercel

### Monthly Tasks
- Review badge awards
- Check database performance
- Update verified company list

### As Needed
- Manually verify positions if HR doesn't respond
- Add new verified companies
- Handle disputed positions

---

## 🎓 Key Concepts for v2.0

**Company Verification Levels:**
- 🟢 **Verified** = You approved it, has email domain
- 🟡 **Registered** = User created, has HR email
- ⚪ **Unverified** = User created, no verification

**Position Verification:**
- **Email Verified** = Worker confirmed with company email
- **HR Verified** = HR approved the position
- **Unverified** = No verification (still works, shows badge)

**QR Codes:**
- One QR per position (not per worker)
- Links to position-specific review page
- Shows company context to reviewers

**Reviews:**
- Tied to specific position
- Aggregated to worker overall rating
- Position-level and worker-level stats

**Worker Profile:**
- Shows all positions (current and past)
- Overall rating across all positions
- Individual ratings per position

---

## 🆘 Need Help?

If something goes wrong:
1. Check this guide first
2. Review error messages in Vercel logs
3. Check Supabase logs for database errors
4. Verify environment variables are set
5. Test in incognito mode (clears cache)

---

## ✅ Post-Deployment Checklist

After deployment, verify:
- [ ] Homepage loads correctly
- [ ] Signup creates worker + allows position creation
- [ ] Company autocomplete works
- [ ] Position creation works
- [ ] Email verification email sends
- [ ] QR code generates and works
- [ ] Review submission saves correctly
- [ ] Reviews appear in dashboard
- [ ] Admin panel accessible (if admin)
- [ ] Company verification flow works

---

## 🎉 You're Live!

Congratulations! TipTop.review v2.0 is now live with:
- Multi-position support
- Company verification system
- Email domain instant verification
- HR approval workflow
- Admin dashboard
- Scalable architecture

Start onboarding workers and building your verified company network!
