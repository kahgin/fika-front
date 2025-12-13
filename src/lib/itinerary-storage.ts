import { STORAGE_KEYS } from '@/lib/constants'
import type { CreatedItinerary } from '@/services/api'

/**
 * Get the last opened itinerary ID
 */
export function getLastItineraryId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_CHAT_ID)
}

/**
 * Set the last opened itinerary ID
 */
export function setLastItineraryId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_CHAT_ID, id)
}

/**
 * Get a cached itinerary from localStorage
 */
export function getCachedItinerary(id: string): CreatedItinerary | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.CHAT_PREFIX}${id}`)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // Invalid JSON, ignore
  }
  return null
}

/**
 * Cache an itinerary to localStorage
 */
export function cacheItinerary(itinerary: CreatedItinerary): void {
  if (!itinerary.itinId) return
  try {
    localStorage.setItem(`${STORAGE_KEYS.CHAT_PREFIX}${itinerary.itinId}`, JSON.stringify(itinerary))
  } catch {
    // Storage full or other error, ignore
  }
}

/**
 * Remove a cached itinerary from localStorage
 */
export function removeCachedItinerary(id: string): void {
  localStorage.removeItem(`${STORAGE_KEYS.CHAT_PREFIX}${id}`)
}

/**
 * Clear all references to an itinerary (cache + lastChatId if matching)
 */
export function clearItineraryRefs(id: string): void {
  removeCachedItinerary(id)
  if (getLastItineraryId() === id) {
    localStorage.removeItem(STORAGE_KEYS.LAST_CHAT_ID)
  }
}

/**
 * Get all cached itineraries from localStorage
 */
export function getAllCachedItineraries(): CreatedItinerary[] {
  const itineraries: CreatedItinerary[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_KEYS.CHAT_PREFIX)) {
      try {
        const item = JSON.parse(localStorage.getItem(key) || '{}')
        if (item.itinId) {
          itineraries.push(item)
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }
  return itineraries
}

/**
 * Sync localStorage with backend data - cache new items and remove stale ones
 */
export function syncItinerariesWithBackend(backendItems: CreatedItinerary[]): void {
  const currentIds = new Set(backendItems.map((item) => item.itinId))

  // Cache all backend items
  backendItems.forEach((item) => {
    cacheItinerary(item)
  })

  // Remove stale items from localStorage
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_KEYS.CHAT_PREFIX)) {
      const id = key.replace(STORAGE_KEYS.CHAT_PREFIX, '')
      if (!currentIds.has(id)) {
        localStorage.removeItem(key)
        // Clear lastChatId if it points to deleted item
        if (getLastItineraryId() === id) {
          localStorage.removeItem(STORAGE_KEYS.LAST_CHAT_ID)
        }
      }
    }
  }
}

/**
 * Dispatch an itinerary update event for cross-component sync
 */
export function dispatchItineraryUpdate(itinerary: CreatedItinerary): void {
  window.dispatchEvent(
    new CustomEvent('itinerary-updated', {
      detail: { itineraryId: itinerary.itinId, data: itinerary },
    })
  )
}
