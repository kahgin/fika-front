import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import { AddPOIToItineraryForm } from '@/components/forms/add-poi-to-itinerary-form'
import { Button } from '@/components/ui/button'
import { FallbackImage } from '@/components/ui/fallback-image'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useIsMobile } from '@/hooks/use-mobile'
import { fetchPOIs, fetchPOIsByRole, searchLocations, searchPOIs, type Location, type POI } from '@/services/api'
import { AlertCircle, CirclePlus, LoaderCircle, Search, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ButtonGroup } from '../ui/button-group'

interface SearchPanelProps {
  onPOISelect: (poi: POI) => void
  size?: 'full' | 'half'
}

const TABS = ['all', 'attraction', 'restaurant', 'hotel'] as const
type Tab = (typeof TABS)[number]
const ITEMS_PER_PAGE = 12
const LOCATION_SEARCH_MIN_LENGTH = 3
const LOCATION_SEARCH_DEBOUNCE_MS = 300

// Allowed destinations
const ALLOWED_DESTINATIONS = ['johor', 'singapore']

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
  const [destination, setDestination] = useState<string | null>(null)
  const [destinationSearch, setDestinationSearch] = useState('')
  const [destinationLocations, setDestinationLocations] = useState<Location[]>([])
  const [isSearchingDestination, setIsSearchingDestination] = useState(false)
  const [destinationOpen, setDestinationOpen] = useState(false)
  const destinationSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const destinationInputRef = useRef<HTMLInputElement | null>(null)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasSearched, currentPage, destination])

  const loadPOIs = async () => {
    setLoading(true)
    setError(null)
    try {
      let result
      if (activeTab === 'all') {
        result = await fetchPOIs(currentPage, ITEMS_PER_PAGE, destination)
      } else {
        result = await fetchPOIsByRole(activeTab, currentPage, ITEMS_PER_PAGE, destination)
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

  const performSearch = async (
    query: string,
    page: number = 1,
    dest: string | null = null,
    role: string | null = null
  ) => {
    setLoading(true)
    setError(null)
    try {
      const result = await searchPOIs(query, page, ITEMS_PER_PAGE, dest, role)
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
    const role = activeTab === 'all' ? null : activeTab
    await performSearch(searchQuery, 1, destination, role)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setHasSearched(false)
    setCurrentPage(1)
    setActiveTab('all')
    setError(null)
  }

  const handleTabChange = async (tab: Tab) => {
    setActiveTab(tab)
    setCurrentPage(1)

    if (hasSearched && searchQuery.trim()) {
      const role = tab === 'all' ? null : tab
      await performSearch(searchQuery, 1, destination, role)
    }
  }

  const handlePageChange = async (page: number) => {
    if (page < 1 || page > totalPages) return

    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (hasSearched && searchQuery.trim()) {
      const role = activeTab === 'all' ? null : activeTab
      await performSearch(searchQuery, page, destination, role)
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

  const handleDestinationSelect = (location: Location) => {
    const cityName = location.label.split(',')[0].trim().toLowerCase()

    // Validate destination
    if (!ALLOWED_DESTINATIONS.includes(cityName)) {
      toast.error('Only Johor and Singapore destinations are supported')
      return
    }

    setDestination(location.label)
    setDestinationSearch('')
    setDestinationOpen(false)
    setCurrentPage(1)
    setHasSearched(false)
  }

  const handleClearDestination = () => {
    setDestination(null)
    setDestinationSearch('')
    setCurrentPage(1)
    setHasSearched(false)
  }

  const handleDestinationClick = () => {
    // Pre-fill search with current destination and open dropdown
    const currentDest = destination || ''
    setDestinationSearch(currentDest)
    setDestination(null)
    setDestinationOpen(true)

    // Focus input after state updates
    setTimeout(() => {
      destinationInputRef.current?.focus()
    }, 0)
  }

  // Debounced destination search
  useEffect(() => {
    if (destinationSearchTimeoutRef.current) {
      clearTimeout(destinationSearchTimeoutRef.current)
    }

    if (destinationSearch.length >= LOCATION_SEARCH_MIN_LENGTH) {
      setIsSearchingDestination(true)
      destinationSearchTimeoutRef.current = setTimeout(async () => {
        const results = await searchLocations(destinationSearch)
        setDestinationLocations(results)
        setIsSearchingDestination(false)
      }, LOCATION_SEARCH_DEBOUNCE_MS)
    } else {
      setDestinationLocations([])
      setIsSearchingDestination(false)
    }

    return () => {
      if (destinationSearchTimeoutRef.current) {
        clearTimeout(destinationSearchTimeoutRef.current)
      }
    }
  }, [destinationSearch])

  const startResult = totalResults > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const endResult = Math.min(currentPage * ITEMS_PER_PAGE, totalResults)

  return (
    <div className='flex h-full w-full flex-col overflow-hidden'>
      {/* Header */}
      <div className='flex-shrink-0 border-b'>
        <form onSubmit={handleSearch}>
          <div className='flex border-b'>
            {/* Destination Select */}
            <div className='group relative flex-1 border-r'>
              {destination ? (
                <div
                  className='flex h-[52px] cursor-pointer items-center justify-between px-6'
                  onClick={handleDestinationClick}
                >
                  <span className='text-sm'>{destination.split(',')[0]}</span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClearDestination()
                    }}
                    className='h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              ) : (
                <SearchableSelect
                  inputValue={destinationSearch}
                  onInputChange={setDestinationSearch}
                  placeholder='Global'
                  minLength={LOCATION_SEARCH_MIN_LENGTH}
                  open={destinationOpen}
                  onOpenChange={setDestinationOpen}
                  isLoading={isSearchingDestination}
                  items={destinationLocations}
                  getItemKey={(l) => l.id}
                  getItemLabel={(l) => l.label}
                  onSelect={handleDestinationSelect}
                  variant='search-panel'
                />
              )}
            </div>

            {/* Search Input */}
            <div className='flex flex-[3] items-center gap-2'>
              <Input
                type='text'
                placeholder='Search...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                className='h-[52px] flex-1 border-0 px-6 shadow-none focus-visible:ring-0'
                style={{ height: '52px' }}
              />
              <div className='pr-6'>
                <Button type='submit' variant='ghost' size='icon' disabled={loading} className='h-8 w-8 flex-shrink-0'>
                  <Search className='h-4 w-4' />
                </Button>
                {hasSearched && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={handleClearSearch}
                    className='h-8 w-8 flex-shrink-0'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Tabs */}
        <ButtonGroup className='w-full place-self-center'>
          {TABS.map((tab, _) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'secondary' : 'outline'}
              size='sm'
              onClick={() => handleTabChange(tab)}
              className={`flex-1 rounded-none border-y-0 py-4 whitespace-nowrap capitalize shadow-none 
                first:border-l-0 last:border-r-0
                ${activeTab ? 'border-r' : ''}`}
              disabled={loading}
            >
              {tab}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      {/* Results Count */}
      {!loading && totalResults > 0 && (
        <div className='bg-muted/30 flex-shrink-0 border-b px-6 py-3'>
          <p className='text-muted-foreground text-sm'>
            Showing{' '}
            <span className='text-foreground font-medium'>
              {startResult}–{endResult}
            </span>{' '}
            of <span className='text-foreground font-medium'>{totalResults}</span> results
          </p>
        </div>
      )}

      {/* POI Grid */}
      <div
        className='flex-1 overflow-y-auto p-6'
        style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT + 16}px` } : undefined}
      >
        {loading ? (
          <div className='flex h-full flex-col items-center justify-center gap-3'>
            <LoaderCircle className='text-muted-foreground size-6 animate-spin' />
            <p className='text-muted-foreground text-sm'>Loading places...</p>
          </div>
        ) : error && pois.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center gap-3'>
            <AlertCircle className='text-muted-foreground size-6' />
            <p className='text-muted-foreground text-sm'>{error}</p>
            {hasSearched && (
              <Button variant='outline' size='sm' onClick={handleClearSearch}>
                Try Different Search
              </Button>
            )}
          </div>
        ) : pois.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center gap-3 text-center'>
            <p className='text-muted-foreground text-sm'>No places available</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {pois.map((poi) => (
              <div key={poi.id} className='cursor-pointer overflow-hidden' onClick={() => onPOISelect(poi)}>
                <div
                  className='relative overflow-hidden rounded-xl bg-gray-200'
                  style={{ aspectRatio: size === 'full' ? '3/2' : '1/1' }}
                >
                  <FallbackImage
                    src={poi.images?.[0] ? `${poi.images[0]}=s1500` : undefined}
                    alt={poi.name}
                    className='h-full w-full object-cover'
                  />
                  <div className='absolute top-4 right-4'>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPOI(poi)
                        setAddDialogOpen(true)
                      }}
                      className='rounded-full transition-transform hover:scale-120 hover:bg-transparent dark:hover:bg-transparent'
                      variant='ghost'
                      size='icon'
                    >
                      <CirclePlus className='size-7' color='white' fill='rgba(0,0,0,0.3)' />
                    </Button>
                  </div>
                </div>

                <div className='mt-3 space-y-1'>
                  <div className='flex items-center justify-between gap-4'>
                    <span className='line-clamp-1 truncate text-sm font-medium'>{poi.name}</span>
                    <div className='flex flex-shrink-0 items-center gap-1'>
                      <Star className='size-3 fill-current' />
                      <span className='text-sm'>{poi.rating}</span>
                    </div>
                  </div>
                  <p className='text-muted-foreground/90 line-clamp-1 text-sm'>{formatCategory(poi.category)}</p>
                  <p className='text-muted-foreground/90 line-clamp-1 text-sm'>{poi.location}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div
          className='z-50 flex-shrink-0 border-t bg-white p-4'
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
