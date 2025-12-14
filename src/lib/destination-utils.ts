/**
 * Allowed destinations for the application
 */
export const ALLOWED_DESTINATIONS = ['johor', 'singapore'] as const

export type AllowedDestination = (typeof ALLOWED_DESTINATIONS)[number]

/**
 * Validates if a destination is allowed
 * @param destination - The destination string to validate (e.g., "Johor, Malaysia" or "Singapore")
 * @returns true if the destination is allowed, false otherwise
 */
export function isAllowedDestination(destination: string): boolean {
  const cityName = destination.split(',')[0].trim().toLowerCase()
  return ALLOWED_DESTINATIONS.includes(cityName as AllowedDestination)
}

/**
 * Extracts the city name from a destination string
 * @param destination - The full destination string (e.g., "Johor, Malaysia")
 * @returns The city name (e.g., "Johor")
 */
export function extractCityName(destination: string): string {
  return destination.split(',')[0].trim()
}
