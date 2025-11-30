import { useState, useEffect } from 'react'
import { format, startOfMonth } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { reorderItineraryStops, schedulePOI, deletePOIFromItinerary, updateItineraryMeta } from '@/services/api'
import { useIsMobile } from '@/hooks/use-mobile'
import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { POIIcon } from '@/lib/poi-icons'
import { WhenDialog, WhoDialog, BudgetDialog, PacingDialog } from '@/components/dialogs'

interface Stop {
  poi_id: string
  name: string
  role: string
  themes?: string[] | null
  arrival?: string
  start_service?: string
  depart?: string
  latitude?: number
  longitude?: number
}

interface Day {
  date: string
  weekday?: string
  stops: Stop[]
  meals?: number
  total_distance?: number
}

interface ItineraryPanelProps {
  className?: string
  data?: {
    itin_id?: string
    meta?: any
    plan?: {
      days: Day[]
    }
  } | null
  loading?: boolean
  onOpenDetails?: (poi: { id: string; name: string }) => void
  onItineraryUpdate?: (data: any) => void
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
}

function SortableStop({
  stop,
  dayIndex,
  onDetails,
  onScheduleClick,
  onDelete,
}: {
  stop: Stop
  dayIndex: number
  onDetails?: (stop: Stop) => void
  onScheduleClick?: (stop: Stop) => void
  onDelete?: (stop: Stop) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.poi_id,
    data: { dayIndex, stop },
  })
  const [isHovered, setIsHovered] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Convert 24h to 12h format
  const formatTime12h = (time24: string) => {
    const [hours, minutes] = time24.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative flex items-start p-3 transition-colors items-center',
        isDragging && 'opacity-50',
        'cursor-grab hover:bg-gray-50 active:cursor-grabbing'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (!target.closest('button') && !target.closest('[role="button"]') && onDetails) {
          e.stopPropagation()
          onDetails(stop)
        }
      }}
    >

      <div className="min-w-0 flex-1 space-y-1">
        <div className='flex items-center gap-2'>
          <POIIcon role={stop.role} themes={stop.themes} className="size-3.5 flex-shrink-0" />
          <h6 className="font-medium">{stop.name}</h6>
        </div>
        {stop.arrival && onScheduleClick && (
          <div
            className="hover:text-primary flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-500"
            onClick={(e) => {
              e.stopPropagation()
              onScheduleClick(stop)
            }}
            role="button"
          >
            <Clock className="size-3" />
            <span>
              {formatTime12h(stop.arrival)} - {formatTime12h(stop.depart || stop.arrival)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onDelete && isHovered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 cursor-pointer px-2 text-gray-600 hover:text-gray-900"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(stop)
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
        {onDetails && (
          <Button
            variant="outline"
            size="sm"
            className=" cursor-pointer rounded-full text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onDetails(stop)
            }}
          >
            Details
          </Button>
        )}
      </div>
    </div>
  )
}

