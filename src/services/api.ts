const API_BASE_URL = 'http://localhost:8000/api';
const DEFAULT_LIMIT = 12;

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

// Fetch all POIs
export async function fetchPOIs(): Promise<POI[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/pois?limit=${DEFAULT_LIMIT}`);
    if (!response.ok) throw new Error('Failed to fetch POIs');
    const data: ApiResponse<POI[]> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching POIs:', error);
    return [];
  }
}

// Search POIs
export async function searchPOIs(query: string): Promise<POI[]> {
  if (!query.trim()) {
    return fetchPOIs();
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${DEFAULT_LIMIT}`
    );
    if (!response.ok) throw new Error('Failed to search POIs');
    const data: ApiResponse<POI[]> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching POIs:', error);
    return [];
  }
}

// Get POIs by category
export async function fetchPOIsByCategory(category: string): Promise<POI[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/pois?category=${encodeURIComponent(category)}&limit=${DEFAULT_LIMIT}`
    );
    if (!response.ok) throw new Error('Failed to fetch POIs by category');
    const data: ApiResponse<POI[]> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching POIs by category:', error);
    return [];
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