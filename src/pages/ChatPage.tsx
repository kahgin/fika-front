import { EmptyItinerary } from '@/components/empty-itinerary'
import ChatPanel from '@/components/panels/ChatPanel'
import ItinMapPanel from '@/components/panels/ItinMapPanel'
import ItineraryPanel from '@/components/panels/ItineraryPanel'
import POIPanel from '@/components/panels/POIPanel'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  cacheItinerary,
  clearItineraryRefs,
  dispatchItineraryUpdate,
  getCachedItinerary,
  getLastItineraryId,
} from '@/lib/itinerary-storage'
import { stripDaySuffix } from '@/lib/utils'
import { fetchPOIById, getAuthToken, getItinerary, type CreatedItinerary, type POI } from '@/services/api'
import { Map, MapPin, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

type PanelType = 'chat' | 'itinerary' | 'map'

export default function ChatPage() {
  const location = useLocation()
  const initialTab = (location.state as { initialTab?: PanelType })?.initialTab
  const [itinerary, setItinerary] = useState<CreatedItinerary | null>(null)
  const [leftPanel, setLeftPanel] = useState<PanelType>('itinerary')
  const [rightPanel, setRightPanel] = useState<PanelType>('map')
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null)
  const [loadingPoi, setLoadingPoi] = useState(false)
  const [mobileTab, setMobileTab] = useState<PanelType>(initialTab || 'itinerary')

  useEffect(() => {
    const lastId = getLastItineraryId()
    if (!lastId) {
      setItinerary(null)
      return
    }

    // For anonymous users, try localStorage first
    if (!getAuthToken()) {
      const cached = getCachedItinerary(lastId)
      if (cached) {
        setItinerary(cached)
        return
      } else {
        clearItineraryRefs(lastId)
        setItinerary(null)
        return
      }
    }

    // Load from API (authenticated users)
    getItinerary(lastId)
      .then((data) => {
        if (data) {
          setItinerary(data)
          cacheItinerary(data)
        } else {
          clearItineraryRefs(lastId)
          setItinerary(null)
        }
      })
      .catch(() => {
        clearItineraryRefs(lastId)
        setItinerary(null)
      })

    const handleItineraryUpdateEvent = (event: CustomEvent) => {
      const { itineraryId, data } = event.detail
      if (itineraryId === lastId) {
        setItinerary(data)
      }
    }

    window.addEventListener('itinerary-updated', handleItineraryUpdateEvent as EventListener)
    return () => window.removeEventListener('itinerary-updated', handleItineraryUpdateEvent as EventListener)
  }, [])

  const handleItineraryUpdate = useCallback((data: CreatedItinerary) => {
    setItinerary(data)
    if (data?.itinId) {
      cacheItinerary(data)
      dispatchItineraryUpdate(data)
    }
  }, [])

  const handleOpenPOI = async (poi: { id: string; name: string }) => {
    setLoadingPoi(true)
    try {
      const details = await fetchPOIById(poi.id)
      setSelectedPoi(
        details ||
          ({
            id: poi.id,
            name: poi.name,
            rating: 0,
            reviewCount: 0,
            location: '',
            category: '',
            images: [],
          } as POI)
      )
    } catch (error) {
      console.error('Error loading POI details:', error)
      setSelectedPoi({
        id: poi.id,
        name: poi.name,
        rating: 0,
        reviewCount: 0,
        location: '',
        category: '',
        images: [],
      } as POI)
    } finally {
      setLoadingPoi(false)
    }
  }

  const handleTabChange = (side: 'left' | 'right', panel: PanelType) => {
    if (side === 'left') {
      if (panel === rightPanel) return
      setLeftPanel(panel)
    } else {
      if (panel === leftPanel) return
      setRightPanel(panel)
    }
  }

  const renderPanel = (panel: PanelType) => {
    if (panel === 'chat') {
      return <ChatPanel />
    }

    if (panel === 'map') {
      if (!itinerary) {
        return <EmptyItinerary className='h-full' />
      }
      const items = (itinerary?.plan?.days || []).flatMap((day: any) =>
        (day?.stops || []).map((i: any) => ({
          id: stripDaySuffix(i.poiId),
          name: i.name,
          role: i.role,
          arrival: i.arrival,
          startService: i.startService,
          depart: i.depart,
          latitude: i.latitude,
          longitude: i.longitude,
        }))
      )
      return <ItinMapPanel items={items} onOpenPOI={handleOpenPOI} />
    }

    if (panel === 'itinerary') {
      if (!itinerary) {
        return <EmptyItinerary className='h-full' />
      }
      return (
        <ItineraryPanel
          className='h-full'
          data={itinerary}
          onOpenDetails={handleOpenPOI}
          onItineraryUpdate={handleItineraryUpdate}
        />
      )
    }

    return null
  }

  const renderDesktop = () => {
    const showRightPanel = Boolean(itinerary || selectedPoi)

    const leftContent = (
      <div className='flex h-full flex-col'>
        <div className='z-10 flex h-12 flex-shrink-0 items-center justify-between border-b bg-white px-4'>
          <h6 className='flex-1 truncate'>{itinerary?.meta?.title || 'Itinerary'}</h6>
          {showRightPanel && (
            <Tabs value={leftPanel} onValueChange={(value) => handleTabChange('left', value as PanelType)}>
              <TabsList className='h-8'>
                <TabsTrigger value='chat' className='px-2' disabled hidden={rightPanel === 'chat'}>
                  <MessageCircle className='h-4 w-4' />
                </TabsTrigger>
                <TabsTrigger value='itinerary' hidden={rightPanel === 'itinerary'} className='px-2'>
                  <Map className='h-4 w-4' />
                </TabsTrigger>
                <TabsTrigger value='map' hidden={rightPanel === 'map'} className='px-2'>
                  <MapPin className='h-4 w-4' />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto'>{renderPanel(leftPanel)}</div>
      </div>
    )

    const rightContent = selectedPoi ? (
      <div className='flex h-full flex-col'>
        <div className='z-10 flex h-12 flex-shrink-0 items-center justify-end border-b bg-white px-4'>
          {/* Empty header for POI panel - close button is in the panel */}
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto'>
          {loadingPoi ? (
            <div className='flex h-full items-center justify-center'>
              <div className='space-y-3 text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900'></div>
                <p className='text-muted-foreground text-sm'>Loading POI details...</p>
              </div>
            </div>
          ) : (
            <POIPanel
              poi={selectedPoi}
              size='half'
              onClose={() => setSelectedPoi(null)}
              showToggleFullWidth={false}
              showAddToTrip={false}
            />
          )}
        </div>
      </div>
    ) : (
      <div className='flex h-full flex-col'>
        <div className='z-10 flex h-12 flex-shrink-0 items-center justify-end border-b bg-white px-4'>
          <Tabs value={rightPanel} onValueChange={(value) => handleTabChange('right', value as PanelType)}>
            <TabsList className='h-8'>
              <TabsTrigger value='chat' className='px-2' disabled hidden={leftPanel === 'chat'}>
                <MessageCircle className='h-4 w-4' />
              </TabsTrigger>
              <TabsTrigger value='itinerary' hidden={leftPanel === 'itinerary'} className='px-2'>
                <Map className='h-4 w-4' />
              </TabsTrigger>
              <TabsTrigger value='map' hidden={leftPanel === 'map'} className='px-2'>
                <MapPin className='h-4 w-4' />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto'>{renderPanel(rightPanel)}</div>
      </div>
    )

    return (
      <div className='hidden h-full lg:flex'>
        <div className={`min-w-0 border-r transition-[width] duration-300 ${showRightPanel ? 'w-1/2' : 'w-full'}`}>
          {leftContent}
        </div>
        {showRightPanel && <div className='w-1/2 min-w-0 transition-[width] duration-300'>{rightContent}</div>}
      </div>
    )
  }

  const handleMobileTabChange = (tab: PanelType) => {
    // Don't allow switching to chat (disabled)
    if (tab === 'chat') return
    setMobileTab(tab)
    setSelectedPoi(null)
  }

  const renderMobile = () => {
    let content: React.ReactNode = null
    if (mobileTab === 'chat') {
      content = <ChatPanel />
    } else if (mobileTab === 'itinerary') {
      if (itinerary) {
        content = (
          <ItineraryPanel
            className='h-full'
            data={itinerary}
            onOpenDetails={handleOpenPOI}
            onItineraryUpdate={handleItineraryUpdate}
          />
        )
      } else {
        content = <EmptyItinerary className='h-full' />
      }
    } else if (mobileTab === 'map') {
      if (itinerary) {
        const items = (itinerary?.plan?.days || []).flatMap((day: any) =>
          (day?.stops || []).map((i: any) => ({
            id: stripDaySuffix(i.poiId),
            name: i.name,
            role: i.role,
            arrival: i.arrival,
            startService: i.startService,
            depart: i.depart,
            latitude: i.latitude,
            longitude: i.longitude,
          }))
        )
        content = <ItinMapPanel items={items} onOpenPOI={handleOpenPOI} />
      } else {
        content = <EmptyItinerary className='h-full' />
      }
    }

    return (
      <div className='relative flex h-full w-full flex-col lg:hidden'>
        <div className='z-20 flex h-12 flex-shrink-0 items-center justify-end border-b bg-white px-4'>
          <h6 className='flex-1'>{itinerary?.meta?.title || 'Itinerary'}</h6>
          <Tabs value={mobileTab} onValueChange={(value) => handleMobileTabChange(value as PanelType)}>
            <TabsList className='h-8'>
              <TabsTrigger value='chat' className='px-2' disabled>
                <MessageCircle className='h-4 w-4' />
              </TabsTrigger>
              <TabsTrigger value='itinerary' className='px-2'>
                <Map className='h-4 w-4' />
              </TabsTrigger>
              <TabsTrigger value='map' className='px-2'>
                <MapPin className='h-4 w-4' />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div
          className={
            'fixed inset-0 z-40 transition-opacity duration-300 ' +
            (selectedPoi ? 'pointer-events-auto bg-black/40 opacity-100' : 'pointer-events-none opacity-0')
          }
          aria-hidden='true'
          onClick={() => setSelectedPoi(null)}
        />

        <div className='min-h-0 flex-1 overflow-hidden'>{content}</div>

        <div
          className={
            'fixed inset-0 z-50 flex h-screen flex-col transition-transform duration-300 ease-in-out ' +
            (selectedPoi ? 'pointer-events-auto' : 'pointer-events-none')
          }
          style={{
            transform: selectedPoi ? 'translateY(0%)' : 'translateY(100%)',
          }}
        >
          <div className='flex h-full flex-1 flex-col overflow-hidden border-t border-gray-200 bg-white shadow-2xl'>
            {loadingPoi ? (
              <div className='flex h-full items-center justify-center'>
                <div className='space-y-3 text-center'>
                  <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900'></div>
                  <p className='text-muted-foreground text-sm'>Loading POI details...</p>
                </div>
              </div>
            ) : (
              selectedPoi && <POIPanel poi={selectedPoi} size='full' onClose={() => setSelectedPoi(null)} />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='h-screen'>
      {renderDesktop()}
      {renderMobile()}
    </div>
  )
}
