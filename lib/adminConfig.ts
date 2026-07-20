export const PREDEFINED_ADMINS = [
  { name: 'Atul',     email: 'atulgoc@mail.com',     role: 'admin'      },
  { name: 'Debottam', email: 'debottomgoc@mail.com', role: 'admin'      },
  { name: 'Rishi',    email: 'rishigoc@mail.com',    role: 'superadmin' },
  { name: 'Bitan',    email: 'bitangoc@mail.com',    role: 'admin'      },
  { name: 'Ankit',    email: 'ankitgoc@mail.com',    role: 'admin'      },
] as const

/** Only Rishi (superadmin) can manage payments / QR / settings */
export const SUPERADMIN_EMAIL = 'rishigoc@mail.com'

export const ADMIN_PASSWORD = 'godsofcricket'

export type AdminRole = 'admin' | 'superadmin'

export const PREDEFINED_PLAYERS = [
  'Rahul',
  'Prince',
  'Soumik',
  'Harsh Kanti',
  'Debottam',
  'Rohan',
  'Atul',
  'Tatan',
  'Rishi',
  'Bitan',
  'Sonu',
  'Sumit',
  'Srijit',
  'Anand',
  'Pankaj',
  'Ayush',
  'Ankit',
  'Satyam',
  'Surojit',
  'Suraj',
  'Ashish',
  'Aadi',
  'ChotaHarsh',
] as const
