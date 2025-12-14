import { MobileSlidePanel } from '@/components/mobile-slide-panel'
import POIPanel from '@/components/panels/POIPanel'
import SearchPanel from '@/components/panels/SearchPanel'
import { DualPanelLayout } from '@/components/ui/dual-panel'
import { useIsMobile } from '@/hooks/use-mobile'
import type { POI } from '@/services/api'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function SearchPage() {
  const isMobile = useIsMobile()
  const location = useLocation()
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null)
  const [isDetailFullWidth, setIsDetailFullWidth] = useState(false)
  const [searchKey, setSearchKey] = useState(0)

  // Reset search panel when navigating back to this page
  useEffect(() => {
    setSearchKey((prev) => prev + 1)
  }, [location.pathname])

  const handlePOISelect = (poi: POI) => {
    setSelectedPOI(poi)
    setIsDetailFullWidth(false)
  }

  const handleClosePOI = () => {
    setSelectedPOI(null)
    setIsDetailFullWidth(false)
  }

  const handleToggleFullWidth = () => setIsDetailFullWidth(!isDetailFullWidth)

  const renderDesktop = () => (
    <DualPanelLayout
      left={
        <SearchPanel
          key={searchKey}
          onPOISelect={handlePOISelect}
          size={selectedPOI && !isDetailFullWidth ? 'half' : 'full'}
        />
      }
      right={
        selectedPOI ? (
          <POIPanel
            poi={selectedPOI}
            size={isDetailFullWidth ? 'full' : 'half'}
            onClose={handleClosePOI}
            onToggleFullWidth={handleToggleFullWidth}
          />
        ) : null
      }
      rightVisible={Boolean(selectedPOI)}
      fullWidth={selectedPOI ? (isDetailFullWidth ? 'right' : null) : 'left'}
      className='overflow-hidden'
    />
  )

  const renderMobile = () => (
    <div className='relative flex h-full w-full lg:hidden'>
      <MobileSlidePanel isOpen={Boolean(selectedPOI)} onClose={handleClosePOI}>
        {selectedPOI && <POIPanel poi={selectedPOI} size='full' onClose={handleClosePOI} />}
      </MobileSlidePanel>

      <div className={selectedPOI ? 'hidden' : 'h-full w-full'}>
        <SearchPanel key={searchKey} onPOISelect={handlePOISelect} size='full' />
      </div>
    </div>
  )

  return <div className='h-screen w-full'>{isMobile ? renderMobile() : renderDesktop()}</div>
}
