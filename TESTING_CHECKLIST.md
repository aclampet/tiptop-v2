# TipTop.review v2.0 — Testing Checklist

## Pre-Deployment Setup

### Environment Configuration
- [ ] Supabase project created
- [ ] Database migration (002_v2_schema.sql) executed successfully
- [ ] All environment variables set in Vercel
- [ ] Supabase URL Configuration includes all domains
- [ ] Email confirmation disabled in Supabase (for MVP)

### Admin Setup
- [ ] Admin user created via SQL
- [ ] Admin can access /admin routes
- [ ] Non-admin users redirected from /admin

---

## 🔐 Authentication Flow

### Sign Up
- [ ] Navigate to /signup
- [ ] Enter email and password
- [ ] Create profile with display name
- [ ] Redirected to /dashboard
- [ ] Worker profile created in database

### Login
- [ ] Navigate to /login
- [ ] Enter credentials
- [ ] Redirected to /dashboard
- [ ] Session persists across page reloads

### Logout
- [ ] Click logout in dashboard
- [ ] Redirected to login page
- [ ] Session cleared
- [ ] Cannot access /dashboard without re-login

---

## 💼 Position Management

### Add Position - Existing Company
- [ ] Navigate to /dashboard/positions/new
- [ ] Search for existing company
- [ ] Company appears in dropdown
- [ ] Verified badge shows for verified companies
- [ ] Select company from dropdown
- [ ] Fill position details (title, dates)
- [ ] Submit form
- [ ] Position appears in /dashboard/positions
- [ ] QR code auto-generated

### Add Position - New Company
- [ ] Search for non-existent company
- [ ] Click "Create new company"
- [ ] Fill company details
- [ ] Fill position details
- [ ] Submit form
- [ ] Company created in database
- [ ] Position created and linked
- [ ] QR code auto-generated

### Email Domain Verification
- [ ] Add position at verified company with email_domain
- [ ] Enter work email matching domain
- [ ] Submit position
- [ ] Receive verification email
- [ ] Click link in email
- [ ] Redirected to success page
- [ ] Position marked email_verified
- [ ] QR code activated

### HR Approval Workflow
- [ ] Add position at company with hr_email
- [ ] Submit position
- [ ] HR receives email
- [ ] HR clicks "Approve"
- [ ] Position marked hr_verified
- [ ] QR code activated
- [ ] Worker notified (if emails enabled)

### Unverified Position
- [ ] Add position at unverified company
- [ ] No HR email provided
- [ ] Position created immediately
- [ ] Shows "Unverified" badge
- [ ] QR code works but shows unverified status

---

## 📱 QR Code Management

### QR Code Generation
- [ ] Navigate to /dashboard/qr
- [ ] See all positions with QR codes
- [ ] QR code displays correctly
- [ ] Verification status shows correctly
- [ ] Inactive QR shows warning

### QR Code Download
- [ ] Click "Download PNG"
- [ ] PNG downloads successfully
- [ ] Image includes QR code
- [ ] Image includes watermark text
- [ ] Image has white background

### QR Code Link Copy
- [ ] Click "Copy" on review link
- [ ] Link copied to clipboard
- [ ] Link format: /review/[token-id]
- [ ] Checkmark shows briefly

---

## ⭐ Review Submission

### Valid Review Flow
- [ ] Scan QR code or visit link
- [ ] Review page loads with position context
- [ ] Worker name displays
- [ ] Position title displays
- [ ] Company name displays
- [ ] Verification badge shows (if applicable)
- [ ] Star rating selector works
- [ ] Hover effect on stars works
- [ ] Comment field accepts text
- [ ] Character counter updates
- [ ] Reviewer name field works
- [ ] Submit button enabled after rating selected
- [ ] Review saves to database
- [ ] Success page displays
- [ ] Review appears in worker dashboard
- [ ] Position rating updates
- [ ] Worker overall rating updates

### Error Cases
- [ ] Invalid QR token shows error
- [ ] Inactive QR code shows error message
- [ ] Duplicate review (same device) prevented
- [ ] Rating required validation works
- [ ] Rate limiting prevents spam

---

## 👤 Worker Dashboard

### Overview Page
- [ ] Navigate to /dashboard
- [ ] Stats cards display correctly
- [ ] Overall rating shows
- [ ] Total reviews count correct
- [ ] Active positions count correct
- [ ] Recent positions display (max 4)
- [ ] Recent reviews display (max 5)
- [ ] "Add first position" prompt shows when no positions

### Positions List
- [ ] Navigate to /dashboard/positions
- [ ] All positions display
- [ ] Active vs past positions separated
- [ ] Verification badges show correctly
- [ ] Position stats (rating, reviews) correct
- [ ] Date ranges display
- [ ] Duration calculated correctly
- [ ] Click position links to details (if implemented)

### Reviews Page
- [ ] Navigate to /dashboard/reviews
- [ ] Reviews grouped by position
- [ ] Star ratings display
- [ ] Comments display
- [ ] Reviewer names display
- [ ] Timestamps correct
- [ ] Stats calculate correctly
- [ ] Empty state shows when no reviews

