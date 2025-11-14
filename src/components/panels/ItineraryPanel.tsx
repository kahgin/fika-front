import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronDown, ChevronRight, Clock, Plus } from "lucide-react"

interface ItineraryPanelProps {
  className?: string
  data?: {
    meta?: any
    plan?: {
      selected_themes: string[]
      items: Array<{
        id: string
        name: string
        roles: string[]
        categories?: string[]
        rating?: number
        reviews?: number
        price_level?: number | null
      }>
    }
  } | null
  loading?: boolean
  onOpenDetails?: (poi: { id: string; name: string }) => void
}

interface ItineraryItem {
  id: string
  name: string
  time?: string
  duration?: string
  distance?: string
  image?: string
  hasTime: boolean
}

interface ItineraryDay {
  id: string
  date: string
  dayName: string
  items: ItineraryItem[]
}

export default function ItineraryPanel({ className = "", data, onOpenDetails }: ItineraryPanelProps) {
  const [open, setOpen] = useState(false)
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('fika:itinerary:expandedDays');
      return saved ? JSON.parse(saved) : { "day1": false };
    } catch {
      return { "day1": false };
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('fika:itinerary:expandedDays', JSON.stringify(expandedDays));
    } catch { }
  }, [expandedDays])

  type BudgetKey = 'any' | 'tight' | 'sensible' | 'upscale' | 'luxury'
  const budgetMap: Record<BudgetKey, string> = { 
    any: '$–$$$$', 
    tight: '$', 
    sensible: '$$', 
    upscale: '$$$', 
    luxury: '$$$$' 
  }
  const rawBudget = data?.meta?.preferences?.budget as string | undefined
  const budgetKey: BudgetKey = (rawBudget && rawBudget in budgetMap) ? rawBudget as BudgetKey : 'any'

  const pacingMap: Record<string, string> = {
    relaxed: 'Relaxed',
    balanced: 'Balanced',
    packed: 'Packed'
  }
  const rawPacing = data?.meta?.preferences?.pacing as string | undefined
  const pacingLabel = rawPacing && rawPacing in pacingMap ? pacingMap[rawPacing] : 'Balanced'

  const tripData = {
    title: data?.meta?.title || (data?.meta?.destination ? `${data.meta.destination} Trip` : "Trip"),
    destination: data?.meta?.destination || "Singapore",
    dates: typeof data?.meta?.dates === 'object' && data?.meta?.dates?.type === 'specific'
      ? `${data?.meta?.dates?.startDate || ''} - ${data?.meta?.dates?.endDate || ''}`
      : (data?.meta?.dates?.days ? `${data?.meta?.dates?.days} days` : "5 days"),
    travelers: data?.meta?.travelers ? `${(data.meta.travelers.adults || 0) + (data.meta.travelers.children || 0)} travelers` : "2 travelers",
    budget: budgetMap[budgetKey],
    pacing: pacingLabel
  }

  const ideasItems: ItineraryItem[] = (
    ((data as any)?.meta?.ideas ?? (data as any)?.ideas ?? []) as Array<any>
  ).map((i) => ({
    id: String(i.id ?? i.place_id ?? i.slug ?? crypto.randomUUID()),
    name: String(i.name ?? i.title ?? 'Untitled'),
    hasTime: false,
    image: (i.image || (Array.isArray(i.images) ? i.images[0] : undefined)) as string | undefined,
  }))

  const derivedItems: ItineraryItem[] = (data?.plan?.items || []).map((i: any) => ({
    id: i.id,
    name: i.name,
    hasTime: false,
    image: (Array.isArray(i.images) ? i.images[0] : undefined) as string | undefined,
  }))

  const itineraryDays: ItineraryDay[] = [
    {
      id: "day1",
      date: "",
      dayName: "Day 1",
      items: derivedItems
    },
  ]

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }))
  }

  return (
  <div className={`h-full overflow-auto ${className}`}>
      <div className="border-b border-gray-200 p-6 sticky top-0 bg-white z-10">
        <div className="mb-4">
          <h1 className="font-semibold">{tripData.title}</h1>
        </div>

        <ButtonGroup className="hidden sm:flex">
          <Button value="destination" variant="outline" className="shadow-none rounded-full" onClick={() => setOpen(true)}>
            {tripData.destination}
          </Button>
          <Button value="dates" variant="outline" className="shadow-none rounded-full" onClick={() => setOpen(true)}>
            {tripData.dates}
          </Button>
          <Button value="travelers" variant="outline" className="shadow-none rounded-full" onClick={() => setOpen(true)}>
            {tripData.travelers}
          </Button>
          <Button value="budget" variant="outline" className="shadow-none rounded-full" onClick={() => setOpen(true)}>
            {tripData.budget}
          </Button>
          <Button value="pacing" variant="outline" className="shadow-none rounded-full" onClick={() => setOpen(true)}>
            {tripData.pacing}
          </Button>
        </ButtonGroup>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Coming Soon</DialogTitle>
            </DialogHeader>
            <p>We're still baking this page! 🍪</p>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-6 space-y-8 flex-1 overflow-auto">
        {ideasItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Ideas</h2>
            </div>
            <div className="space-y-4">
              {ideasItems.map((item) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img referrerPolicy="no-referrer" src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h6 className="font-medium mb-1">{item.name}</h6>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full shadow-none"
                    onClick={() => onOpenDetails && onOpenDetails({ id: item.id, name: item.name })}
                  >
                    Details
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Itinerary</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Distances</span>
              <Switch />
            </div>
          </div>

          <div className="space-y-4">
            {itineraryDays.filter(d => d.items.length > 0).map((day) => (
              <div key={day.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleDay(day.id)}
                  className={`w-full flex items-center justify-between p-4 transition-colors ${expandedDays[day.id] ? "border-b" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {expandedDays[day.id] ? (
                      <ChevronDown className="size-5 text-muted-foreground/90" />
                    ) : (
                      <ChevronRight className="size-5 text-muted-foreground/90" />
                    )}
                    <div className="text-left">
                      <h4>{day.dayName}</h4>
                      <p className="text-sm text-muted-foreground/90">{day.date}</p>
                    </div>
                  </div>
                  <div className="w-10" />
                </button>

                {expandedDays[day.id] && (
                  <div className="p-4 space-y-4 bg-white">
                    {day.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No destinations added yet</p>
                        <Button size="sm" className="btn-primary mt-2">
                          <Plus className="size-4 mr-1" />
                          Add Destination
                        </Button>
                      </div>
                    ) : (
                      day.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img
                                referrerPolicy="no-referrer"
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h6 className="font-medium mb-1">{item.name}</h6>
                            {item.time && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="size-3" />
                                {item.time}
                              </div>
                            )}
                            {item.distance && (
                              <div className="text-xs text-gray-400 mt-1">
                                {item.distance}
                              </div>
                            )}
                          </div>
                          <Button variant="outline" size="sm" className="text-xs rounded-full shadow-none" onClick={() => onOpenDetails && onOpenDetails({ id: item.id, name: item.name })}>Details</Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
