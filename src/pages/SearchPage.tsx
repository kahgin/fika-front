
import { useState, useEffect } from "react";
import { SearchPanel } from "@/components/panels/SearchPanel";
import { POIPanel } from "@/components/panels/POIPanel";
import { fetchPOIs, searchPOIs, fetchPOIsByCategory, type POI } from "@/services/api";

export default function SearchPage() {
  // State management - Page is the single source of truth
  const [pois, setPois] = useState<POI[]>([]);
  const [filteredPois, setFilteredPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<'attractions' | 'restaurants' | 'hotels'>('attractions');
  
  // UI State
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isDetailFullWidth, setIsDetailFullWidth] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load initial POIs on mount
  useEffect(() => {
    loadPOIs();
  }, []);

  // Filter POIs when category changes
  useEffect(() => {
    filterByCategory(activeCategory);
  }, [activeCategory, pois]);

  // Load POIs from backend
  const loadPOIs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPOIs();
      setPois(data);
      setFilteredPois(data);
    } catch (err) {
      setError('Failed to load places. Using offline data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredPois(pois);
      return;
    }

    setLoading(true);
    try {
      const results = await searchPOIs(query);
      setFilteredPois(results);
    } catch (err) {
      console.error('Search error:', err);
      // Fallback to local filtering
      const filtered = pois.filter(poi =>
        poi.name.toLowerCase().includes(query.toLowerCase()) ||
        poi.category.toLowerCase().includes(query.toLowerCase()) ||
        poi.location.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPois(filtered);
    } finally {
      setLoading(false);
    }
  };

  // Filter by category
  const filterByCategory = async (category: string) => {
    setLoading(true);
    try {
      const results = await fetchPOIsByCategory(category);
      setFilteredPois(results);
    } catch (err) {
      // Fallback to local filtering
      const categoryMap: Record<string, string> = {
        'attractions': 'Attraction',
        'restaurants': 'Restaurant',
        'hotels': 'Hotel'
      };
      const filtered = pois.filter(poi =>
        poi.category === categoryMap[category] || 
        (category === 'attractions' && poi.category === 'Park')
      );
      setFilteredPois(filtered);
    } finally {
      setLoading(false);
    }
  };

  // Handle category change
  const handleCategoryChange = (category: 'attractions' | 'restaurants' | 'hotels') => {
    setActiveCategory(category);
    setSearchQuery(''); // Clear search when changing category
  };

  // Handle POI selection
  const handlePOISelect = (poi: POI) => {
    setSelectedPOI(poi);
    setIsDetailFullWidth(false);
  };

  // Handle closing POI detail
  const handleClosePOI = () => {
    setSelectedPOI(null);
    setIsDetailFullWidth(false);
  };

  // Toggle full width detail view
  const handleToggleFullWidth = () => {
    setIsDetailFullWidth(!isDetailFullWidth);
  };

  return (
    <div className="h-screen w-full">
      {/* Show loading/error banner */}
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 p-2 text-center text-sm text-yellow-800 z-50">
          {error}
        </div>
      )}

      {/* Desktop layout */}
      <div className="hidden lg:flex h-full overflow-hidden">
        <SearchPanel
          onPOISelect={handlePOISelect}
          isCollapsed={!!selectedPOI && !isDetailFullWidth}
          isHidden={!!selectedPOI && isDetailFullWidth}
        />
        {selectedPOI && (
          <POIPanel
            poi={selectedPOI}
            isFullWidth={isDetailFullWidth}
            onClose={handleClosePOI}
            onToggleFullWidth={handleToggleFullWidth}
          />
        )}
      </div>

      {/* Mobile & Tablet layout */}
      <div className="flex lg:hidden h-full w-full relative">
        <div
          className={
            "fixed inset-0 z-40 transition-opacity duration-300" +
            (selectedPOI ? " bg-black/40 opacity-100 pointer-events-auto" : " opacity-0 pointer-events-none")
          }
          aria-hidden="true"
          onClick={handleClosePOI}
        />

        <div
          className={
            "fixed inset-0 z-50 transition-transform duration-300 ease-in-out h-screen flex flex-col" +
            (selectedPOI ? " pointer-events-auto" : " pointer-events-none")
          }
          style={{
            transform: selectedPOI ? "translateY(0%)" : "translateY(100%)"
          }}
        >
          <div className="bg-white dark:bg-background shadow-2xl border-t border-gray-200 overflow-hidden flex-1 flex flex-col h-full">
            {selectedPOI && (
              <div className="flex-1 flex flex-col h-full">
                <POIPanel
                  poi={selectedPOI}
                  isFullWidth={true}
                  onClose={handleClosePOI}
                />
              </div>
            )}
          </div>
        </div>

        {!selectedPOI && (
          <div className="w-full h-full">
            <SearchPanel
              onPOISelect={handlePOISelect}
              isCollapsed={false}
              isHidden={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}