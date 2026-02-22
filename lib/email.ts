import { Resend } from 'resend'
import { generateVerificationToken } from './utils'

// Lazy-initialize Resend to avoid build-time errors
let resendInstance: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - emails will not be sent')
    return null
  }
  
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  
  return resendInstance
}

const FROM = process.env.RESEND_FROM_EMAIL || 'notifications@tiptop.review'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tiptop.review'

// ============================================================
// WORKER EMAILS
// ============================================================

/**
 * Send welcome email when worker creates account
 */
export async function sendWelcomeEmail({
  email,
  displayName,
  workerSlug,
}: {
  email: string
  displayName: string
  workerSlug: string
}) {
  const resend = getResend()
  if (!resend) return

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Welcome to TipTop!',
      html: `
        <h1>Welcome to TipTop, ${displayName}!</h1>
        <p>Your professional reputation profile is ready.</p>
        <p>Next steps:</p>
        <ol>
          <li>Add your first position (current or past job)</li>
          <li>Generate a QR code for collecting reviews</li>
          <li>Start building your portable reputation</li>
        </ol>
        <p><a href="${APP_URL}/dashboard" style="background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Get Started</a></p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          TipTop.review — Your reputation travels with you.
        </p>
      `,
    })
  } catch (error) {
    console.error('Failed to send welcome email:', error)
  }
}

/**
 * Send email when worker receives a new review
 */
export async function sendNewReviewEmail({
  workerEmail,
  workerName,
  companyName,
  positionTitle,
  reviewerName,
  rating,
  comment,
}: {
  workerEmail: string
  workerName: string
  companyName: string
  positionTitle: string
  reviewerName: string
  rating: number
  comment: string | null
}) {
  const resend = getResend()
  if (!resend) return

  const stars = '⭐'.repeat(rating)

  try {
    await resend.emails.send({
      from: FROM,
      to: workerEmail,
      subject: `New ${rating}-star review from ${reviewerName}`,
      html: `
        <h1>New Review Received!</h1>
        <p>Hi ${workerName},</p>
        <p>${reviewerName} left you a review for your position as <strong>${positionTitle}</strong> at <strong>${companyName}</strong>.</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 24px; margin: 0 0 10px 0;">${stars}</p>
          ${comment ? `<p style="color: #374151; font-style: italic;">"${comment}"</p>` : ''}
        </div>
        <p><a href="${APP_URL}/dashboard/reviews" style="background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View All Reviews</a></p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          TipTop.review — Your reputation travels with you.
        </p>
      `,
    })
  } catch (error) {
    console.error('Failed to send new review email:', error)
  }
}

// ============================================================
// POSITION VERIFICATION EMAILS
// ============================================================

/**
 * Send email verification link for position
 */
