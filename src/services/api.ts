// api.ts
const API_BASE_URL = 'http://localhost:8000/api';
const DEFAULT_LIMIT = 24;

export interface CreateItineraryPayload {
  destination: string;
  dates: any;
  travelers: { adults: number; children: number; pets: number };
  preferences: { budget: string; pacing: string; interests: string[] };
}

export interface CreatedItinerary {
  chat_id: string;
  status: string;
  meta: CreateItineraryPayload & { [k: string]: any };
  maut: any;
}

export interface AddPOIPayload {
  poi_id: string;
  day?: number;
}

export interface ItineraryListItem {
  id: string;
  title: string;
  dates?: string;
}

export interface POI {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  location: string;
  images: string[];
  description?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  website?: string;
  googleMapsUrl?: string;
  address?: string;
  phone?: string;
  hours?: string;
  isOpenNow?: boolean;
}

interface ApiResponse<T> {
  status: string;
  source?: string;
  count?: number;
  data: T;
}

export async function createItinerary(payload: CreateItineraryPayload): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error('Failed to create itinerary');
    return await resp.json();
  } catch (e) {
    console.error('createItinerary error', e);
    return null;
  }
}

export async function getItinerary(chatId: string): Promise<CreatedItinerary | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}`);
    if (!resp.ok) throw new Error('Failed to load itinerary');
    return await resp.json();
  } catch (e) {
    console.error('getItinerary error', e);
    return null;
  }
}

export async function deleteItinerary(chatId: string): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}`, { method: 'DELETE' });
    return resp.ok;
  } catch (e) {
    console.error('deleteItinerary error', e);
    return false;
  }
}

export async function listItineraries(): Promise<ItineraryListItem[] | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itineraries`);
    if (!resp.ok) throw new Error('Failed to list itineraries');
    return await resp.json();
  } catch (e) {
    console.error('listItineraries error', e);
    return null;
  }
}

export async function addPOIToItinerary(chatId: string, payload: AddPOIPayload): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE_URL}/itinerary/${chatId}/add-poi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return resp.ok;
  } catch (e) {
    console.error('addPOIToItinerary error', e);
    return false;
  }
}

interface PaginatedResponse {
  pois: POI[];
  total: number;
}

// Fetch all POIs
export async function fetchPOIs(page: number = 1, limit: number = DEFAULT_LIMIT): Promise<PaginatedResponse> {
  try {
    const offset = (page - 1) * limit;
    const response = await fetch(`${API_BASE_URL}/pois?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Failed to fetch POIs');
    const data: ApiResponse<POI[]> = await response.json();
    return {
      pois: data.data || [],
      total: data.count || 0
    };
  } catch (error) {
    console.error('Error fetching POIs:', error);
    return { pois: [], total: 0 };
  }
}

// Search POIs
export async function searchPOIs(query: string, page: number = 1, limit: number = DEFAULT_LIMIT): Promise<PaginatedResponse> {
  if (!query.trim()) {
    return fetchPOIs(page, limit);
  }

  try {
    const offset = (page - 1) * limit;
    const response = await fetch(
      `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error('Failed to search POIs');
    const data: ApiResponse<POI[]> = await response.json();
    return {
      pois: data.data || [],
      total: data.count || 0
    };
  } catch (error) {
    console.error('Error searching POIs:', error);
    return { pois: [], total: 0 };
  }
}

// Get POIs by category
export async function fetchPOIsByCategory(category: string, page: number = 1, limit: number = DEFAULT_LIMIT): Promise<PaginatedResponse> {
  try {
    const offset = (page - 1) * limit;
    const response = await fetch(
      `${API_BASE_URL}/pois?category=${encodeURIComponent(category)}&limit=${limit}&offset=${offset}`
    );
    if (!response.ok) throw new Error('Failed to fetch POIs by category');
    const data: ApiResponse<POI[]> = await response.json();
    return {
      pois: data.data || [],
      total: data.count || 0
    };
  } catch (error) {
    console.error('Error fetching POIs by category:', error);
    return { pois: [], total: 0 };
  }
}

// Get POI by ID (for detailed view)
export async function fetchPOIById(poiId: string): Promise<POI | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/pois/${poiId}`);
    if (!response.ok) throw new Error('Failed to fetch POI details');
    const data: ApiResponse<POI> = await response.json();
    return data.data || null;
  } catch (error) {
    console.error(`Error fetching POI ${poiId}:`, error);
    return null;
  }
}