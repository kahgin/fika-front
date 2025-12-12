import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import LoginForm from '@/components/forms/login-form'
import SignupForm from '@/components/forms/signup-form'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatDateRange } from '@/lib/date-range'
import { deleteItinerary, listItineraries, type CreatedItinerary } from '@/services/api'
import { Map, SquareArrowOutUpRight, Trash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ItineraryPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [chats, setChats] = useState<CreatedItinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  useEffect(() => {
    const loadItineraries = async () => {
      try {
        setLoading(true)

        if (isAuthenticated) {
          // Authenticated: load from backend API
          const items = await listItineraries()
          if (items && Array.isArray(items)) {
            setChats(items)
            // Cache in localStorage for offline access
            items.forEach((item) => {
              try {
                localStorage.setItem(`fika:chat:${item.itinId}`, JSON.stringify(item))
              } catch {}
            })
          } else {
            setChats([])
          }
        } else {
          // Anonymous: load from localStorage only
          const localChats: CreatedItinerary[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith('fika:chat:')) {
              try {
                const item = JSON.parse(localStorage.getItem(key) || '{}')
                if (item.itinId) {
                  localChats.push(item)
                }
              } catch {}
            }
          }
          setChats(localChats)
        }
      } catch (e) {
        console.error('Failed to load itineraries', e)
        setChats([])
      } finally {
        setLoading(false)
      }
    }

    // Wait for auth state to be determined before loading
    if (!authLoading) {
      loadItineraries()
    }
  }, [isAuthenticated, authLoading])

  const handleOpen = (chatId: string) => {
    localStorage.setItem('fika:lastChatId', chatId)
    navigate('/chat')
  }

  const handleCreateItinerary = () => {
    navigate('/create')
  }

  const handleDelete = async (chatId: string) => {
    if (isAuthenticated) {
      const ok = await deleteItinerary(chatId)
      if (ok) {
        localStorage.removeItem(`fika:chat:${chatId}`)
        setChats((prev) => prev.filter((c) => c.itinId !== chatId))
      }
    } else {
      // Anonymous: just remove from localStorage
      localStorage.removeItem(`fika:chat:${chatId}`)
      setChats((prev) => prev.filter((c) => c.itinId !== chatId))
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
        ) : chats.length === 0 ? (
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
            {chats.map((c) => (
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

      <LoginForm
        open={showLogin}
        onOpenChange={setShowLogin}
        onSwitchToSignup={() => {
          setShowLogin(false)
          setShowSignup(true)
        }}
      />
      <SignupForm
        open={showSignup}
        onOpenChange={setShowSignup}
        onSwitchToLogin={() => {
          setShowSignup(false)
          setShowLogin(true)
        }}
      />
    </>
  )
}
