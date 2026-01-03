import { POIIcon } from '@/lib/poi-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOMServer from 'react-dom/server'

interface MapItem {
  id: string
  name: string
  role?: string
  themes?: string[]
  arrival?: string
  depart?: string
  latitude?: number
  longitude?: number
  images?: string[]
}

interface ItinMapPanelProps {
  items: Array<MapItem>
  onOpenPOI?: (poi: { id: string; name: string }) => void
}

function createInfoWindowContent(item: MapItem): string {
  const seed = encodeURIComponent(item.name || 'fallback')
  const fallbackUrl = `https://picsum.photos/seed/${seed}/300/200`
  const originalSrc = item.images?.[0] ? `${item.images[0]}=s300` : null

  return `
    <div style="min-width: 200px; max-width: 280px; cursor: pointer;" data-poi-id="${item.id} padding: 0px;" data-poi-name="${item.name}">
      <div style="border-radius: 8px; overflow: hidden; background: #f3f4f6;">
        <img
          src="${originalSrc || fallbackUrl}"
          alt="${item.name}"
          style="width: 100%; height: 120px; object-fit: cover;"
          ${originalSrc ? `onerror="this.src='${fallbackUrl}'; this.onerror=null;"` : ''}
        />
      </div>
      <div style="padding: 8px;">
        <h3 style="font-weight: 600; font-size: 14px; margin: 0; color: #111827;">${item.name}</h3>
      </div>
    </div>
  `
}

function createMarkerElement(role?: string, themes?: string[] | null): HTMLElement {
  const container = document.createElement('div')
  container.className = 'poi-marker'
  container.style.cssText = `
    width: 36px;
    height: 36px;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  `

  const iconColor = '000000'

  container.style.border = `2px solid ${iconColor}`

  const html = ReactDOMServer.renderToString(<POIIcon role={role} themes={themes} className='size-4' />)

  container.innerHTML = html
  return container
}

export default function ItinMapPanel({ items, onOpenPOI }: ItinMapPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter items with valid coordinates
  const validItems = items.filter(
    (item) =>
      typeof item.latitude === 'number' &&
      typeof item.longitude === 'number' &&
      !isNaN(item.latitude) &&
      !isNaN(item.longitude)
  )

  const initMap = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setError('Google Maps API key not configured')
      setIsLoading(false)
      return
    }

    if (!mapRef.current) return

    try {
      if (!window.google) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=weekly`
          script.async = true
          script.defer = true
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Google Maps'))
          document.head.appendChild(script)
        })
      }

      // Wait for libraries to be ready
      await google.maps.importLibrary('maps')
      const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary

      // Calculate center
      let center = { lat: 1.3521, lng: 103.8198 }
      if (validItems.length > 0) {
        const avgLat = validItems.reduce((sum, item) => sum + (item.latitude || 0), 0) / validItems.length
        const avgLng = validItems.reduce((sum, item) => sum + (item.longitude || 0), 0) / validItems.length
        center = { lat: avgLat, lng: avgLng }
      }

      // Create map
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 12,
        mapId: 'fika-itinerary-map',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      })

      mapInstanceRef.current = map

      // Create info window with no close button
      const infoWindow = new google.maps.InfoWindow({
        disableAutoPan: false,
      })
      infoWindowRef.current = infoWindow

      // Add click handler to info window content
      infoWindow.addListener('domready', () => {
        const content = document.querySelector('[data-poi-id]') as HTMLElement
        if (content) {
          content.addEventListener('click', () => {
            const poiId = content.getAttribute('data-poi-id')
            const poiName = content.getAttribute('data-poi-name')
            if (onOpenPOI && poiId && poiName) {
              onOpenPOI({ id: poiId, name: poiName })
            }
          })
        }
        // Hide the close button
        const closeButton = document.querySelector('.gm-ui-hover-effect') as HTMLElement
        if (closeButton) {
          closeButton.style.display = 'none'
        }
      })

      const bounds = new google.maps.LatLngBounds()
      markersRef.current.forEach((marker) => (marker.map = null))
      markersRef.current = []

      validItems.forEach((item) => {
        const position = { lat: item.latitude!, lng: item.longitude! }
        bounds.extend(position)

        const markerElement = createMarkerElement(item.role, item.themes)

        const marker = new AdvancedMarkerElement({
          map,
          position,
          content: markerElement,
          title: item.name,
        })

        markerElement.addEventListener('mouseenter', () => {
          markerElement.style.transform = 'scale(1.15)'
          markerElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
          infoWindow.setContent(createInfoWindowContent(item))
          infoWindow.open(map, marker)
        })

        markerElement.addEventListener('mouseleave', () => {
          markerElement.style.transform = 'scale(1)'
          markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
          // Close info window when mouse leaves marker
          infoWindow.close()
        })

        marker.addListener('click', () => {
          if (onOpenPOI) {
            onOpenPOI({ id: item.id, name: item.name })
          }
        })

        markersRef.current.push(marker)
      })

      if (validItems.length > 1) {
        map.fitBounds(bounds, 50)
      } else if (validItems.length === 1) {
        map.setCenter({ lat: validItems[0].latitude!, lng: validItems[0].longitude! })
        map.setZoom(15)
      }

      setIsLoading(false)
    } catch (err) {
      console.error('Error initializing map:', err)
      setError('Failed to load map')
      setIsLoading(false)
    }
  }, [validItems, onOpenPOI])

  useEffect(() => {
    initMap()

    return () => {
      // Cleanup
      markersRef.current.forEach((marker) => (marker.map = null))
      markersRef.current = []
      if (infoWindowRef.current) {
        infoWindowRef.current.close()
      }
    }
  }, [initMap])

  if (error) {
    return (
      <div className='flex h-full flex-col items-center justify-center text-sm text-muted-foreground'>
        <p>{error}</p>
      </div>
    )
  }

  if (validItems.length === 0) {
    return (
      <div className='flex h-full flex-col items-center justify-center text-sm text-muted-foreground'>
        <p>No locations with coordinates to display</p>
      </div>
    )
  }

  return (
    <div className='relative flex h-full flex-col'>
      {isLoading && (
        <div className='absolute inset-0 z-10 flex items-center justify-center bg-white/80'>
          <div className='space-y-2 text-center'>
            <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900'></div>
            <p className='text-sm text-muted-foreground'>Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className='h-full w-full' />
    </div>
  )
}
