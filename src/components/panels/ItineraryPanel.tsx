import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import { EditHotelsPoisDialog, PacingDialog, WhenDialog, WhoDialog } from '@/components/dialogs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EditableTitle } from '@/components/ui/editable-title'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatDateRange } from '@/lib/date-range'
import { cacheItinerary, dispatchItineraryUpdate } from '@/lib/itinerary-storage'
import { POIIcon } from '@/lib/poi-icons'
import { cn } from '@/lib/utils'
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
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DropAnimation,
  type UniqueIdentifier,
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
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { FallbackImage } from '@/components/ui/fallback-image'

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
  hotelEventType?: string
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
  // Use stable ID based only on poiId - dayIndex/stopIndex stored in data for reference
  const sortableId = `stop_${stop.poiId}`
  const isAccommodation = stop.role === 'accommodation'
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { dayIndex, stopIndex, stop, type: 'stop' },
    disabled: isAccommodation,
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
      {...(isAccommodation ? {} : listeners)}
      className={cn(
        'group relative flex items-center items-center rounded-xl border p-2 transition-colors hover:bg-gray-50',
        isDragging && 'opacity-50',
        isAccommodation ? '' : 'cursor-grab active:cursor-grabbing'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (stop.role === 'accommodation') {
          toast('Changing hotel is not supported currently.');
        } else {
          const target = e.target as HTMLElement;
          if (!target.closest('button') && !target.closest('[role="button"]') && onDetails) {
            e.stopPropagation();
            onDetails(stop);
          }
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
            {(stop.role === 'accommodation' &&
              <h6 className='font-normal text-muted-foreground'>
                {
                  stop.hotelEventType === 'checkin' ? 'Check in at' : stop.hotelEventType === 'checkout' ? 'Check out at' : stop.hotelEventType === 'stay' ? 'Stay at' : 'At'
                }
              </h6>) || null}
            <h6 className='font-medium truncate min-w-0'>{stop.name}</h6>
          </div>
          {onScheduleClick && stop.hotelEventType !== 'stay' && (
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
      <div className='flex items-center gap-2 flex-shrink-0 '>
        {onDelete && isHovered && stop.role !== "accommodation" && (
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
    <div className='flex items-center gap-3 rounded-xl border bg-white p-2 shadow-lg'>
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
    data: { isIdea: true, idea, type: 'idea' },
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
    <div className='flex items-center gap-4 rounded-xl border bg-white p-3 shadow-lg'>
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
  )
}

// Droppable area for empty days or as a drop target at the end of a day's stops
function DroppableArea({ dayIndex, isEmpty = false }: { dayIndex: number; isEmpty?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-day-${dayIndex}`,
    data: { dayIndex, stopIndex: isEmpty ? 0 : undefined, isDroppableArea: true, type: 'container' },
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
  const [isRecalculatingTimes, setIsRecalculatingTimes] = useState(false)

  // Regenerate warning dialog
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false)

  // Title editing state
  const [isSavingTitle, setIsSavingTitle] = useState(false)

  // Button group scroll ref
  const buttonGroupRef = useRef<HTMLDivElement>(null)

  const itinId = data?.itinId || localStorage.getItem('fika:lastItineraryId') || ''

  // Handle title update - calls backend API and syncs localStorage
  const handleTitleUpdate = useCallback(
    async (newTitle: string) => {
      if (!itinId || isSavingTitle) return

      setIsSavingTitle(true)
      try {
        const result = await updateItineraryMeta(itinId, { title: newTitle })
        if (result) {
          // Update localStorage cache
          cacheItinerary(result)
          // Dispatch event for other components
          dispatchItineraryUpdate(result)
          // Notify parent component
          if (onItineraryUpdate) {
            onItineraryUpdate(result)
          }
          toast.success('Trip name updated')
        } else {
          toast.error('Failed to update trip name')
        }
      } catch (error) {
        console.error('Failed to update title:', error)
        toast.error('Failed to update trip name')
      } finally {
        setIsSavingTitle(false)
      }
    },
    [itinId, isSavingTitle, onItineraryUpdate]
  )

  useEffect(() => {
    if (data?.plan?.days) {
      setDays(data.plan.days)
    }
  }, [data?.plan?.days])

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Track last over ID for smoother collision detection
  const lastOverId = useRef<UniqueIdentifier | null>(null)
  const recentlyMovedToNewContainer = useRef(false)

  // Ref to track the original day index when drag started (before handleDragOver moves the item)
  const dragStartDayIndexRef = useRef<number | null>(null)

  // Ref to track latest days state for use in async handlers (updated synchronously in setDays callbacks)
  const daysRef = useRef<Day[]>(days)
  useEffect(() => {
    daysRef.current = days
  }, [days])

  // Helper to find which day a stop belongs to
  // Uses daysRef.current to get the latest state (important for handleDragEnd after handleDragOver)
  const findContainer = useCallback((id: UniqueIdentifier): number | null => {
    const idStr = String(id)
    // Check if it's an idea
    if (idStr.startsWith('idea_')) {
      return -1 // Ideas container
    }
    // Check if it's a droppable area
    if (idStr.startsWith('droppable-day-')) {
      return parseInt(idStr.replace('droppable-day-', ''))
    }
    // Check if it's a stop (format: stop_<poiId>)
    if (idStr.startsWith('stop_')) {
      const poiId = idStr.replace('stop_', '')
      // Use daysRef.current to get latest state after handleDragOver
      const currentDays = daysRef.current
      // Find which day contains this POI
      for (let dayIndex = 0; dayIndex < currentDays.length; dayIndex++) {
        const day = currentDays[dayIndex]
        if (day.stops.some((s) => s.poiId === poiId)) {
          return dayIndex
        }
      }
    }
    return null
  }, [])

  // Custom collision detection optimized for multiple containers (like dnd-kit example)
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // Start by finding any intersecting droppable with pointer
      const pointerIntersections = pointerWithin(args)
      const intersections = pointerIntersections.length > 0 ? pointerIntersections : rectIntersection(args)

      // Filter out the active/dragged item from intersections
      const filteredIntersections = intersections.filter((entry) => entry.id !== activeId)

      let overId = getFirstCollision(filteredIntersections, 'id')

      // If no valid intersection found (excluding active item), try rect intersection
      if (overId == null) {
        const rectIntersections = rectIntersection(args).filter((entry) => entry.id !== activeId)
        overId = getFirstCollision(rectIntersections, 'id')
      }

      if (overId != null) {
        // If over a droppable-day container, find the closest item within it
        if (String(overId).startsWith('droppable-day-')) {
          const dayIndex = parseInt(String(overId).replace('droppable-day-', ''))
          const dayStops = days[dayIndex]?.stops || []

          if (dayStops.length > 0) {
            // Get all stop IDs for this day using stable format (exclude the active item)
            const stopIds = dayStops.map((stop) => `stop_${stop.poiId}`).filter((id) => id !== activeId)

            if (stopIds.length > 0) {
              // Find closest stop within this day
              const closestInDay = closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter((container) =>
                  stopIds.includes(String(container.id))
                ),
              })

              if (closestInDay.length > 0) {
                overId = closestInDay[0].id
              }
            }
          }
        }

        lastOverId.current = overId
        return [{ id: overId }]
      }

      // When moving to new container, layout may shift
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId
      }

      // Return last match if nothing found
      return lastOverId.current ? [{ id: lastOverId.current }] : []
    },
    [activeId, days]
  )

  // Reset recentlyMovedToNewContainer after render
  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false
    })
  }, [days])

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
    // Capture the original day index at drag start (before handleDragOver moves anything)
    const originalDayIndex = event.active.data.current?.dayIndex
    dragStartDayIndexRef.current = originalDayIndex ?? null
    console.log('[DnD] handleDragStart:', {
      id: event.active.id,
      dayIndex: originalDayIndex,
      data: event.active.data.current,
    })
  }

  // Handle drag over for cross-container visual feedback (like dnd-kit MultipleContainers)
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    const overId = over?.id

    if (overId == null) return

    const activeData = active.data.current
    if (!activeData) return

    const overContainer = findContainer(overId)
    const activeContainer = activeData.isIdea ? -1 : findContainer(active.id)

    console.log('[DnD] handleDragOver:', { activeContainer, overContainer, activeId: active.id, overId })

    if (overContainer === null || activeContainer === null) return

    // Same container - let dnd-kit handle within-container sorting
    if (overContainer === activeContainer) return

    // Handle ideas being dragged to days
    if (activeData.isIdea && overContainer >= 0) {
      const idea = activeData.idea
      const targetDayIndex = overContainer

      setDays((prevDays) => {
        // Check if idea is already in the target day
        const existingInTarget = prevDays[targetDayIndex].stops.find((s) => s.poiId === idea.id)
        if (existingInTarget) {
          // Already in target day, no state change needed
          return prevDays
        }

        const newDays = prevDays.map((day) => ({
          ...day,
          stops: day.stops.filter((s) => s.poiId !== idea.id), // Remove if already added elsewhere
        }))

        const targetDay = { ...newDays[targetDayIndex], stops: [...newDays[targetDayIndex].stops] }
        const overData = over?.data.current
        const overIdStr = String(overId)

        // Calculate insertion index
        let newIndex: number
        if (overIdStr.startsWith('droppable-day-') || overData?.isDroppableArea) {
          newIndex = targetDay.stops.length
        } else if (overIdStr.startsWith('stop_')) {
          // Extract poiId from the over ID and find its current position
          const overPoiId = overIdStr.replace('stop_', '')
          const overIndex = targetDay.stops.findIndex((s) => s.poiId === overPoiId)

          if (overIndex >= 0) {
            // Check if dragging below the over item
            const isBelowOverItem =
              over &&
              active.rect.current.translated &&
              active.rect.current.translated.top > over.rect.top + over.rect.height

            newIndex = overIndex + (isBelowOverItem ? 1 : 0)
          } else {
            newIndex = targetDay.stops.length
          }
        } else {
          newIndex = targetDay.stops.length
        }

        // Create new stop from idea
        const newStop: Stop = {
          poiId: idea.id,
          name: idea.name,
          role: idea.role || 'attraction',
          images: idea.images,
          themes: idea.themes,
        }

        targetDay.stops.splice(newIndex, 0, newStop)
        newDays[targetDayIndex] = targetDay
        recentlyMovedToNewContainer.current = true

        // Update ref synchronously so handleDragEnd sees the new state
        daysRef.current = newDays

        return newDays
      })
      return
    }

    // Handle stops being dragged between days
    if (!activeData.isIdea && activeContainer >= 0 && overContainer >= 0) {
      setDays((prevDays) => {
        const activeStop = activeData.stop as Stop

        // Check if stop is already in target container (handleDragOver already moved it)
        const alreadyInTarget = prevDays[overContainer].stops.some((s) => s.poiId === activeStop.poiId)
        if (alreadyInTarget && activeContainer !== overContainer) {
          // Already moved by a previous handleDragOver, no change needed
          return prevDays
        }

        const newDays = [...prevDays]
        const sourceDay = { ...newDays[activeContainer], stops: [...newDays[activeContainer].stops] }
        const targetDay =
          activeContainer === overContainer
            ? sourceDay
            : { ...newDays[overContainer], stops: [...newDays[overContainer].stops] }

        // Find the stop in source
        const activeIndex = sourceDay.stops.findIndex((s) => s.poiId === activeStop.poiId)
        if (activeIndex === -1) return prevDays

        // Remove from source
        const [movedStop] = sourceDay.stops.splice(activeIndex, 1)

        // Calculate insertion index
        const overIdStr = String(overId)
        let newIndex: number
        if (overIdStr.startsWith('droppable-day-')) {
          newIndex = targetDay.stops.length
        } else if (overIdStr.startsWith('stop_')) {
          // Extract poiId from the over ID and find its current position
          const overPoiId = overIdStr.replace('stop_', '')
          const overIndex = targetDay.stops.findIndex((s) => s.poiId === overPoiId)

          if (overIndex >= 0) {
            const isBelowOverItem =
              over &&
              active.rect.current.translated &&
              active.rect.current.translated.top > over.rect.top + over.rect.height

            newIndex = overIndex + (isBelowOverItem ? 1 : 0)
          } else {
            newIndex = targetDay.stops.length
          }
        } else {
          newIndex = targetDay.stops.length
        }

        // Insert at target
        targetDay.stops.splice(newIndex, 0, movedStop)

        newDays[activeContainer] = sourceDay
        if (activeContainer !== overContainer) {
          newDays[overContainer] = targetDay
        }
        recentlyMovedToNewContainer.current = true

        // Update ref synchronously so handleDragEnd sees the new state
        daysRef.current = newDays

        return newDays
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const originalDayIndex = dragStartDayIndexRef.current
    console.log('[DnD] handleDragEnd called', { activeId: active.id, overId: over?.id, originalDayIndex })

    // Always reset state at the end
    setActiveId(null)
    dragStartDayIndexRef.current = null

    if (!over) {
      console.log('[DnD] handleDragEnd: no over, returning')
      return
    }

    const activeData = active.data.current
    if (!activeData) {
      console.log('[DnD] handleDragEnd: no activeData, returning')
      return
    }

    // Use ref to get latest days state (updated synchronously by handleDragOver)
    const currentDays = daysRef.current
    console.log(
      '[DnD] handleDragEnd - currentDays from ref:',
      JSON.stringify(currentDays.map((d) => d.stops.map((s) => s.poiId)))
    )

    // Handle ideas - they were already visually moved in handleDragOver
    if (activeData.isIdea) {
      const idea = activeData.idea
      const targetDayIndex = findContainer(over.id)
      console.log('[DnD] Handling idea drop, targetDayIndex:', targetDayIndex)

      if (targetDayIndex === null || targetDayIndex < 0) return

      // Find where the idea was inserted (use currentDays from ref)
      const targetDay = currentDays[targetDayIndex]
      const targetIndex = targetDay.stops.findIndex((s) => s.poiId === idea.id)

      // Call backend to add the POI to the day at specific position
      if (itinId && targetIndex >= 0) {
        setIsRecalculatingTimes(true)
        try {
          const result = await schedulePOI(
            itinId,
            idea.id,
            targetDayIndex,
            undefined,
            undefined,
            true, // all day by default
            targetIndex, // target position
            true // recalculate times
          )
          if (result) {
            setDays(result.plan?.days || [])
            if (onItineraryUpdate) {
              onItineraryUpdate(result)
            }
          }
        } finally {
          setIsRecalculatingTimes(false)
        }
      }
      return
    }

    // Handle stops - cross-container moves were visually moved in handleDragOver
    // Same-container moves need to be calculated here
    const activeStop = activeData.stop as Stop
    if (!activeStop) {
      console.log('[DnD] No activeStop, returning')
      return
    }

    // Don't allow moving accommodation
    if (activeStop.role === 'accommodation') {
      console.log('[DnD] Stop is accommodation, returning')
      return
    }

    // Use original dayIndex from drag start (captured before handleDragOver moved anything)
    const sourceDayIndex = originalDayIndex
    // Find current container of the stop (may have changed if cross-container)
    const currentContainer = findContainer(active.id)
    const targetDayIndex = findContainer(over.id)

    console.log('[DnD] Stop move:', {
      poiId: activeStop.poiId,
      sourceDayIndex,
      currentContainer,
      targetDayIndex,
      itinId,
    })

    if (sourceDayIndex === null || sourceDayIndex === undefined || targetDayIndex === null || targetDayIndex < 0) {
      console.log('[DnD] Invalid day indices, returning')
      return
    }
    if (currentContainer === null) {
      console.log('[DnD] currentContainer is null, returning')
      return
    }

    // Check if this is same-day reorder vs cross-day move
    // Compare source (original day) with target (where dropped)
    if (sourceDayIndex === targetDayIndex) {
      console.log('[DnD] Same-day reorder')
      // Same day reorder - need to calculate new order using arrayMove
      const overIdStr = String(over.id)
      if (!overIdStr.startsWith('stop_')) return

      const overPoiId = overIdStr.replace('stop_', '')
      const dayStops = currentDays[sourceDayIndex].stops
      const activeIndex = dayStops.findIndex((s) => s.poiId === activeStop.poiId)

      const overIndex = dayStops.findIndex((s) => s.poiId === overPoiId)

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return

      // Calculate new order
      const newStops = arrayMove(dayStops, activeIndex, overIndex)
      const newPoiIds = newStops.map((s) => s.poiId)

      // Update local state immediately for visual feedback
      setDays((prevDays) => {
        const newDays = [...prevDays]
        newDays[sourceDayIndex] = { ...newDays[sourceDayIndex], stops: newStops }
        return newDays
      })

      // Sync with backend
      if (itinId) {
        setIsRecalculatingTimes(true)
        try {
          console.log('[DnD] Calling reorderItineraryStops for same-day reorder')
          const result = await reorderItineraryStops(itinId, sourceDayIndex, newPoiIds, {
            recalculateTimes: true,
          })
          console.log('[DnD] Same-day reorder result:', result ? 'success' : 'null')
          if (result) {
            setDays(result.plan?.days || [])
            if (onItineraryUpdate) {
              onItineraryUpdate(result)
            }
          }
        } finally {
          setIsRecalculatingTimes(false)
        }
      }
    } else {
      // Cross-day move - handleDragOver already moved it visually
      // Use currentDays (from ref) which has the updated state after handleDragOver
      console.log('[DnD] Cross-day move detected')
      const targetDay = currentDays[targetDayIndex]
      const targetIndex = targetDay.stops.findIndex((s) => s.poiId === activeStop.poiId)
      console.log('[DnD] Cross-day: targetIndex in new day:', targetIndex)

      if (targetIndex < 0) {
        console.log('[DnD] Cross-day: targetIndex < 0, stop not found in target day, returning')
        return
      }

      if (itinId) {
        setIsRecalculatingTimes(true)
        try {
          // Get POI IDs from the current state (after handleDragOver moved the item)
          const sourcePoiIds = currentDays[sourceDayIndex].stops.map((s) => s.poiId)
          const targetPoiIds = currentDays[targetDayIndex].stops.map((s) => s.poiId)

          console.log('[DnD] Calling reorderItineraryStops for cross-day move:', {
            itinId,
            sourceDayIndex,
            targetDayIndex,
            movedPoi: activeStop.poiId,
            targetIndex,
          })
          const result = await reorderItineraryStops(itinId, sourceDayIndex, [...sourcePoiIds, ...targetPoiIds], {
            scope: 'entire_trip',
            moves: { [activeStop.poiId]: targetDayIndex },
            targetPositions: { [activeStop.poiId]: targetIndex },
            recalculateTimes: true,
          })
          console.log('[DnD] reorderItineraryStops result:', result ? 'success' : 'null')
          if (result) {
            console.log(
              '[DnD] New days from API:',
              JSON.stringify(result.plan?.days?.map((d: any) => d.stops?.map((s: any) => s.poiId)))
            )
            setDays(result.plan?.days || [])
            if (onItineraryUpdate) {
              console.log('[DnD] Calling onItineraryUpdate')
              onItineraryUpdate(result)
            }
          }
        } finally {
          setIsRecalculatingTimes(false)
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
  const handleRegenerateClick = () => {
    setShowRegenerateWarning(true)
  }

  const handleRecomputeFull = async () => {
    setShowRegenerateWarning(false)
    if (!itinId || isRecomputing) return
    setIsRecomputing(true)
    const toastId = toast.loading('Regenerating itinerary...', { dismissible: true })
    try {
      const result = await recomputeItinerary(itinId, 'full')
      toast.dismiss(toastId)
      const newDays = result?.plan?.days
      if (result && Array.isArray(newDays) && newDays.length > 0) {
        setDays(newDays)
        if (onItineraryUpdate) onItineraryUpdate(result)
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
      const newDays = result?.plan?.days
      if (result && Array.isArray(newDays) && newDays.length > 0) {
        setDays(newDays)
        if (onItineraryUpdate) onItineraryUpdate(result)
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
      const newDays = result?.plan?.days
      if (result && Array.isArray(newDays) && newDays.length > 0 && newDays[dayIndex]) {
        setDays(newDays)
        if (onItineraryUpdate) onItineraryUpdate(result)
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
      } catch { }
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

  // Extract poiId from sortable id format (stop_<poiId> or idea_<poiId>)
  const isActiveIdea = activeId?.startsWith('idea_')
  const activePoiId = activeId
    ? isActiveIdea
      ? activeId.replace('idea_', '')
      : activeId.startsWith('stop_')
        ? activeId.replace('stop_', '')
        : null
    : null
  const activeStop =
    activePoiId && !isActiveIdea ? days.flatMap((d) => d.stops).find((s) => s.poiId === activePoiId) : null
  const activeIdea = activePoiId && isActiveIdea ? ideasItems.find((i: any) => i.id === activePoiId) : null

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className='sticky top-0 z-10 border-b bg-white p-6'>
        <div className='mb-4'>
          <EditableTitle
            value={tripData.title}
            onSave={handleTitleUpdate}
            placeholder='Untitled Trip'
            disabled={isSavingTitle}
          />
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
              onClick={handleRegenerateClick}
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
        style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT * 1.5}px` } : undefined}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
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
                      className='absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground'
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
                      items={day.stops.map((s) => `stop_${s.poiId}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className='space-y-2 divide-y'>
                        {day.stops.map((stop, stopIndex) => (
                          <SortableStop
                            key={`stop_${stop.poiId}`}
                            stop={stop}
                            dayIndex={dayIndex}
                            stopIndex={stopIndex}
                            onDetails={
                              onOpenDetails
                                ? () => onOpenDetails({ id: stop.poiId, name: stop.name })
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
      <EditHotelsPoisDialog open={showEditDialog} onOpenChange={setShowEditDialog} />

      {/* Regenerate Warning Dialog */}
      <Dialog open={showRegenerateWarning} onOpenChange={setShowRegenerateWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Itinerary?</DialogTitle>
            <DialogDescription>
              This will create a completely new itinerary based on your preferences. All current places and scheduling
              will be replaced with new suggestions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowRegenerateWarning(false)}>
              Cancel
            </Button>
            <Button variant='default' onClick={handleRecomputeFull}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recalculating times overlay */}
      {isRecalculatingTimes && (
        <div className='fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-background/80 px-4 py-2 shadow-lg backdrop-blur-sm border'>
          <RefreshCw className='size-4 animate-spin text-primary' />
          <span className='text-sm text-muted-foreground'>Updating times...</span>
        </div>
      )}
    </div>
  )
}
