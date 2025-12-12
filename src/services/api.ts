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
  itinId: string
  status: string
  meta: CreateItineraryPayload & { [k: string]: any }
  plan: any
}

export interface AddPOIPayload {
  poiId: string
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
  roles?: string[]
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

// Auth token management
const AUTH_TOKEN_KEY = 'fika_auth_token'

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Auth types
export interface SignupPayload {
  email: string
  password: string
  username?: string
  name?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  username: string | null
  name: string | null
  avatar: string | null
  createdAt: string
}

export interface AuthResponse {
  status: string
  token: string
  user: User
}

// Auth API functions
export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const resp = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Signup failed' }))
    throw new Error(typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail))
  }
  const data = await resp.json()
  if (data.token) {
    setAuthToken(data.token)
  }
  return data
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const resp = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({ detail: 'Login failed' }))
    throw new Error(typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail))
  }
  const data = await resp.json()
  if (data.token) {
    setAuthToken(data.token)
  }
  return data
}

export async function logout(): Promise<void> {
  const token = getAuthToken()
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
      })
    } catch (e) {
      console.error('logout error', e)
    }
  }
  clearAuthToken()
}

export async function getMe(): Promise<User | null> {
  const token = getAuthToken()
  if (!token) return null

  try {
    const resp = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...getAuthHeaders() },
    })
    if (!resp.ok) {
      if (resp.status === 401) {
        clearAuthToken()
      }
      return null
    }
    return await resp.json()
  } catch (e) {
    console.error('getMe error', e)
    return null
  }
}

export async function updateProfile(updates: { name?: string; avatar?: string }): Promise<User | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updates),
    })
    if (!resp.ok) throw new Error('Failed to update profile')
    return await resp.json()
  } catch (e) {
    console.error('updateProfile error', e)
    return null
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    return resp.ok
  } catch (e) {
    console.error('changePassword error', e)
    return false
  }
}

export async function createItinerary(payload: CreateItineraryPayload): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload as any),
    })
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ detail: 'Failed to create itinerary' }))
      const errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)
      throw new Error(errorMessage)
    }
    const data = await resp.json()
    return data
  } catch (e) {
    console.error('createItinerary error', e)
    throw e
  }
}

export async function getItinerary(chatId: string): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(addCacheBuster(`${API_BASE_URL}/itinerary/${chatId}`), {
      cache: 'no-store',
      headers: { ...noCacheHeaders, ...getAuthHeaders() },
    })
    if (!resp.ok) throw new Error('Failed to load itinerary')
    const data = await resp.json()
    return data
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
      headers: { ...noCacheHeaders, ...getAuthHeaders() },
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
      headers: { ...noCacheHeaders, ...getAuthHeaders() },
    })
    if (!resp.ok) throw new Error('Failed to list itineraries')
    const data = await resp.json()
    return Array.isArray(data) ? data : data
  } catch (e) {
    console.error('listItineraries error', e)
    return null
  }
}

export async function addPOIToItinerary(chatId: string, payload: AddPOIPayload): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/add-poi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    })
    return resp.ok
  } catch (e) {
    console.error('addPOIToItinerary error', e)
    return false
  }
}

export async function reorderItineraryStops(
  chatId: string,
  dayIndex: number,
  poiIds: string[]
): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ dayIndex: dayIndex, poiIds: poiIds }),
    })
    if (!resp.ok) throw new Error('Failed to reorder stops')
    const data = await resp.json()
    return data
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        poiId: poiId,
        dayIndex: dayIndex,
        startTime: startTime,
        endTime: endTime,
        allDay: allDay,
      }),
    })
    if (!resp.ok) throw new Error('Failed to schedule POI')
    const data = await resp.json()
    return data
  } catch (e) {
    console.error('schedulePOI error', e)
    return null
  }
}

export async function deletePOIFromItinerary(chatId: string, poiId: string): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/poi/${poiId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    })
    if (!resp.ok) throw new Error('Failed to delete POI')
    const data = await resp.json()
    return data
  } catch (e) {
    console.error('deletePOIFromItinerary error', e)
    return null
  }
}

export type RecomputeMode = 'full' | 'partial' | 'single_day'

export interface RecomputeOptions {
  pacing?: string
  mealsRequired?: number
}

export async function recomputeItinerary(
  chatId: string,
  mode: RecomputeMode,
  dayIndex?: number,
  options?: RecomputeOptions
): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/recompute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        mode,
        day_index: dayIndex,
        options: options
          ? {
              pacing: options.pacing,
              meals_required: options.mealsRequired,
            }
          : {},
      }),
    })
    if (!resp.ok) throw new Error('Failed to recompute itinerary')
    const data = await resp.json()
    return data
  } catch (e) {
    console.error('recomputeItinerary error', e)
    return null
  }
}

export async function updateItineraryMeta(
  chatId: string,
  metaUpdates: Record<string, any>
): Promise<CreatedItinerary | null> {
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(metaUpdates),
    })

    if (!resp.ok) {
      // Fallback: if endpoint doesn't exist, return the updated data locally
      console.warn('update-meta endpoint not available, using local update')
      return updatedItinerary
    }

    const data = await resp.json()
    return data
  } catch (e) {
    console.error('updateItineraryMeta error', e)
    return null
  }
}

export async function fetchPOIs(
  page: number = 1,
  limit: number = DEFAULT_LIMIT,
  destination?: string | null
): Promise<PaginatedResponse> {
  try {
    const offset = (page - 1) * limit
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    if (destination) {
      params.append('destination', destination)
    }
    const response = await fetch(`${API_BASE_URL}/pois?${params}`)
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

export async function searchPOIs(
  query: string,
  page: number = 1,
  limit: number = DEFAULT_LIMIT,
  destination?: string | null,
  role?: string | null
): Promise<PaginatedResponse> {
  if (!query.trim()) {
    return fetchPOIs(page, limit, destination)
  }

  try {
    const offset = (page - 1) * limit
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    if (destination) {
      params.append('destination', destination)
    }
    if (role) {
      params.append('role', role)
    }
    const response = await fetch(`${API_BASE_URL}/search?${params}`)
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

export async function fetchPOIsByRole(
  role: string,
  page: number = 1,
  limit: number = DEFAULT_LIMIT,
  destination?: string | null
): Promise<PaginatedResponse> {
  try {
    const offset = (page - 1) * limit
    const params = new URLSearchParams({
      role: role,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    if (destination) {
      params.append('destination', destination)
    }
    const response = await fetch(`${API_BASE_URL}/pois?${params}`)
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

export async function searchPOIsByDestinationAndRole(
  destination: string,
  roles: string[],
  query?: string,
  limit: number = 5
): Promise<POI[]> {
  if (!destination || roles.length === 0) return []

  try {
    const params = new URLSearchParams({
      destination,
      roles: roles.join(','),
      limit: limit.toString(),
    })
    if (query) params.append('q', query)

    const response = await fetch(`${API_BASE_URL}/pois/search-minimal?${params}`)
    if (!response.ok) throw new Error('Failed to search POIs by destination')
    const data: ApiResponse<POI[]> = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error searching POIs by destination:', error)
    return []
  }
}
