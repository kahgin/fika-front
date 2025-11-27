import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteItinerary, listItineraries, type CreatedItinerary } from '@/services/api'
import { Map, SquareArrowOutUpRight, Trash } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tooltip } from '@/components/ui/tooltip'
import { TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import CreateItineraryForm from '@/components/forms/create-itinerary-form'
import LoginForm from '@/components/forms/login-form'

export default function ItineraryPage() {
  const [chats, setChats] = useState<CreatedItinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateItinerary, setShowCreateItinerary] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const loadItineraries = async () => {
      try {
        setLoading(true)
        const items = await listItineraries()
        if (items && Array.isArray(items)) {
          setChats(items)
          items.forEach((item) => {
            try {
              localStorage.setItem(`fika:chat:${item.itin_id}`, JSON.stringify(item))
            } catch {}
          })
        } else {
          setChats([])
        }
      } catch (e) {
        console.error('Failed to load itineraries', e)
        setChats([])
      } finally {
        setLoading(false)
      }
    }
    loadItineraries()
  }, [])

  const handleOpen = (chatId: string) => {
    localStorage.setItem('fika:lastChatId', chatId)
    window.location.href = '/chat'
  }

  const handleDelete = async (chatId: string) => {
    const ok = await deleteItinerary(chatId)
    if (ok) {
      localStorage.removeItem(`fika:chat:${chatId}`)
      setChats((prev) => prev.filter((c) => c.itin_id !== chatId))
    }
  }

  return (
    <>
      <div className="flex h-12 items-center border-b px-6">
        <h6>Itineraries</h6>
      </div>
      <div className="p-6" style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT + 24}px` } : undefined}>
        {loading ? (
          <div className="text-muted-foreground text-sm">Loading itineraries...</div>
        ) : chats.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Map />
              </EmptyMedia>
              <EmptyTitle>No Itineraries Found</EmptyTitle>
              <EmptyDescription>
                You haven&apos;t created any itineraries yet.
                <br />
                Get started by creating one.
              </EmptyDescription>
            </EmptyHeader>
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateItinerary(true)}>Create Itinerary</Button>
              <Button variant="outline" onClick={() => setShowLogin(true)}>Login</Button>
            </div>
          </Empty>
        ) : (
          <div className="space-y-2">
            {chats.map((c) => (
              <div key={c.itin_id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{c.meta?.title}</div>
                  <div className="text-muted-foreground text-sm">{c.itin_id}</div>
                </div>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" onClick={() => handleOpen(c.itin_id)}>
                        <SquareArrowOutUpRight className="size-4.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline" onClick={() => handleDelete(c.itin_id)}>
                        <Trash className="size-4.5" />
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

      <CreateItineraryForm open={showCreateItinerary} onOpenChange={setShowCreateItinerary} />
      <LoginForm open={showLogin} onOpenChange={setShowLogin} />
    </>
  )
}
