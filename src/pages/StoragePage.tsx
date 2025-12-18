import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import { AuthDialogs } from '@/components/dialogs/auth-dialogs'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthDialogs } from '@/hooks/use-auth-dialogs'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatDateRange } from '@/lib/date-range'
import {
  clearItineraryRefs,
  getAllCachedItineraries,
  setLastItineraryId,
  syncItinerariesWithBackend,
} from '@/lib/itinerary-storage'
import { deleteItinerary, listItineraries, type CreatedItinerary } from '@/services/api'
import { Map, SquareArrowOutUpRight, Trash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function StoragePage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [itin, setItin] = useState<CreatedItinerary[]>([])
  const [loading, setLoading] = useState(true)
  const { showLogin, setShowLogin, showSignup, setShowSignup, switchToSignup, switchToLogin } = useAuthDialogs()

  useEffect(() => {
    const loadItineraries = async () => {
      try {
        setLoading(true)

        if (isAuthenticated) {
          const items = await listItineraries()
          if (items && Array.isArray(items)) {
            setItin(items)
            syncItinerariesWithBackend(items)
          } else {
            setItin([])
          }
        } else {
          setItin(getAllCachedItineraries())
        }
      } catch (e) {
        console.error('Failed to load itineraries', e)
        setItin([])
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadItineraries()
    }
  }, [isAuthenticated, authLoading])

  const handleOpen = (itineraryId: string) => {
    setLastItineraryId(itineraryId)
    navigate('/itinerary')
  }

  const handleCreateItinerary = () => {
    navigate('/create')
  }

  const handleDelete = async (itineraryId: string) => {
    // Always try to delete from backend (works for both authenticated and guest itineraries)
    const ok = await deleteItinerary(itineraryId)
    if (ok) {
      clearItineraryRefs(itineraryId)
      setItin((prev) => prev.filter((c) => c.itinId !== itineraryId))
    } else {
      // If backend delete failed, still clear local refs for guests
      if (!isAuthenticated) {
        clearItineraryRefs(itineraryId)
        setItin((prev) => prev.filter((c) => c.itinId !== itineraryId))
      }
    }
  }

  return (
    <>
      <div className='flex h-12 items-center border-b px-6'>
        <h6>Itineraries</h6>
      </div>
      <div className='p-6' style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT + 24}px` } : undefined}>
        {loading || authLoading ? (
          <div className='text-muted-foreground text-sm'>Loading itineraries...</div>
        ) : itin.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Map />
              </EmptyMedia>
              <EmptyTitle>No Itineraries Found</EmptyTitle>
              <EmptyDescription>
                {isAuthenticated
                  ? "You haven't created any itineraries yet."
                  : 'Sign in to save and sync your itineraries across devices.'}
                <br />
                Get started by creating one.
              </EmptyDescription>
            </EmptyHeader>
            <div className='flex gap-2'>
              <Button onClick={handleCreateItinerary}>Create Itinerary</Button>
              {!isAuthenticated && (
                <Button variant='outline' onClick={() => setShowLogin(true)}>
                  Sign in
                </Button>
              )}
            </div>
          </Empty>
        ) : (
          <div className='space-y-2'>
            {itin.map((c) => (
              <div key={c.itinId} className='flex items-center justify-between rounded-lg border p-3'>
                <div>
                  <div className='font-medium'>{c.meta?.title}</div>
                  <div className='text-muted-foreground text-sm'>
                    {c?.meta?.dates?.type === 'specific'
                      ? formatDateRange(c?.meta?.dates?.startDate, c?.meta?.dates?.endDate)
                      : c?.meta?.dates?.days
                        ? `${c?.meta?.dates?.days} days`
                        : ''}
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size='icon' onClick={() => handleOpen(c.itinId)}>
                        <SquareArrowOutUpRight className='size-4.5' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size='icon' variant='outline' onClick={() => handleDelete(c.itinId)}>
                        <Trash className='size-4.5' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AuthDialogs
        dialogState={{
          showLogin,
          setShowLogin,
          showSignup,
          setShowSignup,
          switchToSignup,
          switchToLogin,
          openLogin: () => setShowLogin(true),
          openSignup: () => setShowSignup(true),
        }}
      />
    </>
  )
}
