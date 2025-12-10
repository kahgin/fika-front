import ChatPanel from '@/components/panels/ChatPanel'
import ItinMapPanel from '@/components/panels/ItinMapPanel'
import ItineraryPanel from '@/components/panels/ItineraryPanel'
import POIPanel from '@/components/panels/POIPanel'
import { DualPanelLayout } from '@/components/ui/dual-panel'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchPOIById, getItinerary, type CreatedItinerary, type POI } from '@/services/api'
import { Map, MapPin, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

type PanelType = 'chat' | 'itinerary' | 'map'

export default function ChatPage() {
  const [itinerary, setItinerary] = useState<CreatedItinerary | null>(null)
  const [leftPanel, setLeftPanel] = useState<PanelType>('chat')
  const [rightPanel, setRightPanel] = useState<PanelType>('itinerary')
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null)
  const [loadingPoi, setLoadingPoi] = useState(false)

  useEffect(() => {
    const lastId = localStorage.getItem('fika:lastChatId')
    if (!lastId) {
      setItinerary(null)
      return
    }

    getItinerary(lastId)
      .then((data) => {
        if (data) {
          setItinerary(data)
          try {
            localStorage.setItem(`fika:chat:${lastId}`, JSON.stringify(data))
          } catch {}
        } else {
          setItinerary(null)
          localStorage.removeItem(`fika:chat:${lastId}`)
          localStorage.removeItem('fika:lastChatId')
        }
      })
      .catch(() => {
        setItinerary(null)
        localStorage.removeItem(`fika:chat:${lastId}`)
        localStorage.removeItem('fika:lastChatId')
      })

    const handleItineraryUpdate = (event: CustomEvent) => {
      const { itineraryId, data } = event.detail
      if (itineraryId === lastId) {
        setItinerary(data)
      }
    }

    window.addEventListener('itinerary-updated', handleItineraryUpdate as EventListener)
    return () => window.removeEventListener('itinerary-updated', handleItineraryUpdate as EventListener)
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
      const items = (itinerary?.plan?.items || []).map((i: any) => ({
        id: i.id,
        name: i.name,
      }))
      return <ItinMapPanel items={items} />
    }

    if (panel === 'itinerary' && itinerary) {
      return (
        <ItineraryPanel
          className='h-full'
          data={itinerary}
          onOpenDetails={handleOpenPOI}
          onItineraryUpdate={setItinerary}
        />
      )
    }

    return null
  }

  const renderDesktop = () => {
    const leftContent = renderPanel(leftPanel)
    const rightContent = selectedPoi ? (
      loadingPoi ? (
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
      )
    ) : (
      renderPanel(rightPanel)
    )

    return (
      <div className='hidden h-full flex-col lg:flex'>
        <div className='z-10 flex h-12 flex-shrink-0 items-center border-b bg-white px-4'>
          <div className='flex h-full w-1/2 items-center justify-between border-r pr-4'>
            <h6 className='flex-1'>{itinerary?.meta?.title}</h6>
            <Tabs
              value={leftPanel}
              onValueChange={(value) => handleTabChange('left', value as PanelType)}
              hidden={!itinerary}
            >
              <TabsList className='h-8'>
                <TabsTrigger value='chat' className='px-2' hidden={rightPanel === 'chat'}>
                  <MessageCircle className='h-4 w-4' />
                </TabsTrigger>
                <TabsTrigger value='itinerary' hidden={!itinerary || rightPanel === 'itinerary'} className='px-2'>
                  <Map className='h-4 w-4' />
                </TabsTrigger>
                <TabsTrigger value='map' hidden={!itinerary || rightPanel === 'map'} className='px-2'>
                  <MapPin className='h-4 w-4' />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className='flex h-full w-1/2 items-center justify-end' hidden={!itinerary}>
            <Tabs
              value={rightPanel}
              onValueChange={(value) => handleTabChange('right', value as PanelType)}
              hidden={!!selectedPoi}
            >
              <TabsList className='h-8'>
                <TabsTrigger value='chat' className='px-2' hidden={leftPanel === 'chat'}>
                  <MessageCircle className='h-4 w-4' />
                </TabsTrigger>
                <TabsTrigger value='itinerary' hidden={!itinerary || leftPanel === 'itinerary'} className='px-2'>
                  <Map className='h-4 w-4' />
                </TabsTrigger>
                <TabsTrigger value='map' hidden={!itinerary || leftPanel === 'map'} className='px-2'>
                  <MapPin className='h-4 w-4' />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className='min-h-0 flex-1'>
          <DualPanelLayout
            left={leftContent}
            right={itinerary || selectedPoi ? rightContent : null}
            rightVisible={Boolean(itinerary || selectedPoi)}
            fullWidth={null}
          />
        </div>
      </div>
    )
  }

  const renderMobile = () => {
    const [mobileTab, setMobileTab] = useState<PanelType>('chat')

    const handleMobileTabChange = (tab: PanelType) => {
      setMobileTab(tab)
      setSelectedPoi(null)
    }

    let content: React.ReactNode = null
    if (mobileTab === 'chat') {
      content = <ChatPanel />
    } else if (mobileTab === 'itinerary' && itinerary) {
      content = (
        <ItineraryPanel
          className='h-full'
          data={itinerary}
          onOpenDetails={handleOpenPOI}
          onItineraryUpdate={setItinerary}
        />
      )
    } else if (mobileTab === 'map' && itinerary) {
      const items = (itinerary.plan?.items || []).map((i: any) => ({
        id: i.id,
        name: i.name,
      }))
      content = <ItinMapPanel items={items} />
    }

    return (
      <div className='relative flex h-full w-full flex-col lg:hidden'>
        <div className='z-20 flex h-12 flex-shrink-0 items-center justify-end border-b bg-white px-4'>
          <h6 className='flex-1'>{itinerary?.meta?.title}</h6>
          <Tabs value={mobileTab} onValueChange={(value) => handleMobileTabChange(value as PanelType)}>
            <TabsList className='h-8'>
              <TabsTrigger value='chat' className='px-2'>
                <MessageCircle className='h-4 w-4' />
              </TabsTrigger>
              <TabsTrigger value='itinerary' disabled={!itinerary} className='px-2'>
                <Map className='h-4 w-4' />
              </TabsTrigger>
              <TabsTrigger value='map' disabled={!itinerary} className='px-2'>
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
