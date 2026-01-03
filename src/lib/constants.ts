export const STORAGE_KEYS = {
  LAST_CHAT_ID: 'fika:lastChatId',
  CHAT_PREFIX: 'fika:chat:',
} as const

export const PACING_OPTIONS = [
  { value: 'packed', label: 'Packed', time: '9am — 12am' },
  { value: 'balanced', label: 'Balanced', time: '10am — 10pm' },
  { value: 'relaxed', label: 'Relaxed', time: '10am — 8pm' },
] as const

export const DIETARY_OPTIONS = [
  { value: 'none', label: 'No Restrictions' },
  { value: 'halal', label: 'Halal' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
] as const

export const INTEREST_OPTIONS = [
  { value: 'food_culinary', label: 'Food & Culinary' },
  { value: 'cultural_history', label: 'Cultural & History' },
  { value: 'religious_sites', label: 'Religious Sites' },
  { value: 'nature', label: 'Nature & Parks' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'family', label: 'Family Attractions' },
  { value: 'art_museums', label: 'Art & Museums' },
  { value: 'adventure', label: 'Adventure' },
] as const

export const MONTHS = [
  { value: 'september', label: 'September' },
  { value: 'october', label: 'October' },
  { value: 'november', label: 'November' },
  { value: 'december', label: 'December' },
  { value: 'january', label: 'January' },
  { value: 'february', label: 'February' },
  { value: 'march', label: 'March' },
  { value: 'april', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'june', label: 'June' },
  { value: 'july', label: 'July' },
  { value: 'august', label: 'August' },
] as const
