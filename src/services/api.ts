const API_BASE_URL = import.meta.env.VITE_FIKA_URL 

const DEFAULT_LIMIT = 12

export interface CreateItineraryPayload {
  title?: string
  destination: string
  dates: {
    type: 'specific' | 'flexible'
    days?: number
    preferredMonth?: string | null
    startDate?: string | null
    endDate?: string | null
  }
  travelers: { adults: number; children: number; pets: number }
  preferences: { budget: string; pacing: string; interests: string[] }
}

export interface CreatedItinerary {
  itin_id: string
  status: string
  meta: CreateItineraryPayload & { [k: string]: any }
  plan: any
}

export interface AddPOIPayload {
  poi_id: string
  day?: number
}

export interface POI {
  id: string
  name: string
  category: string
  rating: number
  reviewCount: number
  location: string
  images: string[]
  role?: string
  poiRoles?: string[]
  themes?: string[]
  description?: string
  coordinates?: {
    lat: number
    lng: number
  }
  website?: string
  googleMapsUrl?: string
  address?: string
  phone?: string
  openHours?: any
  priceLevel?: string
}

interface ApiResponse<T> {
  status: string
  source?: string
  count?: number
  data: T
}

interface PaginatedResponse {
  pois: POI[]
  total: number
}

const addCacheBuster = (url: string): string => `${url}?_=${Date.now()}`

const noCacheHeaders = {
  'Cache-Control': 'no-cache',
}

export async function createItinerary(payload: CreateItineraryPayload): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) throw new Error('Failed to create itinerary')
    return await resp.json()
  } catch (e) {
    console.error('createItinerary error', e)
    return null
  }
}

export async function getItinerary(chatId: string): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(addCacheBuster(`${API_BASE_URL}/itinerary/${chatId}`), {
      cache: 'no-store',
      headers: noCacheHeaders,
    })
    if (!resp.ok) throw new Error('Failed to load itinerary')
    return await resp.json()
  } catch (e) {
    console.error('getItinerary error', e)
    return null
  }
}

export async function deleteItinerary(chatId: string): Promise<boolean> {
  try {
    const resp = await fetch(addCacheBuster(`${API_BASE_URL}/itinerary/${chatId}`), {
      method: 'DELETE',
      cache: 'no-store',
      headers: noCacheHeaders,
    })
    return resp.ok
  } catch (e) {
    console.error('deleteItinerary error', e)
    return false
  }
}

export async function listItineraries(): Promise<CreatedItinerary[] | null> {
  try {
    const resp = await fetch(addCacheBuster(`${API_BASE_URL}/itineraries`), {
      cache: 'no-store',
      headers: noCacheHeaders,
    })
    if (!resp.ok) throw new Error('Failed to list itineraries')
    return await resp.json()
  } catch (e) {
    console.error('listItineraries error', e)
    return null
  }
}

export async function addPOIToItinerary(chatId: string, payload: AddPOIPayload): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/add-poi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return resp.ok
  } catch (e) {
    console.error('addPOIToItinerary error', e)
    return false
  }
}

export async function reorderItineraryStops(chatId: string, dayIndex: number, poiIds: string[]): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_index: dayIndex, poi_ids: poiIds }),
    })
    if (!resp.ok) throw new Error('Failed to reorder stops')
    return await resp.json()
  } catch (e) {
    console.error('reorderItineraryStops error', e)
    return null
  }
}

export async function schedulePOI(
  chatId: string,
  poiId: string,
  dayIndex: number,
  startTime?: string,
  endTime?: string,
  allDay?: boolean
): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/schedule-poi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poi_id: poiId,
        day_index: dayIndex,
        start_time: startTime,
        end_time: endTime,
        all_day: allDay,
      }),
    })
    if (!resp.ok) throw new Error('Failed to schedule POI')
    return await resp.json()
  } catch (e) {
    console.error('schedulePOI error', e)
    return null
  }
}

export async function deletePOIFromItinerary(chatId: string, poiId: string): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/poi/${poiId}`, {
      method: 'DELETE',
    })
    if (!resp.ok) throw new Error('Failed to delete POI')
    return await resp.json()
  } catch (e) {
    console.error('deletePOIFromItinerary error', e)
    return null
  }
}

export async function updateItineraryMeta(chatId: string, metaUpdates: Record<string, any>): Promise<CreatedItinerary | null> {
  try {
    const currentItinerary = await getItinerary(chatId)
    if (!currentItinerary) throw new Error('Failed to load current itinerary')

    const updatedItinerary = {
      ...currentItinerary,
      meta: {
        ...currentItinerary.meta,
        ...metaUpdates,
      },
    }

    // Save updated itinerary by persisting to backend
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/update-meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaUpdates),
    })

    if (!resp.ok) {
      // Fallback: if endpoint doesn't exist, return the updated data locally
      console.warn('update-meta endpoint not available, using local update')
      return updatedItinerary
    }

    return await resp.json()
  } catch (e) {
    console.error('updateItineraryMeta error', e)
    return null
  }
}

export async function fetchPOIs(page: number = 1, limit: number = DEFAULT_LIMIT): Promise<PaginatedResponse> {
  try {
    const offset = (page - 1) * limit
    const response = await fetch(`${API_BASE_URL}/pois?limit=${limit}&offset=${offset}`)
    if (!response.ok) throw new Error('Failed to fetch POIs')
    const data: ApiResponse<POI[]> = await response.json()
    return {
      pois: data.data || [],
      total: data.count || 0,
    }
  } catch (error) {
    console.error('Error fetching POIs:', error)
    return { pois: [], total: 0 }
  }
}

export async function searchPOIs(query: string, page: number = 1, limit: number = DEFAULT_LIMIT): Promise<PaginatedResponse> {
  if (!query.trim()) {
    return fetchPOIs(page, limit)
  }

  try {
    const offset = (page - 1) * limit
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`)
    if (!response.ok) throw new Error('Failed to search POIs')
    const data: ApiResponse<POI[]> = await response.json()
    return {
      pois: data.data || [],
      total: data.count || 0,
    }
  } catch (error) {
    console.error('Error searching POIs:', error)
    return { pois: [], total: 0 }
  }
}

