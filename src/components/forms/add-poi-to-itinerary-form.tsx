import LoginForm from '@/components/forms/login-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import formatDateRange from '@/lib/date-range'
import {
  cacheItinerary,
  dispatchItineraryUpdate,
  getCachedItinerary,
  getLastItineraryId,
} from '@/lib/itinerary-storage'
import type { POI } from '@/services/api'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface AddPOIToItineraryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  poi: POI | null
  onSuccess?: () => void
}

type ItinerarySummary = {
  id: string
  title: string
  dates?: string
}

function toItinerarySummary(data: any): ItinerarySummary {
  return {
    id: data.itinId || String(data.id),
    title: (data?.meta?.title ? data.meta.title : `${data.meta?.destination} Trip`) || 'Trip',
    dates:
      data?.meta?.dates?.type === 'specific'
        ? formatDateRange(data?.meta?.dates?.startDate, data?.meta?.dates?.endDate)
        : data?.meta?.dates?.days,
  }
}

async function fetchItinerariesFromStorageOrAPI(): Promise<ItinerarySummary[]> {
  const summaries: ItinerarySummary[] = []

  const lastId = getLastItineraryId()
  if (lastId) {
    const cached = getCachedItinerary(lastId)
    if (cached) {
      summaries.push(toItinerarySummary(cached))
    }
  }

  try {
    const { listItineraries } = await import('@/services/api')
    const res = await listItineraries()
    if (Array.isArray(res)) {
      res.forEach((it: any) => summaries.push(toItinerarySummary(it)))
    }
  } catch {}

  const map = new Map<string, ItinerarySummary>()
  for (const s of summaries) map.set(s.id, s)
  return Array.from(map.values())
}

export function AddPOIToItineraryForm({ open, onOpenChange, poi, onSuccess }: AddPOIToItineraryFormProps) {
  const navigate = useNavigate()
  const [itineraries, setItineraries] = useState<ItinerarySummary[]>([])
  const [loadingItineraries, setLoadingItineraries] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const fetchItineraries = async () => {
    setLoadingItineraries(true)
    const result = await fetchItinerariesFromStorageOrAPI()
    setItineraries(result)
    setLoadingItineraries(false)
  }

  const handleAddToItinerary = async (itineraryId: string) => {
    if (!poi || adding) return
    setAdding(true)
    try {
      const { addPOIToItinerary, getItinerary } = await import('@/services/api')
      await addPOIToItinerary(itineraryId, { poiId: poi.id })

      const lastId = getLastItineraryId()
      if (lastId === itineraryId) {
        const latest = await getItinerary(itineraryId)
        if (latest) {
          cacheItinerary(latest)
          dispatchItineraryUpdate(latest)
        }
      }

      onOpenChange(false)
      toast.success(`${poi.name} added to itinerary`)
      if (onSuccess) onSuccess()
    } catch (e) {
      console.error('Failed to add POI:', e)
      onOpenChange(false)
      toast.error('Failed to add place to itinerary')
    } finally {
      setAdding(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchItineraries()
    }
  }, [open])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to itinerary</DialogTitle>
          </DialogHeader>
          {!poi ? (
            <p className='text-muted-foreground text-sm'>No place selected.</p>
          ) : loadingItineraries ? (
            <p className='text-muted-foreground text-sm'>Loading itineraries…</p>
          ) : itineraries.length === 0 ? (
            <div className='space-y-4'>
              <p className='text-muted-foreground text-sm'>
                No itineraries found. Create a trip first, then add places.
              </p>
              <div className='flex gap-2'>
                <Button
                  className='flex-1'
                  onClick={() => {
                    onOpenChange(false)
                    navigate('/create')
                  }}
                >
                  Create Itinerary
                </Button>
                <Button
                  variant='outline'
                  className='flex-1'
                  onClick={() => {
                    onOpenChange(false)
                    setShowLogin(true)
                  }}
                >
                  Login
                </Button>
              </div>
            </div>
          ) : (
            <div className='space-y-2'>
              {itineraries.map((it) => (
                <Button
                  key={it.id}
                  variant='ghost'
                  className='h-auto w-full justify-start px-4 py-3'
                  onClick={() => handleAddToItinerary(it.id)}
                  disabled={adding}
                >
                  <div className='w-full text-left space-y-1'>
                    <p className='font-medium'>{it.title}</p>
                    {it.dates && <p className='text-muted-foreground text-xs'>{it.dates}</p>}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Forms controlled by open state */}
      <LoginForm open={showLogin} onOpenChange={setShowLogin} />
    </>
  )
}
