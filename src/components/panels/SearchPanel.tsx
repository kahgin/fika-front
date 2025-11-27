import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AddPOIToItineraryForm } from '@/components/forms/add-poi-to-itinerary-form'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { Search, Star, CirclePlus, LoaderCircle, AlertCircle, X } from 'lucide-react'
import { fetchPOIs, searchPOIs, fetchPOIsByCategory, type POI } from '@/services/api'
import { useIsMobile } from '@/hooks/use-mobile'
import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'

interface SearchPanelProps {
  onPOISelect: (poi: POI) => void
  size?: 'full' | 'half'
}

const TABS = ['all', 'attractions', 'restaurants', 'hotels'] as const
type Tab = (typeof TABS)[number]
const ITEMS_PER_PAGE = 12

export default function SearchPanel({ onPOISelect, size = 'half' }: SearchPanelProps) {
  const [pois, setPOIs] = useState<POI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null)
  const isMobile = useIsMobile()

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE)

  const formatCategory = (category: string) => {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  useEffect(() => {
    if (!hasSearched) {
      loadPOIs()
    }
  }, [activeTab, hasSearched, currentPage])

  const loadPOIs = async () => {
    setLoading(true)
    setError(null)
    try {
      let result
      if (activeTab === 'all') {
        result = await fetchPOIs(currentPage, ITEMS_PER_PAGE)
      } else {
        result = await fetchPOIsByCategory(activeTab, currentPage, ITEMS_PER_PAGE)
      }
      setPOIs(result.pois)
      setTotalResults(result.total)
      if (result.pois.length === 0) {
        setError('No places found in this category')
      }
    } catch (err) {
      setError('Failed to load places')
      console.error(err)
      setPOIs([])
      setTotalResults(0)
    } finally {
      setLoading(false)
    }
  }

  const performSearch = async (query: string, page: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const result = await searchPOIs(query, page, ITEMS_PER_PAGE)
      setPOIs(result.pois)
      setTotalResults(result.total)
      if (result.pois.length === 0) {
        setError('No places found matching your search')
      }
    } catch (err) {
      setError('Search failed')
      console.error(err)
      setPOIs([])
      setTotalResults(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      setHasSearched(false)
      setCurrentPage(1)
      setActiveTab('all')
      setError(null)
      return
    }

    setHasSearched(true)
    setCurrentPage(1)
    await performSearch(searchQuery, 1)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setHasSearched(false)
    setCurrentPage(1)
    setActiveTab('all')
    setError(null)
    loadPOIs()
  }

  const handleTabChange = (tab: Tab) => {
    if (!hasSearched) {
      setActiveTab(tab)
      setCurrentPage(1)
    }
  }

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages) return

    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (hasSearched && searchQuery.trim()) {
      await performSearch(searchQuery, page)
    } else {
      await loadPOIs()
    }
  }

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showEllipsis = totalPages > 7

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages)
      }
    }

    return pages
  }

  const startResult = totalResults > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, totalResults)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <InputGroup className="!focus-within:border !focus-within:ring-0 !focus-within:border-transparent h-12 rounded-none border-0 border-b px-2 !ring-0 !ring-offset-0">
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
        <div className="mb-6 flex gap-2 overflow-x-auto px-6">
          {TABS.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab && !hasSearched ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTabChange(tab)}
              className="rounded-full whitespace-nowrap capitalize shadow-none"
              disabled={hasSearched || loading}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {!loading && totalResults > 0 && (
        <div className="bg-muted/30 flex-shrink-0 border-b px-6 py-3">
          <p className="text-muted-foreground text-sm">
            Showing{' '}
            <span className="text-foreground font-medium">
              {startResult}–{endResult}
            </span>{' '}
            of <span className="text-foreground font-medium">{totalResults}</span> results
          </p>
        </div>
      )}

      {/* POI Grid */}
      <div className="flex-1 overflow-y-auto p-6" style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT + 16}px` } : undefined}>
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <LoaderCircle className="text-muted-foreground size-6 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading places...</p>
          </div>
        ) : error && pois.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <AlertCircle className="size-6 text-gray-500" />
            <p className="text-sm text-gray-600">{error}</p>
            {hasSearched && (
              <Button variant="outline" size="sm" onClick={handleClearSearch}>
                Try Different Search
              </Button>
            )}
          </div>
        ) : pois.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground text-sm">No places available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pois.map((poi) => (
              <div key={poi.id} className="cursor-pointer overflow-hidden" onClick={() => onPOISelect(poi)}>
                <div className="relative overflow-hidden rounded-xl bg-gray-200" style={{ aspectRatio: size === 'full' ? '3/2' : '1/1' }}>
                  {poi.images && poi.images[0] ? (
                    <img
                      referrerPolicy="no-referrer"
                      src={`https://picsum.photos/seed/${poi.name}/1200/900`}
                      alt={poi.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // src={`${poi.images[0]}=s1500`}
                    <div className="flex h-full w-full items-center justify-center bg-gray-300">
                      <span className="text-sm text-gray-500">No image</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPOI(poi)
                        setAddDialogOpen(true)
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
                    <span className="line-clamp-1 truncate text-sm font-medium">{poi.name}</span>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <Star className="size-3 fill-current" />
                      <span className="text-sm">{poi.rating}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground/90 line-clamp-1 text-sm">{formatCategory(poi.category)}</p>
                  <p className="text-muted-foreground/90 line-clamp-1 text-sm">{poi.location}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div
          className="z-50 flex-shrink-0 border-t bg-white p-4"
          style={
            isMobile
              ? {
                  position: 'fixed',
                  bottom: `${BOTTOM_NAV_HEIGHT}px`,
                  left: 0,
                  right: 0,
                }
              : undefined
          }
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
                    <PaginationLink onClick={() => handlePageChange(page)} isActive={currentPage === page}>
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
      <AddPOIToItineraryForm open={addDialogOpen} onOpenChange={setAddDialogOpen} poi={selectedPOI} />
    </div>
  )
}
