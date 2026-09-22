// Exact goal wording and category groups from the LVAEP FY 2026-2027 form.
export const achievementGroups = [
  {
    category: 'Economic', heading: 'A. Economic',
    goals: ['*Enter Employment', '*Retain Employment', 'Leave public assistance']
  },
  {
    category: 'Educational', heading: 'B. Educational',
    goals: [
      'Achieve work-based project learner goal',
      '*Enter Occupational Skills Training Program',
      '*Enter Postsecondary Education',
      '*Obtain High School Diploma'
    ]
  },
  {
    category: 'Family', heading: 'C. Family',
    goals: [
      'Help more frequently with school',
      "Increase contact with child(ren)'s teachers",
      "More involvement in child(ren)'s school activities",
      'Purchase books or magazines',
      'Read to child(ren)',
      'Visit the library (with/for child(ren))'
    ]
  },
  {
    category: 'Societal/Community', heading: 'D. Societal/Community',
    goals: [
      '*Obtain citizenship', 'Achieve civics skills',
      'Increase involvement in community activities', 'Vote or register to vote'
    ]
  }
]

// Ignore case and extra spaces when checking for obvious duplicates.
export function normalizeText(value) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  // UTC prevents a date-only value from shifting days in the local timezone.
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isValidSession(session) {
  return session && isValidDate(session.date) &&
    session.hours !== null && String(session.hours).trim() !== '' &&
    Number.isFinite(Number(session.hours)) && Number(session.hours) >= 0
}
