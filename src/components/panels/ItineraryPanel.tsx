import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import { EditHotelsPoisDialog, PacingDialog, WhenDialog, WhoDialog } from '@/components/dialogs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatDateRange } from '@/lib/date-range'
import { POIIcon } from '@/lib/poi-icons'
import { cn, stripDaySuffix } from '@/lib/utils'
import {
  deletePOIFromItinerary,
  recomputeItinerary,
  reorderItineraryStops,
  schedulePOI,
  updateItineraryMeta,
} from '@/services/api'
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format, startOfMonth } from 'date-fns'
import { Clock, MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { FallbackImage } from '../ui/fallback-image'

interface Stop {
  poiId: string
  name: string
  role: string
  images?: string[] | null
  themes?: string[] | null
  arrival?: string
  startService?: string
  depart?: string
  latitude?: number
  longitude?: number
}

interface Day {
  date?: string
  weekday?: string
  day?: number
  label?: string
  stops: Stop[]
  meals?: number
  totalDistance?: number
}

interface ItineraryPanelProps {
  className?: string
  data?: {
    itinId?: string
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
  stopIndex,
  onDetails,
  onScheduleClick,
  onDelete,
}: {
  stop: Stop
  dayIndex: number
  stopIndex: number
  onDetails?: (stop: Stop) => void
  onScheduleClick?: (stop: Stop) => void
  onDelete?: (stop: Stop) => void
}) {
  const sortableId = `${dayIndex}_${stopIndex}_${stop.poiId}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { dayIndex, stopIndex, stop },
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
        'group relative flex items-center items-start rounded-xl border p-2 transition-colors',
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
      <div className='flex flex-1 items-center gap-3 min-w-0'>
        <FallbackImage
          src={stop.images?.[0] ? `${stop.images[0]}=s300` : undefined}
          alt={stop.name}
          className='size-12 flex-shrink-0 rounded-lg object-cover'
        />
        <div className='min-w-0 flex-1 space-y-1'>
          <div className='flex items-center gap-2 min-w-0'>
            <POIIcon role={stop.role} themes={stop.themes} className='size-3.5 flex-shrink-0' />
            <h6 className='font-medium truncate min-w-0'>{stop.name}</h6>
          </div>
          {onScheduleClick && (
            <div
              className='hover:text-primary text-muted-foreground flex w-fit cursor-pointer items-center gap-2 text-sm'
              onClick={(e) => {
                e.stopPropagation()
                onScheduleClick(stop)
              }}
              role='button'
            >
              <Clock className='size-3' />
              <span>
                {stop.arrival
                  ? `${formatTime12h(stop.arrival)} - ${formatTime12h(stop.depart || stop.arrival)}`
                  : 'Set time'}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className='flex items-center gap-2 flex-shrink-0'>
        {onDelete && isHovered && (
          <Button
            variant='ghost'
            size='sm'
            className='text-muted-foreground h-8 cursor-pointer px-2 hover:text-black'
            onClick={(e) => {
              e.stopPropagation()
              onDelete(stop)
            }}
          >
            <Trash2 className='size-4' />
          </Button>
        )}
        {onDetails && (
          <Button
            variant='outline'
            size='sm'
            className='cursor-pointer rounded-full text-xs'
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
    <div className='flex items-start gap-3 rounded-lg bg-white p-3 shadow-lg'>
      <div className='min-w-0 flex-1'>
        <h6 className='mb-1 font-medium'>{stop.name}</h6>
        {stop.arrival && (
          <div className='text-muted-foreground flex w-fit items-center gap-1 text-sm'>
            <Clock className='size-3' />
            <span>
              {stop.arrival} - {stop.depart}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Sortable idea item that can be dragged into days
function SortableIdea({
  idea,
  onDetails,
}: {
  idea: { id: string; name: string; images?: string[]; role: string; themes?: string[] }
  onDetails?: (idea: { id: string; name: string }) => void
}) {
  const sortableId = `idea_${idea.id}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { isIdea: true, idea },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative flex items-center rounded-xl border p-3 transition-colors',
        isDragging && 'opacity-50',
        'cursor-grab hover:bg-gray-50 active:cursor-grabbing'
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (!target.closest('button') && onDetails) {
          e.stopPropagation()
          onDetails({ id: idea.id, name: idea.name })
        }
      }}
    >
      <div className='flex flex-1 items-center gap-4'>
        <FallbackImage
          src={idea.images?.[0] ? `${idea.images[0]}=s300` : undefined}
          alt={idea.name}
          className='size-12 flex-shrink-0 rounded-lg object-cover'
        />
        <div className='flex items-center gap-2'>
          <POIIcon role={idea.role} themes={idea.themes} className='size-3.5 flex-shrink-0' />
          <h6 className='font-medium'>{idea.name}</h6>
        </div>
      </div>
      {onDetails && (
        <Button
          variant='outline'
          size='sm'
          className='cursor-pointer rounded-full text-xs'
          onClick={(e) => {
            e.stopPropagation()
            onDetails({ id: idea.id, name: idea.name })
          }}
        >
          Details
        </Button>
      )}
    </div>
  )
}

