import { useState, useEffect } from "react";
import { Search, Star, CirclePlus, Loader2 } from "lucide-react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPOIs, searchPOIs, fetchPOIsByCategory } from "@/services/api";

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

interface SearchPanelProps {
  isCollapsed: boolean;
  isHidden?: boolean;
  onPOISelect: (poi: POI) => void;
}

const TABS = ["all", "attractions", "restaurants", "hotels"] as const;
type Tab = typeof TABS[number];

export function SearchPanel({ isCollapsed, isHidden, onPOISelect }: SearchPanelProps) {
  const [pois, setPOIs] = useState<POI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Load POIs on mount and when tab changes
  useEffect(() => {
    const loadPOIs = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: POI[];
        if (activeTab === "all") {
          data = await fetchPOIs();
        } else {
          data = await fetchPOIsByCategory(activeTab);
        }
        setPOIs(data);
      } catch (err) {
        setError("Failed to load places");
        console.error(err);
        setPOIs([]);
      } finally {
        setLoading(false);
      }
    };

    if (!hasSearched) {
      loadPOIs();
    }
  }, [activeTab, hasSearched]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setHasSearched(false);
      setActiveTab("all");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const data = await searchPOIs(searchQuery);
      setPOIs(data);
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
  };

  return (
    <Panel className="bg-white dark:bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b p-6">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab && !hasSearched ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (!hasSearched) {
                    setActiveTab(tab);
                  }
                }}
                className="capitalize rounded-full whitespace-nowrap"
              >
                {tab}
              </Button>
            ))}
          </div>

          {hasSearched && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="mt-2 w-full"
            >
              Clear Search
            </Button>
          )}
        </div>

        {/* POI Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading places...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : pois.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                {hasSearched ? "No places found. Try a different search." : "No places available."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
              {pois.map((poi, index) => (
                <div
                  key={`${poi.id}-${index}`}
                  className="overflow-hidden cursor-pointer transition-transform hover:scale-105"
                  onClick={() => onPOISelect(poi)}
                >
                  <div className="relative">
                    <img
                      src={poi.image}
                      alt={poi.name}
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <div className="absolute top-4 right-4">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle add to itinerary
                        }}
                        style={{ all: "unset", cursor: "pointer" }}
                      >
                        <CirclePlus className="size-6" color="white" fill="rgba(0,0,0,0.3)" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{poi.name}</span>
                      <div className="flex items-center gap-1">
                        <Star className="size-3 fill-current" />
                        <span className="text-sm">{poi.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground/90">{poi.category}</p>
                    <p className="text-sm text-muted-foreground/90">{poi.location}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
