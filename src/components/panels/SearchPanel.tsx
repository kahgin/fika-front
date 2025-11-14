import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AddPOIToItineraryForm } from "@/components/forms/add-poi-to-itinerary-form";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Search, Star, CirclePlus, Loader2, AlertCircle, X } from "lucide-react";
import { fetchPOIs, searchPOIs, fetchPOIsByCategory, type POI } from "@/services/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { BOTTOM_NAV_HEIGHT } from "@/components/bottom-nav";

interface SearchPanelProps {
  onPOISelect: (poi: POI) => void;
  size?: "full" | "half";
}

const TABS = ["all", "attractions", "restaurants", "hotels"] as const;
type Tab = typeof TABS[number];
const ITEMS_PER_PAGE = 12;


export default function SearchPanel({
  onPOISelect,
  size = "half",
}: SearchPanelProps) {
  const [pois, setPOIs] = useState<POI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const isMobile = useIsMobile();

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);

  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    if (!hasSearched) {
      loadPOIs();
    }
  }, [activeTab, hasSearched, currentPage]);

  const loadPOIs = async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (activeTab === "all") {
        result = await fetchPOIs(currentPage, ITEMS_PER_PAGE);
      } else {
        result = await fetchPOIsByCategory(activeTab, currentPage, ITEMS_PER_PAGE);
      }
      setPOIs(result.pois);
      setTotalResults(result.total);
      if (result.pois.length === 0) {
        setError("No places found in this category");
      }
    } catch (err) {
      setError("Failed to load places");
      console.error(err);
      setPOIs([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (query: string, page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchPOIs(query, page, ITEMS_PER_PAGE);
      setPOIs(result.pois);
      setTotalResults(result.total);
      if (result.pois.length === 0) {
        setError("No places found matching your search");
      }
    } catch (err) {
      setError("Search failed");
      console.error(err);
      setPOIs([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setHasSearched(false);
      setCurrentPage(1);
      setActiveTab("all");
      setError(null);
      return;
    }

    setHasSearched(true);
    setCurrentPage(1);
    await performSearch(searchQuery, 1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setHasSearched(false);
    setCurrentPage(1);
    setActiveTab("all");
    setError(null);
    loadPOIs();
  };

  const handleTabChange = (tab: Tab) => {
    if (!hasSearched) {
      setActiveTab(tab);
      setCurrentPage(1);
    }
  };

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (hasSearched && searchQuery.trim()) {
      await performSearch(searchQuery, page);
    } else {
      await loadPOIs();
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }

    return pages;
  };

  const startResult = totalResults > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, totalResults);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b p-6">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <InputGroup>
              <InputGroupInput type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} disabled={loading} />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              {hasSearched && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-sm" onClick={handleClearSearch}>
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
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

      {/* Results Count */}
      {!loading && totalResults > 0 && (
        <div className="flex-shrink-0 px-6 py-3 border-b bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startResult}–{endResult}</span> of{" "}
            <span className="font-medium text-foreground">{totalResults}</span> results
          </p>
        </div>
      )}

      {/* POI Grid */}
      <div 
        className="flex-1 overflow-y-auto p-6"
        style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT + 16}px` } : undefined}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading places...</p>
          </div>
        ) : error && pois.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertCircle className="size-6 text-gray-500" />
            <p className="text-sm text-gray-600">{error}</p>
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
                className="overflow-hidden cursor-pointer"
                onClick={() => onPOISelect(poi)}
              >
                <div className="relative rounded-xl overflow-hidden bg-gray-200" style={{ aspectRatio: size === "full" ? "3/2" : "1/1" }}>
                  {poi.images && poi.images[0] ? (
                    <img
                      referrerPolicy="no-referrer"
                      src={poi.images[0]}
                      alt={poi.name}
                      className="w-full h-full object-cover"
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
                        setSelectedPOI(poi);
                        setAddDialogOpen(true);
                      }}
                      className="rounded-full transition-transform hover:scale-120 hover:bg-transparent dark:hover:bg-transparent"
                      variant="ghost"
                      size="icon"
                    >
                      <CirclePlus className="size-7" color="white" fill="rgba(0,0,0,0.3)" />
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
                  <p className="text-sm text-muted-foreground/90 line-clamp-1">{formatCategory(poi.category)}</p>
                  <p className="text-sm text-muted-foreground/90 line-clamp-1">{poi.location}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div 
          className="flex-shrink-0 border-t p-4 bg-white z-50"
          style={isMobile ? { 
            position: 'fixed',
            bottom: `${BOTTOM_NAV_HEIGHT}px`,
            left: 0,
            right: 0
          } : undefined}
        >
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
              </PaginationItem>

              {getPageNumbers().map((page, idx) => (
                <PaginationItem key={idx}>
                  {page === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      <AddPOIToItineraryForm
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        poi={selectedPOI}
      />
    </div>
  );
}