export async function fetchPOIsByRole(role: string, page: number = 1, limit: number = DEFAULT_LIMIT): Promise<PaginatedResponse> {
  try {
    const offset = (page - 1) * limit
    const response = await fetch(`${API_BASE_URL}/pois?role=${encodeURIComponent(role)}&limit=${limit}&offset=${offset}`)
    if (!response.ok) throw new Error('Failed to fetch POIs by role')
    const data: ApiResponse<POI[]> = await response.json()
    return {
      pois: data.data || [],
      total: data.count || 0,
    }
  } catch (error) {
    console.error('Error fetching POIs by role:', error)
    return { pois: [], total: 0 }
  }
}

export async function fetchPOIById(poiId: string): Promise<POI | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/pois/${poiId}`)
    if (!response.ok) throw new Error('Failed to fetch POI details')
    const data: ApiResponse<POI> = await response.json()
    return data.data || null
  } catch (error) {
    console.error(`Error fetching POI ${poiId}:`, error)
    return null
  }
}

export interface Location {
  id: string
  name: string
  label: string
  kind: string
  country_iso2: string
  parent_id: string | null
  admin_level: number
}

// Auth functions (placeholder - backend not implemented yet)
export interface LoginPayload {
  email: string
  password: string
}

export interface SignupPayload {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: {
    id: string
    email: string
    name: string
  }
  token?: string
  message?: string
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  try {
    // TODO: Replace with actual backend endpoint when available
    // const resp = await fetch(`${API_BASE_URL}/auth/login`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // })
    // if (!resp.ok) throw new Error('Login failed')
    // return await resp.json()

    // Temporary mock response
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Store mock token
    const mockToken = btoa(JSON.stringify({ email: payload.email, timestamp: Date.now() }))
    localStorage.setItem('fika:auth:token', mockToken)
    localStorage.setItem(
      'fika:auth:user',
      JSON.stringify({
        id: 'mock-user-id',
        email: payload.email,
        name: payload.email.split('@')[0],
      })
    )

    return {
      success: true,
      user: {
        id: 'mock-user-id',
        email: payload.email,
        name: payload.email.split('@')[0],
      },
      token: mockToken,
    }
  } catch (e) {
    console.error('login error', e)
    return {
      success: false,
      message: 'Login failed. Please check your credentials.',
    }
  }
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  try {
    // TODO: Replace with actual backend endpoint when available
    // const resp = await fetch(`${API_BASE_URL}/auth/signup`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // })
    // if (!resp.ok) throw new Error('Signup failed')
    // return await resp.json()

    // Temporary mock response
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Store mock token
    const mockToken = btoa(JSON.stringify({ email: payload.email, timestamp: Date.now() }))
    localStorage.setItem('fika:auth:token', mockToken)
    localStorage.setItem(
      'fika:auth:user',
      JSON.stringify({
        id: 'mock-user-id',
        email: payload.email,
        name: payload.name,
      })
    )

    return {
      success: true,
      user: {
        id: 'mock-user-id',
        email: payload.email,
        name: payload.name,
      },
      token: mockToken,
    }
  } catch (e) {
    console.error('signup error', e)
    return {
      success: false,
      message: 'Signup failed. Please try again.',
    }
  }
}

export async function logout(): Promise<void> {
  localStorage.removeItem('fika:auth:token')
  localStorage.removeItem('fika:auth:user')
}

export function getCurrentUser(): { id: string; email: string; name: string } | null {
  try {
    const userStr = localStorage.getItem('fika:auth:user')
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('fika:auth:token')
}

export async function searchLocations(query: string): Promise<Location[]> {
  if (!query || query.length < 3) {
    return []
  }

  try {
    const response = await fetch(`${API_BASE_URL}/locations/search?q=${encodeURIComponent(query)}&limit=10`)
    if (!response.ok) throw new Error('Failed to search locations')
    const data: ApiResponse<Location[]> = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error searching locations:', error)
    return []
  }
}

export async function searchPOIsByDestinationAndRole(destination: string, roles: string[], query?: string, limit: number = 5): Promise<POI[]> {
  if (!destination || roles.length === 0) return []

  try {
    const params = new URLSearchParams({
      destination,
      roles: roles.join(','),
      limit: limit.toString(),
    })
    if (query) params.append('q', query)

    const response = await fetch(`${API_BASE_URL}/pois/search-by-destination?${params}`)
    if (!response.ok) throw new Error('Failed to search POIs by destination')
    const data: ApiResponse<POI[]> = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error searching POIs by destination:', error)
    return []
  }
}
