import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Star, CirclePlus, Loader2, AlertCircle, X } from "lucide-react";
import { fetchPOIs, searchPOIs, fetchPOIsByCategory, type POI } from "@/services/api";

interface SearchPanelProps {
  onPOISelect: (poi: POI) => void;
  size?: "full" | "half";
}

const TABS = ["all", "attractions", "restaurants", "hotels"] as const;
type Tab = typeof TABS[number];

const imageLoadQueue = new Map<string, Promise<void>>();
let loadingDelay = 100;

function queueImageLoad(url: string): Promise<void> {
  if (imageLoadQueue.has(url)) {
    return imageLoadQueue.get(url)!;
  }

  const promise = new Promise<void>((resolve) => {
    setTimeout(() => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    }, loadingDelay);
    
    loadingDelay += 100;
  });

  imageLoadQueue.set(url, promise);
  return promise;
}

export function SearchPanel({ 
  onPOISelect,
  size = "half",
}: SearchPanelProps) {
  const [pois, setPOIs] = useState<POI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hasSearched) {
      loadPOIs();
    }
  }, [activeTab, hasSearched]);

  useEffect(() => {
    loadingDelay = 100;
    pois.forEach((poi) => {
      if (poi.images?.[0]) {
        queueImageLoad(poi.images[0]).then(() => {
          setLoadedImages((prev) => new Set([...prev, poi.images[0]]));
        });
      }
    });
  }, [pois]);

  const loadPOIs = async () => {
    setLoading(true);
    setError(null);
    setLoadedImages(new Set());
    try {
      let data: POI[];
      if (activeTab === "all") {
        data = await fetchPOIs();
      } else {
        data = await fetchPOIsByCategory(activeTab);
      }
      setPOIs(data);
      if (data.length === 0) {
        setError("No places found in this category");
      }
    } catch (err) {
      setError("Failed to load places");
      console.error(err);
      setPOIs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setHasSearched(false);
      setActiveTab("all");
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setLoadedImages(new Set());
    try {
      const data = await searchPOIs(searchQuery);
      setPOIs(data);
      if (data.length === 0) {
        setError("No places found matching your search");
      }
    } catch (err) {
      setError("Search failed");
      console.error(err);
      setPOIs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setHasSearched(false);
    setActiveTab("all");
    setError(null);
    setLoadedImages(new Set());
  };

  const handleTabChange = (tab: Tab) => {
    if (!hasSearched) {
      setActiveTab(tab);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden border-r">
      {/* Header */}
      <div className="flex-shrink-0 border-b p-6">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full"
              disabled={loading}
            />
            {hasSearched && (
              <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full" onClick={handleClearSearch}>
                <X className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </form>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab && !hasSearched ? "default" : "outline"}
              size="sm"
              onClick={() => handleTabChange(tab)}
              className="capitalize rounded-full whitespace-nowrap shadow-none"
              disabled={hasSearched || loading}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {/* POI Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading places...</p>
          </div>
        ) : error && pois.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertCircle className="size-6 text-yellow-600" />
            <p className="text-sm text-yellow-700">{error}</p>
            {hasSearched && (
              <Button variant="outline" size="sm" onClick={handleClearSearch}>
                Try Different Search
              </Button>
            )}
          </div>
        ) : pois.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <p className="text-sm text-muted-foreground">No places available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pois.map((poi) => (
              <div
                key={poi.id}
                className="overflow-hidden cursor-pointer transition-transform hover:scale-105 active:scale-95"
                onClick={() => onPOISelect(poi)}
              >
                <div className="relative rounded-xl overflow-hidden bg-gray-200" style={{ aspectRatio: size === "full" ? "3/2" : "1/1" }}>
                  {poi.images && poi.images[0] ? (
                    <img
                      src={poi.images[0]}
                      alt={poi.name}
                      className="w-full h-full object-cover"
                      style={{
                        opacity: loadedImages.has(poi.images[0]) ? 1 : 0.5,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                      <span className="text-gray-500 text-sm">No image</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle add to itinerary
                      }}
                      className="rounded-full p-2"
                      variant="ghost"
                      size="icon"
                    >
                      <CirclePlus className="size-6" color="white" fill="rgba(0,0,0,0.3)" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium line-clamp-1 truncate">{poi.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className="size-3 fill-current" />
                      <span className="text-sm">{poi.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground/90 line-clamp-1">{poi.category}</p>
                  <p className="text-sm text-muted-foreground/90 line-clamp-1">{poi.location}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
