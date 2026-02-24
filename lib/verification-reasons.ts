/** Reason codes for position_denied */
export const POSITION_DENIED_REASONS = [
  'not_employee',
  'wrong_role_or_dates',
  'insufficient_info',
  'suspicious_or_fraud',
  'other',
] as const
export type PositionDeniedReason = (typeof POSITION_DENIED_REASONS)[number]

/** Reason codes for hr_profile_rejected */
export const HR_PROFILE_REJECTED_REASONS = [
  'email_domain_mismatch',
  'not_hr',
  'insufficient_info',
  'other',
] as const
export type HrProfileRejectedReason = (typeof HR_PROFILE_REJECTED_REASONS)[number]

const POSITION_DENIED_LABELS: Record<PositionDeniedReason, string> = {
  not_employee: 'Not an employee',
  wrong_role_or_dates: 'Wrong role or dates',
  insufficient_info: 'Insufficient information',
  suspicious_or_fraud: 'Suspicious or fraud',
  other: 'Other',
}

const HR_PROFILE_REJECTED_LABELS: Record<HrProfileRejectedReason, string> = {
  email_domain_mismatch: 'Email domain mismatch',
  not_hr: 'Not HR personnel',
  insufficient_info: 'Insufficient information',
  other: 'Other',
}

export function getReasonLabel(
  eventType: 'position_denied' | 'hr_profile_rejected',
  reasonCode: string | undefined
): string | null {
  if (!reasonCode) return null
  if (eventType === 'position_denied' && POSITION_DENIED_REASONS.includes(reasonCode as PositionDeniedReason)) {
    return POSITION_DENIED_LABELS[reasonCode as PositionDeniedReason]
  }
  if (eventType === 'hr_profile_rejected' && HR_PROFILE_REJECTED_REASONS.includes(reasonCode as HrProfileRejectedReason)) {
    return HR_PROFILE_REJECTED_LABELS[reasonCode as HrProfileRejectedReason]
  }
  return reasonCode
}
