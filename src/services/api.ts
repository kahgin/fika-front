
const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface POI {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  location: string;
  image: string;
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

// Fetch all POIs
export async function fetchPOIs(): Promise<POI[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/pois`);
    if (!response.ok) throw new Error('Failed to fetch POIs');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching POIs:', error);
    // Return mock data if backend is not running
    return [];
  }
}

// Search POIs
export async function searchPOIs(query: string): Promise<POI[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search POIs');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching POIs:', error);
    // Filter mock data if backend is not running
    return [];
  }
}

// Get POIs by category
export async function fetchPOIsByCategory(category: string): Promise<POI[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/pois?category=${encodeURIComponent(category)}`);
    if (!response.ok) throw new Error('Failed to fetch POIs by category');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching POIs by category:', error);
    // Return mock data if backend is not running
    return [];
  }
}