function StopOverlay({ stop }: { stop: Stop }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-lg">
      <div className="min-w-0 flex-1">
        <h6 className="mb-1 font-medium">{stop.name}</h6>
        {stop.arrival && (
          <div className="flex w-fit items-center gap-1 text-sm text-gray-500">
            <Clock className="size-3" />
            <span>
              {stop.arrival} - {stop.depart}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ItineraryPanel({ className = '', data, onOpenDetails, onItineraryUpdate }: ItineraryPanelProps) {
  const isMobile = useIsMobile()
  const [days, setDays] = useState<Day[]>(data?.plan?.days || [])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [scheduleDialog, setScheduleDialog] = useState<{ open: boolean; stop: Stop | null; dayIndex: number }>({
    open: false,
    stop: null,
    dayIndex: -1,
  })
  const [scheduleTab, setScheduleTab] = useState<'time' | 'allday'>('time')
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined)
  const [scheduleStartTime, setScheduleStartTime] = useState('')
  const [scheduleEndTime, setScheduleEndTime] = useState('')
  const [scheduleDay, setScheduleDay] = useState('')

  // Dialog state for When, Who, Budget, Pacing
  const [showWhenDialog, setShowWhenDialog] = useState(false)
  const [showWhoDialog, setShowWhoDialog] = useState(false)
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showPacingDialog, setShowPacingDialog] = useState(false)

  // When dialog state
  const [dateMode, setDateMode] = useState<'specific' | 'flexible'>(data?.meta?.dates?.type || 'specific')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    data?.meta?.dates?.type === 'specific' && data?.meta?.dates?.startDate && data?.meta?.dates?.endDate
      ? {
        from: new Date(data.meta.dates.startDate),
        to: new Date(data.meta.dates.endDate),
      }
      : undefined
  )
  const [flexibleDays, setFlexibleDays] = useState(String(data?.meta?.dates?.days || '1'))
  const [flexibleMonth, setFlexibleMonth] = useState(data?.meta?.dates?.preferredMonth || '')

  // Who dialog state
  const [adults, setAdults] = useState(data?.meta?.travelers?.adults || 2)
  const [children, setChildren] = useState(data?.meta?.travelers?.children || 0)
  const [pets, setPets] = useState(data?.meta?.travelers?.pets || 0)
  const [isMuslim, setIsMuslim] = useState(data?.meta?.flags?.is_muslim || false)
  const [kidFriendly, setKidFriendly] = useState(data?.meta?.flags?.kids_friendly || false)
  const [petFriendly, setPetFriendly] = useState(data?.meta?.flags?.pets_friendly || false)

  // Budget and Pacing state
  const [budget, setBudget] = useState(data?.meta?.preferences?.budget || 'any')
  const [pacing, setPacing] = useState(data?.meta?.preferences?.pacing || 'balanced')

  const itinId = data?.itin_id || localStorage.getItem('fika:lastChatId') || ''

  useEffect(() => {
    if (data?.plan?.days) {
      setDays(data.plan.days)
    }
  }, [data?.plan?.days])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isMobile
        ? {
          delay: 250,
          tolerance: 5,
        }
        : {
          distance: 8,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeData = active.data.current
    const overData = over.data.current

    if (!activeData || !overData) return

    const sourceDayIndex = activeData.dayIndex
    const targetDayIndex = overData.dayIndex

    // Don't allow moving depot/hotel
    const activeStop = activeData.stop as Stop
    if (activeStop.role === 'depot' || activeStop.role === 'hotel') {
      return
    }

    // Same day reorder
    if (sourceDayIndex === targetDayIndex) {
      const day = days[sourceDayIndex]
      const oldIndex = day.stops.findIndex((stop) => stop.poi_id === active.id)
      const newIndex = day.stops.findIndex((stop) => stop.poi_id === over.id)

      const newDays = [...days]
      newDays[sourceDayIndex].stops = arrayMove(day.stops, oldIndex, newIndex)
      setDays(newDays)

      if (itinId) {
        const poiIds = newDays[sourceDayIndex].stops.map((s) => s.poi_id)
        const result = await reorderItineraryStops(itinId, sourceDayIndex, poiIds)
        if (result && onItineraryUpdate) {
          onItineraryUpdate(result)
        }
      }
    } else {
      // Cross-day move
      const newDays = [...days]
      const sourceDay = newDays[sourceDayIndex]
      const targetDay = newDays[targetDayIndex]

      const stopIndex = sourceDay.stops.findIndex((s) => s.poi_id === active.id)
      const [movedStop] = sourceDay.stops.splice(stopIndex, 1)

      const targetIndex = targetDay.stops.findIndex((s) => s.poi_id === over.id)
      const targetStop = targetDay.stops[targetIndex]

      // Calculate new time based on target stop's time
      let newStartTime: string | undefined
      let newEndTime: string | undefined

      if (targetStop && targetStop.arrival && targetStop.depart) {
        // Place before target stop - use 1 hour before target
        const targetMinutes = parseInt(targetStop.arrival.split(':')[0]) * 60 + parseInt(targetStop.arrival.split(':')[1])
        const newStartMinutes = Math.max(0, targetMinutes - 60)
        const newEndMinutes = targetMinutes
        newStartTime = `${String(Math.floor(newStartMinutes / 60)).padStart(2, '0')}:${String(newStartMinutes % 60).padStart(2, '0')}`
        newEndTime = `${String(Math.floor(newEndMinutes / 60)).padStart(2, '0')}:${String(newEndMinutes % 60).padStart(2, '0')}`
      }

      targetDay.stops.splice(targetIndex, 0, movedStop)
      setDays(newDays)

      // Call backend to move POI to different day with new time
      if (itinId) {
        const result = await schedulePOI(itinId, movedStop.poi_id, targetDayIndex, newStartTime, newEndTime, !newStartTime)
        if (result) {
          setDays(result.plan?.days || [])
          if (onItineraryUpdate) {
            onItineraryUpdate(result)
          }
        }
      }
    }
  }

  const handleScheduleClick = (stop: Stop, dayIndex: number) => {
    setScheduleDialog({ open: true, stop, dayIndex })
    setScheduleTab('time')

    // Pre-fill with current values
    if (stop.arrival) {
      setScheduleStartTime(stop.arrival)
    }
    if (stop.depart) {
      setScheduleEndTime(stop.depart)
    }

    // Set date if specific dates mode
    const dateType = data?.meta?.dates?.type
    if (dateType === 'specific') {
      try {
        const dayDate = new Date(days[dayIndex].date)
        setScheduleDate(dayDate)
      } catch { }
    } else {
      setScheduleDay(String(dayIndex + 1))
    }
  }

  const handleScheduleSave = async () => {
    if (!scheduleDialog.stop || !itinId) return

    // Validate time
    if (scheduleTab === 'time' && scheduleStartTime && scheduleEndTime) {
      if (scheduleEndTime <= scheduleStartTime) {
        toast('End time must be after start time')
        return
      }
    }

    let targetDayIndex = scheduleDialog.dayIndex

    // If specific dates and date changed, find the day index
    if (isSpecificDates && scheduleDate) {
      const selectedDateStr = format(scheduleDate, 'yyyy-MM-dd')
      const foundIndex = days.findIndex((d) => d.date === selectedDateStr)
      if (foundIndex !== -1) {
        targetDayIndex = foundIndex
      }
    } else if (!isSpecificDates && scheduleDay) {
      targetDayIndex = parseInt(scheduleDay) - 1
    }

    const result = await schedulePOI(
      itinId,
      scheduleDialog.stop.poi_id,
      targetDayIndex,
      scheduleTab === 'time' ? scheduleStartTime : undefined,
      scheduleTab === 'time' ? scheduleEndTime : undefined,
      scheduleTab === 'allday'
    )

    if (result) {
      setDays(result.plan?.days || [])
      if (onItineraryUpdate) {
        onItineraryUpdate(result)
      }
    }

    setScheduleDialog({ open: false, stop: null, dayIndex: -1 })
  }

  const handleDelete = async (stop: Stop) => {
    if (!itinId) return

    const newDays = days.map((day) => ({
      ...day,
      stops: day.stops.filter((s) => s.poi_id !== stop.poi_id),
    }))
    setDays(newDays)

    const result = await deletePOIFromItinerary(itinId, stop.poi_id)
    if (result) {
      setDays(result.plan?.days || [])
      if (onItineraryUpdate) {
        onItineraryUpdate(result)
      }
    }
  }

  const stripDaySuffix = (poiId: string): string => {
    return poiId.split('_day')[0]
  }

  type BudgetKey = 'any' | 'tight' | 'sensible' | 'upscale' | 'luxury'
  const budgetMap: Record<BudgetKey, string> = {
    any: '$–$$$$',
    tight: '$',
    sensible: '$$',
    upscale: '$$$',
    luxury: '$$$$',
  }
  const rawBudget = data?.meta?.preferences?.budget as string | undefined
  const budgetKey: BudgetKey = rawBudget && rawBudget in budgetMap ? (rawBudget as BudgetKey) : 'any'

  const pacingMap: Record<string, string> = {
    relaxed: 'Relaxed',
    balanced: 'Balanced',
    packed: 'Packed',
  }
  const rawPacing = data?.meta?.preferences?.pacing as string | undefined
  const pacingLabel = rawPacing && rawPacing in pacingMap ? pacingMap[rawPacing] : 'Balanced'

  const tripData = {
    title: data?.meta?.title || (data?.meta?.destination ? `${data.meta.destination} Trip` : 'Trip'),
    destination: data?.meta?.destination || 'Singapore',
    dates:
      typeof data?.meta?.dates === 'object' && data?.meta?.dates?.type === 'specific'
        ? `${data?.meta?.dates?.startDate || ''} — ${data?.meta?.dates?.endDate || ''}`
        : data?.meta?.dates?.days
          ? `${data?.meta?.dates?.days} days`
          : '5 days',
    travelers: data?.meta?.travelers ? `${(data.meta.travelers.adults || 0) + (data.meta.travelers.children || 0)} travelers` : '2 travelers',
    budget: budgetMap[budgetKey],
    pacing: pacingLabel,
  }

  const formatDayHeader = (day: Day) => {
    if (day.weekday && day.weekday.includes('Day')) {
      return day.weekday
    } else if (day.weekday) {
      try {
        const dateObj = new Date(day.date)
        return `${format(dateObj, 'MMM d')} • ${day.weekday}`
      } catch {
        return day.weekday
      }
    }
    return day.date
  }

  const dateType = data?.meta?.dates?.type
  const isSpecificDates = dateType === 'specific'

  // Get calendar default month
  const getCalendarDefaultMonth = () => {
    if (isSpecificDates && data?.meta?.dates?.startDate) {
      try {
        return startOfMonth(new Date(data.meta.dates.startDate))
      } catch { }
    }
    return new Date()
  }

  // Ideas section
  const ideasItems = (((data as any)?.meta?.ideas ?? (data as any)?.ideas ?? []) as Array<any>).map((i: any) => ({
    id: String(i.id ?? i.place_id ?? i.slug ?? crypto.randomUUID()),
    name: String(i.name ?? i.title ?? 'Untitled'),
    image: (i.image || (Array.isArray(i.images) ? i.images[0] : undefined)) as string | undefined,
  }))

  const activeStop = activeId ? days.flatMap((d) => d.stops).find((s) => s.poi_id === activeId) : null

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="sticky top-0 z-10 border-b bg-white p-6">
        <div className="mb-4">
          <h1 className="font-semibold">{tripData.title}</h1>
        </div>

        <ButtonGroup className="hidden sm:flex">
          <Button value="destination" variant="outline" className="rounded-full shadow-none">
            {tripData.destination}
          </Button>
          <Button value="dates" variant="outline" className="rounded-full shadow-none" onClick={() => setShowWhenDialog(true)}>
            {tripData.dates}
          </Button>
          <Button value="travelers" variant="outline" className="rounded-full shadow-none" onClick={() => setShowWhoDialog(true)}>
            {tripData.travelers}
          </Button>
          <Button value="budget" variant="outline" className="rounded-full shadow-none" onClick={() => setShowBudgetDialog(true)}>
            {tripData.budget}
          </Button>
          <Button value="pacing" variant="outline" className="rounded-full shadow-none" onClick={() => setShowPacingDialog(true)}>
            {tripData.pacing}
          </Button>
        </ButtonGroup>
      </div>

      <div className="flex-1 overflow-auto p-6" style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT}px` } : undefined}>
        {ideasItems.length > 0 && (
          <div className="mb-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ideas</h2>
            </div>
            <div className="space-y-4">
              {ideasItems.map((item: any) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                    {item.image ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={`https://picsum.photos/seed/${item.name}/300/300`}
                        // src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h6 className="mb-1 font-medium">{item.name}</h6>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs shadow-none"
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
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Itinerary</h2>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Accordion type="multiple" defaultValue={days.map((_, idx) => `day-${idx}`)} className="space-y-4">
              {days.map((day, dayIndex) => (
                <AccordionItem key={dayIndex} value={`day-${dayIndex}`} className="group overflow-hidden rounded-xl border">
                  <AccordionTrigger className="rounded-xl border-b px-4 py-3 hover:bg-gray-50 hover:no-underline [&>svg]:opacity-0 [&>svg]:group-hover:opacity-100">
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <h5 className="font-medium">{formatDayHeader(day)}</h5>
                        {/* {day.total_distance && <p className="text-muted-foreground/90 text-sm">{day.total_distance}km</p>} */}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <SortableContext items={day.stops.map((s) => s.poi_id)} strategy={verticalListSortingStrategy}>
                      <div className="divide-y">
                        {day.stops.map((stop) => (
                          <SortableStop
                            key={stop.poi_id}
                            stop={stop}
                            dayIndex={dayIndex}
                            onDetails={onOpenDetails ? () => onOpenDetails({ id: stripDaySuffix(stop.poi_id), name: stop.name }) : undefined}
                            onScheduleClick={(s) => handleScheduleClick(s, dayIndex)}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <DragOverlay dropAnimation={dropAnimationConfig}>{activeStop ? <StopOverlay stop={activeStop} /> : null}</DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialog.open} onOpenChange={(open) => setScheduleDialog({ open, stop: null, dayIndex: -1 })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule: {scheduleDialog.stop?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isSpecificDates ? (
              <div className="place-items-center">
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  numberOfMonths={isMobile ? 1 : 2}
                  className="p-0"
                  defaultMonth={getCalendarDefaultMonth()}
                  disabled={(date) => {
                    const startDate = new Date(data?.meta?.dates?.startDate || '')
                    const endDate = new Date(data?.meta?.dates?.endDate || '')
                    return date < startDate || date > endDate
                  }}
                />
              </div>
            ) : (
              <div className="place-items-center space-y-2">
                <Label className="text-sm">Which day?</Label>
                <Select value={scheduleDay} onValueChange={setScheduleDay}>
                  <SelectTrigger className="gap-12 rounded-full">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {days.map((_, idx) => (
                      <SelectItem key={idx} value={String(idx + 1)} className="rounded-lg">
                        Day {idx + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Separator />

            <Tabs value={scheduleTab} onValueChange={(v) => setScheduleTab(v as 'time' | 'allday')} className="items-center">
              <TabsList>
                <TabsTrigger value="time">Time</TabsTrigger>
                <TabsTrigger value="allday">All day</TabsTrigger>
              </TabsList>

              <TabsContent value="time" className="space-y-4">
                <div className="flex justify-between gap-8">
                  <div className="flex w-full gap-2">
                    <Label>Start</Label>
                    <Input
                      type="time"
                      value={scheduleStartTime}
                      onChange={(e) => setScheduleStartTime(e.target.value)}
                      className="rounded-full [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                  </div>
                  <div className="flex w-full gap-2">
                    <Label>End</Label>
                    <Input
                      type="time"
                      value={scheduleEndTime}
                      onChange={(e) => setScheduleEndTime(e.target.value)}
                      className="rounded-full [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="allday" />
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog({ open: false, stop: null, dayIndex: -1 })}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* When Dialog */}
      <WhenDialog
        open={showWhenDialog}
        onOpenChange={setShowWhenDialog}
        dateMode={dateMode}
        onDateModeChange={setDateMode}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        flexibleDays={flexibleDays}
        onFlexibleDaysChange={setFlexibleDays}
        flexibleMonth={flexibleMonth}
        onFlexibleMonthChange={setFlexibleMonth}
        onSave={async () => {
          if (!itinId) return

          const metaUpdates: Record<string, any> = {
            dates: {
              type: dateMode,
            },
          }

          if (dateMode === 'specific' && dateRange?.from && dateRange?.to) {
            metaUpdates.dates.startDate = format(dateRange.from, 'yyyy-MM-dd')
            metaUpdates.dates.endDate = format(dateRange.to, 'yyyy-MM-dd')
            metaUpdates.dates.days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
          } else if (dateMode === 'flexible') {
            metaUpdates.dates.days = parseInt(flexibleDays) || 1
            metaUpdates.dates.preferredMonth = flexibleMonth
          }

          const result = await updateItineraryMeta(itinId, metaUpdates)
          if (result) {
            onItineraryUpdate?.(result)
            toast.success('Dates updated')
          } else {
            toast.error('Failed to update dates')
          }
          setShowWhenDialog(false)
        }}
      />

      {/* Who Dialog */}
      <WhoDialog
        open={showWhoDialog}
        onOpenChange={setShowWhoDialog}
        adults={adults}
        onAdultsChange={setAdults}
        children={children}
        onChildrenChange={setChildren}
        pets={pets}
        onPetsChange={setPets}
        isMuslim={isMuslim}
        onIsMuslimChange={setIsMuslim}
        kidFriendly={kidFriendly}
        onKidFriendlyChange={setKidFriendly}
        petFriendly={petFriendly}
        onPetFriendlyChange={setPetFriendly}
        onSave={async () => {
          if (!itinId) return

          const metaUpdates = {
            travelers: {
              adults,
              children,
              pets,
            },
            flags: {
              is_muslim: isMuslim,
              kids_friendly: kidFriendly,
              pets_friendly: petFriendly,
            },
          }

          const result = await updateItineraryMeta(itinId, metaUpdates)
          if (result) {
            onItineraryUpdate?.(result)
            toast.success('Travelers updated')
          } else {
            toast.error('Failed to update travelers')
          }
          setShowWhoDialog(false)
        }}
      />

      {/* Budget Dialog */}
      <BudgetDialog
        open={showBudgetDialog}
        onOpenChange={setShowBudgetDialog}
        budget={budget}
        onBudgetChange={setBudget}
        onSave={async () => {
          if (!itinId) return

          const metaUpdates = {
            preferences: {
              ...data?.meta?.preferences,
              budget,
            },
          }

          const result = await updateItineraryMeta(itinId, metaUpdates)
          if (result) {
            onItineraryUpdate?.(result)
            toast.success('Budget updated')
          } else {
            toast.error('Failed to update budget')
          }
          setShowBudgetDialog(false)
        }}
      />

      {/* Pacing Dialog */}
      <PacingDialog
        open={showPacingDialog}
        onOpenChange={setShowPacingDialog}
        pacing={pacing}
        onPacingChange={setPacing}
        onSave={async () => {
          if (!itinId) return

          const metaUpdates = {
            preferences: {
              ...data?.meta?.preferences,
              pacing,
            },
          }

          const result = await updateItineraryMeta(itinId, metaUpdates)
          if (result) {
            onItineraryUpdate?.(result)
            toast.success('Pacing updated')
          } else {
            toast.error('Failed to update pacing')
          }
          setShowPacingDialog(false)
        }}
      />
    </div>
  )
}
