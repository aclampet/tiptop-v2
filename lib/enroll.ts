/** SessionStorage key for 3-scene enroll data (anonymous). */
export const ENROLL_STORAGE_KEY = 'tiptop_enroll'

export type EnrollData = {
  name: string
  position: string
  location: string
}

/** MVP: suggest standardized titles from free-text (simple heuristic). */
const NORMALIZED_TITLES = [
  'Bartender',
  'Server',
  'Barber',
  'Stylist',
  'Chef',
  'Cook',
  'Line Cook',
  'Manager',
  'Supervisor',
  'Concierge',
  'Front Desk',
  'Receptionist',
  'Contractor',
  'Technician',
  'Driver',
  'Delivery',
  'Sales Associate',
  'Cashier',
  'Host',
  'Hostess',
  'Caretaker',
  'Cleaner',
  'Security',
  'Personal Trainer',
  'Instructor',
]

export function suggestTitles(freeText: string): string[] {
  const lower = freeText.toLowerCase().trim()
  if (!lower) return NORMALIZED_TITLES.slice(0, 8)
  const matched = NORMALIZED_TITLES.filter((t) => t.toLowerCase().includes(lower) || lower.includes(t.toLowerCase()))
  const rest = NORMALIZED_TITLES.filter((t) => !matched.includes(t))
  return [...matched, ...rest].slice(0, 10)
}