function IdeaOverlay({
  idea,
}: {
  idea: { id: string; name: string; images?: string[]; role: string; themes?: string[] }
}) {
  return (
    <div className='flex items-start gap-3 rounded-lg bg-white p-3 shadow-lg'>
      <FallbackImage
        src={idea.images?.[0] ? `${idea.images[0]}=s300` : undefined}
        alt={idea.name}
        className='size-10 flex-shrink-0 rounded-lg object-cover'
      />
      <div className='min-w-0 flex-1'>
        <h6 className='mb-1 font-medium'>{idea.name}</h6>
      </div>
    </div>
  )
}

// Droppable area for empty days or as a drop target at the end of a day's stops
function DroppableArea({ dayIndex, isEmpty = false }: { dayIndex: number; isEmpty?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-day-${dayIndex}`,
    data: { dayIndex, stopIndex: isEmpty ? 0 : undefined, isDroppableArea: true },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[60px] items-center justify-center rounded-xl border-2 border-dashed transition-colors',
        isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20',
        isEmpty ? 'my-2' : 'mt-2'
      )}
    >
      <span className='text-muted-foreground text-sm'>{isEmpty ? 'Drop POIs here' : 'Drop here to add at end'}</span>
    </div>
  )
}

export default function ItineraryPanel({
  className = '',
  data,
  onOpenDetails,
  onItineraryUpdate,
}: ItineraryPanelProps) {
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

  // Dialog state for When, Who, Budget, Pacing, Edit Hotels/POIs
  const [showWhenDialog, setShowWhenDialog] = useState(false)
  const [showWhoDialog, setShowWhoDialog] = useState(false)
  // const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showPacingDialog, setShowPacingDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

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
  const [isMuslim, setIsMuslim] = useState(data?.meta?.flags?.isMuslim || false)
  const [wheelchairAccessible, setWheelchairAccessible] = useState(data?.meta?.flags?.wheelchairAccessible || false)
  const [kidFriendly, setKidFriendly] = useState(data?.meta?.flags?.kidsFriendly || false)
  const [petFriendly, setPetFriendly] = useState(data?.meta?.flags?.petsFriendly || false)

  // Budget and Pacing state
  // const [budget, setBudget] = useState(data?.meta?.preferences?.budget || 'any')
  const [pacing, setPacing] = useState(data?.meta?.preferences?.pacing || 'balanced')

  // Recompute loading state
  const [isRecomputing, setIsRecomputing] = useState(false)
  const [recomputingDayIndex, setRecomputingDayIndex] = useState<number | null>(null)

  // Button group scroll ref
  const buttonGroupRef = useRef<HTMLDivElement>(null)

  const itinId = data?.itinId || localStorage.getItem('fika:lastChatId') || ''

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

    // Check if dragging an idea to a day
    if (activeData.isIdea) {
      const idea = activeData.idea
      const targetDayIndex = overData.dayIndex

      if (targetDayIndex === undefined) return

      // Check if dropping onto a droppable area or a day's stop
      const isDroppableArea = overData.isDroppableArea === true

      // Create a new stop from the idea
      const newStop: Stop = {
        poiId: idea.id,
        name: idea.name,
        role: idea.role || 'attraction',
        images: idea.images,
        themes: idea.themes,
      }

      // Add to the target day
      const newDays = [...days]
      const targetDay = newDays[targetDayIndex]
      const targetIndex = isDroppableArea
        ? targetDay.stops.length
        : overData.stopIndex !== undefined
          ? overData.stopIndex
          : targetDay.stops.length

      targetDay.stops.splice(targetIndex, 0, newStop)
      setDays(newDays)

      // Call backend to add the POI to the day
      if (itinId) {
        const result = await schedulePOI(
          itinId,
          idea.id,
          targetDayIndex,
          undefined,
          undefined,
          true // all day by default
        )
        if (result) {
          setDays(result.plan?.days || [])
          if (onItineraryUpdate) {
            onItineraryUpdate(result)
          }
        }
      }
      return
    }

    const sourceDayIndex = activeData.dayIndex
    const targetDayIndex = overData.dayIndex

    // Don't allow moving accommodation
    const activeStop = activeData.stop as Stop
    if (activeStop?.role === 'accommodation') {
      return
    }

    // Check if dropping onto a droppable area
    const isDroppableArea = overData.isDroppableArea === true

    // Same day reorder (only if not dropping onto droppable area)
    if (sourceDayIndex === targetDayIndex && !isDroppableArea) {
      const day = days[sourceDayIndex]
      const oldIndex = activeData.stopIndex
      const newIndex = overData.stopIndex

      if (oldIndex === undefined || newIndex === undefined) return

      const newDays = [...days]
      newDays[sourceDayIndex].stops = arrayMove(day.stops, oldIndex, newIndex)
      setDays(newDays)

      if (itinId) {
        const poiIds = newDays[sourceDayIndex].stops.map((s) => s.poiId)
        const result = await reorderItineraryStops(itinId, sourceDayIndex, poiIds)
        if (result && onItineraryUpdate) {
          onItineraryUpdate(result)
        }
      }
    } else {
      // Cross-day move or dropping onto a droppable area
      const newDays = [...days]
      const sourceDay = newDays[sourceDayIndex]
      const targetDay = newDays[targetDayIndex]

      const stopIndex = activeData.stopIndex
      if (stopIndex === undefined) return
      const [movedStop] = sourceDay.stops.splice(stopIndex, 1)

      // If dropping on droppable area, add at end; otherwise insert at target position
      const targetIndex = isDroppableArea
        ? targetDay.stops.length
        : overData.stopIndex !== undefined
          ? overData.stopIndex
          : targetDay.stops.length
      const targetStop = targetDay.stops[targetIndex]

      // Calculate new time based on target stop's time
      let newStartTime: string | undefined
      let newEndTime: string | undefined

      if (targetStop && targetStop.arrival && targetStop.depart) {
        // Place before target stop - use 1 hour before target
        const targetMinutes =
          parseInt(targetStop.arrival.split(':')[0]) * 60 + parseInt(targetStop.arrival.split(':')[1])
        const newStartMinutes = Math.max(0, targetMinutes - 60)
        const newEndMinutes = targetMinutes
        newStartTime = `${String(Math.floor(newStartMinutes / 60)).padStart(2, '0')}:${String(newStartMinutes % 60).padStart(2, '0')}`
        newEndTime = `${String(Math.floor(newEndMinutes / 60)).padStart(2, '0')}:${String(newEndMinutes % 60).padStart(2, '0')}`
      }

      targetDay.stops.splice(targetIndex, 0, movedStop)
      setDays(newDays)

      // Call backend to move POI to different day with new time
      if (itinId) {
        const result = await schedulePOI(
          itinId,
          movedStop.poiId,
          targetDayIndex,
          newStartTime,
          newEndTime,
          !newStartTime
        )
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
    if (dateType === 'specific' && days[dayIndex].date) {
      try {
        const dayDate = new Date(days[dayIndex].date!)
        setScheduleDate(dayDate)
      } catch {}
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
      scheduleDialog.stop.poiId,
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
      stops: day.stops.filter((s) => s.poiId !== stop.poiId),
    }))
    setDays(newDays)

    const result = await deletePOIFromItinerary(itinId, stop.poiId)
    if (result) {
      setDays(result.plan?.days || [])
      if (onItineraryUpdate) {
        onItineraryUpdate(result)
      }
    }
  }

  // Recompute handlers
  const handleRecomputeFull = async () => {
    if (!itinId || isRecomputing) return
    setIsRecomputing(true)
    const toastId = toast.loading('Regenerating itinerary...', { dismissible: true })
    try {
      const result = await recomputeItinerary(itinId, 'full')
      toast.dismiss(toastId)
      if (result) {
        setDays(result.plan?.days || [])
        if (onItineraryUpdate) {
          onItineraryUpdate(result)
        }
        toast.success('Itinerary regenerated successfully')
      } else {
        toast.error('Failed to regenerate itinerary')
      }
    } catch {
      toast.dismiss(toastId)
      toast.error('Failed to regenerate itinerary')
    } finally {
      setIsRecomputing(false)
    }
  }

  const handleRecomputePartial = async () => {
    if (!itinId || isRecomputing) return
    setIsRecomputing(true)
    const toastId = toast.loading('Optimizing itinerary...', { dismissible: true })
    try {
      const result = await recomputeItinerary(itinId, 'partial')
      toast.dismiss(toastId)
      if (result) {
        setDays(result.plan?.days || [])
        if (onItineraryUpdate) {
          onItineraryUpdate(result)
        }
        toast.success('Itinerary optimized successfully')
      } else {
        toast.error('Failed to optimize itinerary')
      }
    } catch {
      toast.dismiss(toastId)
      toast.error('Failed to optimize itinerary')
    } finally {
      setIsRecomputing(false)
    }
  }

  const handleRecomputeDay = async (dayIndex: number) => {
    if (!itinId || isRecomputing) return
    setIsRecomputing(true)
    setRecomputingDayIndex(dayIndex)
    const toastId = toast.loading(`Optimizing Day ${dayIndex + 1}...`, { dismissible: true })
    try {
      const result = await recomputeItinerary(itinId, 'single_day', dayIndex)
      toast.dismiss(toastId)
      if (result) {
        setDays(result.plan?.days || [])
        if (onItineraryUpdate) {
          onItineraryUpdate(result)
        }
        toast.success(`Day ${dayIndex + 1} optimized successfully`)
      } else {
        toast.error(`Failed to optimize Day ${dayIndex + 1}`)
      }
    } catch {
      toast.dismiss(toastId)
      toast.error(`Failed to optimize Day ${dayIndex + 1}`)
    } finally {
      setIsRecomputing(false)
      setRecomputingDayIndex(null)
    }
  }

  const pacingMap: Record<string, string> = {
    relaxed: 'Relaxed',
    balanced: 'Balanced',
    packed: 'Packed',
  }
  const rawPacing = data?.meta?.preferences?.pacing as string | undefined
  const pacingLabel = rawPacing && rawPacing in pacingMap ? pacingMap[rawPacing] : 'Balanced'

  // Handle multi-city destinations
  const destinations = data?.meta?.destinations || []
  const destinationDisplay =
    destinations.length > 0
      ? destinations.map((d: any) => d.city || d.name || d.destination).join(' & ')
      : data?.meta?.destination || 'Singapore'

  const tripData = {
    title: data?.meta?.title || (destinationDisplay ? `${destinationDisplay} Trip` : 'Trip'),
    destination: destinationDisplay,
    dates:
      typeof data?.meta?.dates === 'object' && data?.meta?.dates?.type === 'specific'
        ? formatDateRange(data?.meta?.dates?.startDate, data?.meta?.dates?.endDate)
        : data?.meta?.dates?.days
          ? `${data?.meta?.dates?.days} days`
          : '5 days',
    travelers: data?.meta?.travelers
      ? `${(data.meta.travelers.adults || 0) + (data.meta.travelers.children || 0)} travelers`
      : '2 travelers',
    pacing: pacingLabel,
  }

  const dateType = data?.meta?.dates?.type
  const isSpecificDates = dateType === 'specific'

  const formatDayHeader = (day: Day, dayIndex: number) => {
    // For flexible dates, show only "Day X"
    if (!isSpecificDates) {
      return `Day ${day.day || dayIndex + 1}`
    }

    // For specific dates, show date and weekday with day number
    if (day.date && day.weekday) {
      try {
        const dateObj = new Date(day.date)
        const dateStr = format(dateObj, 'MMM d')
        return (
          <div className='flex items-baseline gap-2'>
            <span>Day {day.day || dayIndex + 1}</span>
            <span className='text-muted-foreground text-sm font-normal'>
              {dateStr} • {day.weekday}
            </span>
          </div>
        )
      } catch {
        return `Day ${day.day || dayIndex + 1}`
      }
    }

    // Fallback
    if (day.label) return day.label
    if (day.weekday?.includes('Day')) return day.weekday
    return `Day ${day.day || dayIndex + 1}`
  }

  // Get calendar default month
  const getCalendarDefaultMonth = () => {
    if (isSpecificDates && data?.meta?.dates?.startDate) {
      try {
        return startOfMonth(new Date(data.meta.dates.startDate))
      } catch {}
    }
    return new Date()
  }

  // Ideas section
  const ideasItems = (((data as any)?.meta?.ideas ?? (data as any)?.ideas ?? []) as Array<any>).map((i: any) => ({
    id: String(i.id ?? i.place_id ?? i.slug ?? crypto.randomUUID()),
    name: String(i.name ?? i.title ?? 'Untitled'),
    images: Array.isArray(i.images) ? i.images : i.image ? [i.image] : [],
    role: i.role || 'attraction',
    themes: i.themes || [],
  }))

  // Extract poiId from sortable id format (dayIndex_stopIndex_poiId or idea_poiId)
  const isActiveIdea = activeId?.startsWith('idea_')
  const activePoiId = activeId
    ? isActiveIdea
      ? activeId.replace('idea_', '')
      : activeId.replace(/^\d+_\d+_/, '')
    : null
  const activeStop =
    activePoiId && !isActiveIdea ? days.flatMap((d) => d.stops).find((s) => s.poiId === activePoiId) : null
  const activeIdea = activePoiId && isActiveIdea ? ideasItems.find((i: any) => i.id === activePoiId) : null

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className='sticky top-0 z-10 border-b bg-white p-6'>
        <div className='mb-4'>
          <h1 className='font-semibold'>{tripData.title}</h1>
        </div>

        <div
          ref={buttonGroupRef}
          className='flex overflow-x-auto scrollbar-hide pb-1'
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <ButtonGroup className='flex flex-nowrap'>
            <Button
              value='destination'
              variant='outline'
              className='rounded-full shadow-none flex-shrink-0'
              onClick={() => toast('Changing trip destination is not allowed.')}
            >
              {tripData.destination}
            </Button>
            <Button
              value='dates'
              variant='outline'
              className='rounded-full shadow-none flex-shrink-0'
              onClick={() => setShowWhenDialog(true)}
            >
              {tripData.dates}
            </Button>
            <Button
              value='travelers'
              variant='outline'
              className='rounded-full shadow-none flex-shrink-0'
              onClick={() => setShowWhoDialog(true)}
            >
              {tripData.travelers}
            </Button>
            <Button
              value='pacing'
              variant='outline'
              className='rounded-full shadow-none flex-shrink-0'
              onClick={() => setShowPacingDialog(true)}
            >
              {tripData.pacing}
            </Button>
            <Button
              value='recompute'
              variant='outline'
              className='rounded-full shadow-none flex-shrink-0 gap-1'
              onClick={handleRecomputeFull}
              disabled={isRecomputing}
            >
              <RefreshCw className={cn('size-3.5', isRecomputing && 'animate-spin')} />
              Regenerate
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button value='more' variant='outline' className='rounded-full shadow-none flex-shrink-0'>
                  <MoreHorizontal className='size-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>Edit Hotels & Places</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        </div>
      </div>

      <div
        className='flex-1 overflow-auto p-6'
        style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT}px` } : undefined}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {ideasItems.length > 0 && (
            <div className='mb-8'>
              <div className='mb-6 flex items-center justify-between'>
                <h2 className='text-lg font-semibold'>Ideas</h2>
                <span className='text-muted-foreground text-sm'>Drag to add to itinerary</span>
              </div>
              <SortableContext
                items={ideasItems.map((item: any) => `idea_${item.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className='space-y-2'>
                  {ideasItems.map((item: any) => (
                    <SortableIdea key={item.id} idea={item} onDetails={onOpenDetails} />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}

          <div>
            <div className='mb-6 flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>Itinerary</h2>
              <Button
                variant='ghost'
                size='sm'
                className='gap-1 text-muted-foreground hover:text-foreground'
                onClick={handleRecomputePartial}
                disabled={isRecomputing}
              >
                <RefreshCw className={cn('size-3.5', isRecomputing && !recomputingDayIndex && 'animate-spin')} />
                Optimize
              </Button>
            </div>

            <Accordion type='multiple' defaultValue={days.map((_, idx) => `day-${idx}`)} className='space-y-4'>
              {days.map((day, dayIndex) => (
                <AccordionItem key={dayIndex} value={`day-${dayIndex}`} className='group overflow-hidden rounded-xl'>
                  <div className='relative'>
                    <AccordionTrigger className='hover:bg-muted-foreground/5 rounded-xl p-3 hover:no-underline w-full'>
                      <div className='flex items-center gap-3'>
                        <div className='text-left'>
                          <h5 className='font-medium'>{formatDayHeader(day, dayIndex)}</h5>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground'
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRecomputeDay(dayIndex)
                      }}
                      disabled={isRecomputing}
                    >
                      <RefreshCw className={cn('size-3.5', recomputingDayIndex === dayIndex && 'animate-spin')} />
                    </Button>
                  </div>
                  <AccordionContent className='px-1 pb-0'>
                    <SortableContext
                      items={day.stops.map((s, stopIndex) => `${dayIndex}_${stopIndex}_${s.poiId}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className='space-y-2 divide-y'>
                        {day.stops.map((stop, stopIndex) => (
                          <SortableStop
                            key={`${dayIndex}_${stopIndex}_${stop.poiId}`}
                            stop={stop}
                            dayIndex={dayIndex}
                            stopIndex={stopIndex}
                            onDetails={
                              onOpenDetails
                                ? () => onOpenDetails({ id: stripDaySuffix(stop.poiId), name: stop.name })
                                : undefined
                            }
                            onScheduleClick={(s) => handleScheduleClick(s, dayIndex)}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                      {/* Droppable area for empty days or to add at end */}
                      {day.stops.length === 0 ? (
                        <DroppableArea dayIndex={dayIndex} isEmpty />
                      ) : (
                        activeId && <DroppableArea dayIndex={dayIndex} />
                      )}
                    </SortableContext>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <DragOverlay dropAnimation={dropAnimationConfig}>
              {activeStop ? <StopOverlay stop={activeStop} /> : null}
              {activeIdea ? <IdeaOverlay idea={activeIdea} /> : null}
            </DragOverlay>
          </div>
        </DndContext>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialog.open} onOpenChange={(open) => setScheduleDialog({ open, stop: null, dayIndex: -1 })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule: {scheduleDialog.stop?.name}</DialogTitle>
          </DialogHeader>

          <div className='space-y-4'>
            {isSpecificDates ? (
              <div className='place-items-center'>
                <Calendar
                  mode='single'
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  numberOfMonths={isMobile ? 1 : 2}
                  className='p-0'
                  defaultMonth={getCalendarDefaultMonth()}
                  disabled={(date) => {
                    const startDate = new Date(data?.meta?.dates?.startDate || '')
                    const endDate = new Date(data?.meta?.dates?.endDate || '')
                    return date < startDate || date > endDate
                  }}
                />
              </div>
            ) : (
              <div className='place-items-center space-y-2'>
                <Label className='text-sm'>Which day?</Label>
                <Select value={scheduleDay} onValueChange={setScheduleDay}>
                  <SelectTrigger className='gap-12 rounded-full'>
                    <SelectValue placeholder='Select day' />
                  </SelectTrigger>
                  <SelectContent className='rounded-xl'>
                    {days.map((_, idx) => (
                      <SelectItem key={idx} value={String(idx + 1)} className='rounded-lg'>
                        Day {idx + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Separator />

            <Tabs
              value={scheduleTab}
              onValueChange={(v) => setScheduleTab(v as 'time' | 'allday')}
              className='items-center'
            >
              <TabsList>
                <TabsTrigger value='time'>Time</TabsTrigger>
                <TabsTrigger value='allday'>All day</TabsTrigger>
              </TabsList>

              <TabsContent value='time' className='space-y-4'>
                <div className='flex justify-between gap-8'>
                  <div className='flex w-full gap-2'>
                    <Label>Start</Label>
                    <Input
                      type='time'
                      value={scheduleStartTime}
                      onChange={(e) => setScheduleStartTime(e.target.value)}
                      className='rounded-full [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                    />
                  </div>
                  <div className='flex w-full gap-2'>
                    <Label>End</Label>
                    <Input
                      type='time'
                      value={scheduleEndTime}
                      onChange={(e) => setScheduleEndTime(e.target.value)}
                      className='rounded-full [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='allday' />
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setScheduleDialog({ open: false, stop: null, dayIndex: -1 })}>
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
            metaUpdates.dates.days =
              Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
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
        wheelchairAccessible={wheelchairAccessible}
        onWheelchairAccessibleChange={setWheelchairAccessible}
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
              isMuslim: isMuslim,
              kidsFriendly: kidFriendly,
              petsFriendly: petFriendly,
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
      {/* <BudgetDialog
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
      /> */}

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

      {/* Edit Hotels & POIs Dialog */}
      <EditHotelsPoisDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </div>
  )
}