---

## 🌐 Public Pages

### Worker Profile
- [ ] Visit /worker/[slug]
- [ ] Worker name and info display
- [ ] Overall stats show correctly
- [ ] Current positions section shows
- [ ] Past positions section shows
- [ ] Each position shows company name
- [ ] Verification badges display
- [ ] Recent reviews per position show
- [ ] Profile is publicly accessible (no login)

### Company Profile
- [ ] Visit /companies/[slug]
- [ ] Company name and info display
- [ ] Verification badge shows (if verified)
- [ ] Company stats calculate correctly
- [ ] All employees display
- [ ] Current vs former separated
- [ ] Click employee links to their profiles
- [ ] Profile is publicly accessible

---

## 👑 Admin Panel

### Dashboard
- [ ] Access /admin as admin
- [ ] Stats display correctly
- [ ] Pending verifications alert shows
- [ ] Recent reviews display
- [ ] Recent signups display
- [ ] Stat cards link to pages

### Company List
- [ ] Navigate to /admin/companies
- [ ] All companies display
- [ ] Filter by status works
- [ ] Pagination works (if >50 companies)
- [ ] Stats per company correct
- [ ] Email domain shows
- [ ] Edit links work

### Edit Company
- [ ] Click edit on a company
- [ ] Form pre-fills with data
- [ ] All fields editable
- [ ] Verification status changeable
- [ ] Email domain editable
- [ ] Save changes works
- [ ] Redirects back to list

### Add Verified Company
- [ ] Navigate to /admin/companies/new
- [ ] Fill all fields
- [ ] Set email domain
- [ ] Set HR email
- [ ] Submit
- [ ] Company created as verified
- [ ] Redirects to list

### Verification Requests
- [ ] Navigate to /admin/verifications
- [ ] Pending requests display
- [ ] Company details show
- [ ] Submitted email shows
- [ ] Requested domain shows
- [ ] Can set email domain
- [ ] Can add admin notes
- [ ] Approve button works
- [ ] Deny button works
- [ ] Email sent to requester (if enabled)
- [ ] Request removed after action

---

## 🔔 Email Notifications (If Enabled)

### Welcome Email
- [ ] New user receives welcome email
- [ ] Email has correct branding
- [ ] Links work

### Position Verification
- [ ] Worker receives email with verification link
- [ ] Email has position details
- [ ] Link works and verifies position

### HR Approval Request
- [ ] HR receives approval request email
- [ ] Email has worker and position details
- [ ] Approve link works
- [ ] Deny link works

### Verification Approved
- [ ] Requester receives approval email
- [ ] Email includes domain details
- [ ] Links work

### Verification Denied
- [ ] Requester receives denial email
- [ ] Reason included (if provided)
- [ ] Support contact shown

---

## 🐛 Edge Cases & Error Handling

### Network Issues
- [ ] Graceful degradation on slow connection
- [ ] Error messages user-friendly
- [ ] Retry mechanisms work

### Invalid Data
- [ ] Invalid URLs handled (404 pages)
- [ ] Missing required fields show validation
- [ ] Type errors prevented by TypeScript

### Security
- [ ] Non-authenticated users redirected
- [ ] Admin routes protected
- [ ] RLS policies enforced
- [ ] Service role key not exposed

### Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works on mobile browsers

---

## 📱 Mobile Responsiveness

### General
- [ ] All pages responsive
- [ ] Navigation works on mobile
- [ ] Forms usable on mobile
- [ ] Buttons properly sized

### Specific Pages
- [ ] Dashboard mobile-friendly
- [ ] Position form mobile-friendly
- [ ] Review submission mobile-friendly
- [ ] QR codes display on mobile
- [ ] Admin panel usable on tablet

---

## ⚡ Performance

### Load Times
- [ ] Homepage loads < 2s
- [ ] Dashboard loads < 3s
- [ ] Review page loads < 2s
- [ ] Images optimized

### Database
- [ ] Queries reasonably fast
- [ ] No N+1 query issues
- [ ] Indexes working

---

## 🎨 Visual Polish

### Consistency
- [ ] Colors match design system
- [ ] Fonts consistent
- [ ] Spacing consistent
- [ ] Icons consistent

### States
- [ ] Hover states work
- [ ] Loading states show
- [ ] Empty states informative
- [ ] Error states clear

---

## ✅ Final Checks

### Documentation
- [ ] README complete
- [ ] Environment variables documented
- [ ] Deployment guide accurate
- [ ] API documented (if applicable)

### Code Quality
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser
- [ ] ESLint passes
- [ ] Code formatted consistently

### Deployment
- [ ] Vercel deployment successful
- [ ] Environment variables set
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

### Post-Launch
- [ ] Monitor error logs
- [ ] Check analytics (if enabled)
- [ ] Collect user feedback
- [ ] Plan next iteration

---

## 🎉 Launch Ready!

Once all items checked, you're ready to launch TipTop.review v2.0!

**Remember:**
- Start with a small beta group
- Gather feedback early
- Iterate based on real usage
- Monitor performance and errors
- Keep backups of database

**Good luck!** 🚀