export async function sendPositionVerificationEmail({
  email,
  workerName,
  companyName,
  positionTitle,
  positionId,
}: {
  email: string
  workerName: string
  companyName: string
  positionTitle: string
  positionId: string
}) {
  const resend = getResend()
  if (!resend) return

  const token = generateVerificationToken(positionId)
  const verificationUrl = `${APP_URL}/verify-position?id=${positionId}&token=${encodeURIComponent(token)}`

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Verify your position at ${companyName}`,
      html: `
        <h1>Verify Your Position</h1>
        <p>Hi ${workerName},</p>
        <p>Please verify your position as <strong>${positionTitle}</strong> at <strong>${companyName}</strong> on TipTop.review.</p>
        <p>Click the button below to confirm your employment:</p>
        <p><a href="${verificationUrl}" style="background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Verify Position</a></p>
        <p style="color: #6b7280; font-size: 14px;">
          Once verified, your QR code will be activated and you can start collecting reviews.
        </p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          TipTop.review — Your reputation travels with you.
        </p>
      `,
    })
  } catch (error) {
    console.error('Failed to send position verification email:', error)
  }
}

/**
 * Send HR approval request
 */
export async function sendHRApprovalRequest({
  hrEmail,
  workerName,
  companyName,
  positionTitle,
  positionId,
  startDate,
}: {
  hrEmail: string
  workerName: string
  companyName: string
  positionTitle: string
  positionId: string
  startDate: string
}) {
  const resend = getResend()
  if (!resend) return

  const token = generateVerificationToken(positionId)
  const approveUrl = `${APP_URL}/hr/approve?id=${positionId}&token=${encodeURIComponent(token)}&action=approve`
  const denyUrl = `${APP_URL}/hr/approve?id=${positionId}&token=${encodeURIComponent(token)}&action=deny`

  try {
    await resend.emails.send({
      from: FROM,
      to: hrEmail,
      subject: `Employment Verification Request for ${workerName}`,
      html: `
        <h1>Employment Verification Request</h1>
        <p>${workerName} has listed themselves as a <strong>${positionTitle}</strong> at <strong>${companyName}</strong> on TipTop.review.</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Employee:</strong> ${workerName}</p>
          <p><strong>Position:</strong> ${positionTitle}</p>
          <p><strong>Start Date:</strong> ${startDate}</p>
        </div>
        <p>Please verify this employment:</p>
        <p>
          <a href="${approveUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-right: 10px;">Approve</a>
          <a href="${denyUrl}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Deny</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          If you did not expect this request, please contact us immediately at support@tiptop.review.
        </p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          TipTop.review — Professional reputation verification platform.
        </p>
      `,
    })
  } catch (error) {
    console.error('Failed to send HR approval request:', error)
  }
}

// ============================================================
// COMPANY VERIFICATION EMAILS
// ============================================================

/**
 * Send confirmation when company submits for verification
 */
export async function sendCompanyVerificationConfirmation({
  email,
  companyName,
}: {
  email: string
  companyName: string
}) {
  const resend = getResend()
  if (!resend) return

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Verification request received for ${companyName}`,
      html: `
        <h1>Verification Request Received</h1>
        <p>Thank you for submitting <strong>${companyName}</strong> for verification on TipTop.review.</p>
        <p>We will review your request within 2-3 business days and notify you of the outcome.</p>
        <p>Once verified, your employees will be able to instantly verify their positions using their company email addresses.</p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          TipTop.review — Your reputation travels with you.
        </p>
      `,
    })
  } catch (error) {
    console.error('Failed to send company verification confirmation:', error)
  }
}

/**
 * Notify admin of new verification request
 */
export async function notifyAdminNewVerificationRequest({
  companyName,
  requestedDomain,
  submittedBy,
}: {
  companyName: string
  requestedDomain: string
  submittedBy: string
}) {
  const resend = getResend()
  if (!resend) return

  const adminEmail = process.env.ADMIN_EMAIL || FROM

  try {
    await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `New company verification request: ${companyName}`,
      html: `
        <h1>New Verification Request</h1>
        <p><strong>${companyName}</strong> has been submitted for verification.</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Company:</strong> ${companyName}</p>
          <p><strong>Requested Domain:</strong> ${requestedDomain}</p>
          <p><strong>Submitted By:</strong> ${submittedBy}</p>
        </div>
        <p><a href="${APP_URL}/admin/verifications" style="background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Review Request</a></p>
      `,
    })
  } catch (error) {
    console.error('Failed to notify admin:', error)
  }
}

/**
 * Send approval notification to company
 */
export async function sendVerificationApproved({
  email,
  companyName,
  emailDomain,
}: {
  email: string
  companyName: string
  emailDomain: string | null
}) {
  const resend = getResend()
  if (!resend) return

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `${companyName} has been verified on TipTop!`,
      html: `
        <h1>Company Verified!</h1>
        <p>Congratulations! <strong>${companyName}</strong> has been verified on TipTop.review.</p>
        ${emailDomain ? `
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;">
              <strong>Email Domain Enabled:</strong> Employees with @${emailDomain} email addresses can now instantly verify their positions.
            </p>
          </div>
        ` : ''}
        <p>Your employees can now add positions at your company and start building their professional reputations.</p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          TipTop.review — Your reputation travels with you.
        </p>
      `,
    })
  } catch (error) {
    console.error('Failed to send verification approved email:', error)
  }
}

/**
 * Send denial notification to company
 */
export async function sendVerificationDenied({
  email,
  companyName,
  reason,
}: {
  email: string
  companyName: string
  reason: string
}) {
  const resend = getResend()
  if (!resend) return

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Update on your verification request for ${companyName}`,
      html: `
        <h1>Verification Request Update</h1>
        <p>Thank you for submitting <strong>${companyName}</strong> for verification on TipTop.review.</p>
        <p>Unfortunately, we were unable to verify your company at this time.</p>
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b;">
            <strong>Reason:</strong> ${reason}
          </p>
        </div>
        <p>If you have questions or would like to provide additional information, please reply to this email.</p>
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          TipTop.review — Your reputation travels with you.
        </p>
      `,
    })
  } catch (error) {
    console.error('Failed to send verification denied email:', error)
  }
}
