import { z } from 'zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'
import { formatDateRange, calculateDaysBetween, formatDateToISO, formatDateDisplay, formatDayDisplay } from '@/lib/date-range'
import { zodResolver } from '@hookform/resolvers/zod'
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { WhenDialog, WhoDialog, PacingDialog, DietaryDialog, ScheduleDialog } from '@/components/dialogs'
import type { DateMode } from '@/components/dialogs/when-dialog'
import type { TimeType } from '@/components/dialogs/schedule-dialog'
import { PACING_OPTIONS, DIETARY_OPTIONS, INTEREST_OPTIONS, MONTHS } from '@/lib/constants'
import { ChevronLeft, X, ChevronRight, Minus, Plus } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { searchLocations, type Location, createItinerary, searchPOIsByDestinationAndRole } from '@/services/api'

// Types & Interfaces

interface Destination {
  city: string
  days?: number
  dates?: {
    type: 'specific' | 'flexible'
    start_date?: string
    end_date?: string
    days?: number
  }
}

interface Hotel {
  poi_id: string
  poi_name: string
  latitude: number
  longitude: number
  check_in_date?: Date
  check_out_date?: Date
  check_in_day?: number
  check_out_day?: number
  destination_city?: string
  themes?: string[]
  role?: string
  openHours?: any
  images?: string[]
}

interface MandatoryPOI {
  poi_id: string
  poi_name: string
  latitude: number
  longitude: number
  date?: Date
  day?: number
  destination_city?: string
  time_type: TimeType
  start_time?: string
  end_time?: string
  themes?: string[]
  role?: string
  openHours?: any
  images?: string[]
}

interface POI {
  id: string
  name: string
  role: string
  latitude: number
  longitude: number
  themes?: string[]
  openHours?: any
  images?: string[]
  coordinates?: {
    lat: number
    lng: number
  }
}

const LOCATION_SEARCH_MIN_LENGTH = 3
const LOCATION_SEARCH_DEBOUNCE_MS = 300
const MAX_DESTINATIONS = 2
const TITLE_THRESHOLD = 150

// Form schema
const formSchema = z
  .object({
    title: z.string().optional(),
    destination: z.string().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    flexibleDays: z.string().optional(),
    flexibleMonth: z.string().optional(),
    adults: z.number().min(1).max(10),
    children: z.number().min(0).max(10),
    pets: z.number().min(0).max(5),
    isMuslim: z.boolean().optional(),
    wheelchairAccessible: z.boolean().optional(),
    kidFriendly: z.boolean().optional(),
    petFriendly: z.boolean().optional(),
    // budget: z.string().min(1, 'Budget is required'),
    pacing: z.string().min(1, 'Pacing is required'),
    dietaryRestrictions: z.string().min(1, 'Dietary restrictions is required'),
    interests: z.array(z.string()),
  })
  .refine(
    (data: any) => {
      const hasSpecific = !!data.startDate && !!data.endDate
      const days = parseInt(data.flexibleDays || '0')
      const hasFlexible = Number.isFinite(days) && days >= 1
      return hasSpecific || hasFlexible
    },
    { message: 'Please select travel dates', path: ['startDate'] }
  )
  .refine(
    (data: any) => {
      // At least one destination is required (legacy or new)
      return !!data.destination
    },
    { message: 'At least one destination is required', path: ['destination'] }
  )

type FormData = z.infer<typeof formSchema>

// Component
const CreateItineraryForm: React.FC = () => {
  const navigate = useNavigate()

  // State
  const [currentStep, setCurrentStep] = useState(1)
  const [dateMode, setDateMode] = useState<DateMode>('flexible')
  const [showDateDialog, setShowDateDialog] = useState(false)
  const [showWhoDialog, setShowWhoDialog] = useState(false)
  // const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showPacingDialog, setShowPacingDialog] = useState(false)
  const [showDietaryDialog, setShowDietaryDialog] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() + 86400000),
  })
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [mandatoryPOIs, setMandatoryPOIs] = useState<MandatoryPOI[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationOpen, setDestinationOpen] = useState(false)
  const [destinationSearch, setDestinationSearch] = useState('')
  const [destinationLocations, setDestinationLocations] = useState<Location[]>([])
  const [isSearchingDestination, setIsSearchingDestination] = useState(false)
  const [destinationWhenDialog, setDestinationWhenDialog] = useState<{
    open: boolean
    destination: Destination | null
    index: number
  }>({ open: false, destination: null, index: -1 })
  const [destDateRange, setDestDateRange] = useState<DateRange | undefined>(undefined)
  const [destFlexibleDays, setDestFlexibleDays] = useState('1')
  const [hotelOpen, setHotelOpen] = useState(false)
  const [hotelSearch, setHotelSearch] = useState('')
  const [hotelPOIs, setHotelPOIs] = useState<POI[]>([])
  const [isSearchingHotel, setIsSearchingHotel] = useState(false)
  const [placesOpen, setPlacesOpen] = useState(false)
  const [placesSearch, setPlacesSearch] = useState('')
  const [placesPOIs, setPlacesPOIs] = useState<POI[]>([])
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
  const [selectedHotelDestination, setSelectedHotelDestination] = useState('')
  const [selectedPlacesDestination, setSelectedPlacesDestination] = useState('')
  const [scheduleHotelDialog, setScheduleHotelDialog] = useState<{
    open: boolean
    hotel: Hotel | null
    index: number
  }>({ open: false, hotel: null, index: -1 })
  const [schedulePlaceDialog, setSchedulePlaceDialog] = useState<{
    open: boolean
    place: MandatoryPOI | null
    index: number
  }>({ open: false, place: null, index: -1 })

  const destinationSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hotelSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const placesSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useIsMobile()

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      destination: '',
      startDate: undefined,
      endDate: undefined,
      flexibleDays: '1',
      flexibleMonth: '',
      adults: 2,
      children: 0,
      pets: 0,
      isMuslim: false,
      wheelchairAccessible: false,
      kidFriendly: false,
      petFriendly: false,
      // budget: 'any',
      pacing: 'balanced',
      dietaryRestrictions: 'none',
      interests: [],
    },
  })

  // Watch form values
  const title = form.watch('title')
  const destination = form.watch('destination')
  const startDate = form.watch('startDate')
  const endDate = form.watch('endDate')
  const flexibleDays = form.watch('flexibleDays')
  const flexibleMonth = form.watch('flexibleMonth')
  const adults = form.watch('adults')
  const children = form.watch('children')
  const pets = form.watch('pets')
  // const budget = form.watch('budget')
  const pacing = form.watch('pacing')
  const dietaryRestrictions = form.watch('dietaryRestrictions')
  const watchInterests = form.watch('interests') || []

  // Computed values
  // const budgetKey: BudgetKey = budget === 'tight' || budget === 'sensible' || budget === 'upscale' || budget === 'luxury' ? budget : 'any'

  const isValidDestination = useMemo(() => {
    // Valid if we have destinations array with at least one entry
    if (destinations.length > 0) return true
    // Fallback to legacy single destination
    if (!destination) return false
    return false
  }, [destination, destinations])

  const dateDisplay = useMemo(() => {
    if (dateMode === 'specific' && startDate && endDate) {
      return formatDateRange(startDate, endDate)
    }
    if (dateMode === 'flexible' && flexibleDays) {
      const label = MONTHS.find((m) => m.value === flexibleMonth)?.label
      return `${flexibleDays} days${label ? ` in ${label}` : ''}`
    }
    return 'Select dates'
  }, [dateMode, startDate, endDate, flexibleDays, flexibleMonth])

  const whoDisplay = useMemo(() => {
    const total = (adults || 0) + (children || 0)
    return `${total} ${total === 1 ? 'traveler' : 'travelers'}`
  }, [adults, children])

  const totalDays = useMemo(() => {
    if (dateMode === 'specific' && startDate && endDate) {
      return calculateDaysBetween(startDate, endDate)
    }
    return parseInt(flexibleDays || '1')
  }, [dateMode, startDate, endDate, flexibleDays])
  const availableNights = useMemo(() => Math.max(0, totalDays - 1), [totalDays])

  const generateTitle = useCallback((customTitle?: string, dests?: Destination[], dest?: string, mode?: DateMode, start?: Date, end?: Date, flexDays?: string) => {
    if (customTitle && customTitle.trim()) {
      return customTitle.trim()
    }

    // Multi-city title generation
    if (dests && dests.length > 0) {
      const cityNames = dests.map(d => d.city.split(',')[0].trim()).join(' & ')

      // Check if title exceeds threshold
      let titlePrefix = `Trip to ${cityNames}`
      if (titlePrefix.length > TITLE_THRESHOLD) {
        titlePrefix = 'Trip'
      }

      if (mode === 'specific' && start) {
        const endDate = end || start
        const numDays = calculateDaysBetween(start, endDate)

        if (numDays === 1) {
          return `${titlePrefix} @ ${format(start, 'MMM d')}`
        } else {
          const sameMonth = start.getMonth() === endDate.getMonth()
          if (sameMonth) {
            return `${titlePrefix} @ ${format(start, 'MMM d')} — ${format(endDate, 'd')}`
          } else {
            return `${titlePrefix} @ ${format(start, 'MMM d')} — ${format(endDate, 'MMM d')}`
          }
        }
      } else if (flexDays) {
        const days = parseInt(flexDays)
        if (days === 1) {
          return `${titlePrefix} @ 1 day`
        } else {
          return `${titlePrefix} @ ${days} days`
        }
      }

      return titlePrefix
    }

    // Legacy single destination
    const destination = dest?.split(',')[0].trim() || 'Trip'

    if (mode === 'specific' && start) {
      const endDate = end || start
      const numDays = calculateDaysBetween(start, endDate)

      if (numDays === 1) {
        return `${destination} @ ${format(start, 'MMM d')}`
      } else {
        const sameMonth = start.getMonth() === endDate.getMonth()
        if (sameMonth) {
          return `${destination} @ ${format(start, 'MMM d')} — ${format(endDate, 'd')}`
        } else {
          return `${destination} @ ${format(start, 'MMM d')} — ${format(endDate, 'MMM d')}`
        }
      }
    } else if (flexDays) {
      const days = parseInt(flexDays)
      if (days === 1) {
        return `${destination} @ 1 day`
      } else {
        return `${destination} @ ${days} days`
      }
    }

    return destination
  }, [])

  const generatedTitle = useMemo(
    () => generateTitle(title, destinations, destination, dateMode, startDate, endDate, flexibleDays),
    [generateTitle, title, destinations, destination, dateMode, startDate, endDate, flexibleDays]
  )

  const isSameDay = (a?: Date, b?: Date) => {
    if (!a || !b) return false
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  }

  const dayIndexFromTripStart = useCallback(
    (d: Date | undefined) => {
      if (!startDate || !d) return -1
      const a = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
      const b = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
    },
    [startDate]
  )

  const computeOccupiedSpecific = useCallback(
    (excludeIndex?: number) => {
      const occupied = new Set<number>()
      if (!startDate || !endDate) return occupied
      hotels.forEach((h, i) => {
        if (excludeIndex !== undefined && i === excludeIndex) return
        if (!h.check_in_date || !h.check_out_date) return
        const inIdx = dayIndexFromTripStart(h.check_in_date)
        const outIdx = dayIndexFromTripStart(h.check_out_date)
        for (let idx = inIdx; idx < outIdx; idx++) {
          if (idx >= 0 && idx < totalDays) occupied.add(idx)
        }
      })
      return occupied
    },
    [hotels, startDate, endDate, totalDays, dayIndexFromTripStart]
  )

  const computeOccupiedFlexible = useCallback(
    (excludeIndex?: number) => {
      const occupied = new Set<number>()
      hotels.forEach((h, i) => {
        if (excludeIndex !== undefined && i === excludeIndex) return
        if (h.check_in_day === undefined || h.check_out_day === undefined) return
        for (let d = h.check_in_day; d < h.check_out_day; d++) {
          if (d >= 1 && d <= totalDays) occupied.add(d)
        }
      })
      return occupied
    },
    [hotels, totalDays]
  )

  const isDateDisabledForHotel = useCallback(
    (date: Date, excludeIndex?: number) => {
      if (!startDate || !endDate) return true
      if (date < startDate || date > endDate) return true

      const idx = dayIndexFromTripStart(date)
      if (idx < 0 || idx >= totalDays) return true

      const occupied = computeOccupiedSpecific(excludeIndex)
      return occupied.has(idx)
    },
    [startDate, endDate, totalDays, computeOccupiedSpecific, dayIndexFromTripStart]
  )

  // Handlers

  const handleInputChange = (field: keyof FormData, value: any) => {
    form.setValue(field as any, value, {
      shouldDirty: true,
      shouldValidate: false,
    })
  }

  const toggleInterest = useCallback(
    (interest: string) => {
      const exists = watchInterests.includes(interest)
      const next = exists ? watchInterests.filter((i) => i !== interest) : [...watchInterests, interest]
      form.setValue('interests', next, { shouldDirty: true })
    },
    [watchInterests, form]
  )

  const hasAvailableCheckInSpecific = useMemo(() => {
    if (dateMode !== 'specific') {
      return true
    }
    if (!startDate || !endDate) {
      return true
    }

    const occupied = computeOccupiedSpecific()
    const validOffsets: number[] = []

    // In specific mode, check-in is valid only on days that:
    // - are not fully occupied by another hotel range, and
    // - are not the last trip day (no night after it), and
    // - respect your rule that trip end cannot be used as check-in.
    for (let offset = 0; offset < totalDays; offset++) {
      const isLastDay = offset === totalDays - 1
      if (isLastDay) continue
      if (!occupied.has(offset)) {
        validOffsets.push(offset)
      }
    }

    if (validOffsets.length > 0) {
      return true
    }

    return false
  }, [dateMode, startDate, endDate, totalDays, computeOccupiedSpecific])

  const hasAvailableCheckInFlexible = useMemo(() => {
    if (dateMode !== 'flexible') return true
    const occupied = computeOccupiedFlexible()
    // in flexible, check-in last day is disabled in UI; look for any open day in [1, totalDays - 1]
    for (let d = 1; d <= Math.max(1, totalDays - 1); d++) {
      if (!occupied.has(d)) {
        return true
      }
    }
    return false
  }, [dateMode, totalDays, computeOccupiedFlexible])

  const handleDateDialogSave = () => {
    if (dateMode === 'specific') {
      if (dateRange?.from) {
        // Auto-set end date to the same as start if not provided
        form.setValue('startDate', dateRange.from)
        form.setValue('endDate', dateRange?.to || dateRange.from)
      }
      form.setValue('flexibleDays', undefined as any)
      form.setValue('flexibleMonth', undefined as any)

      // Clear incompatible flexible fields and destination days
      setHotels((prev) => prev.map((acc) => ({ ...acc, check_in_day: undefined, check_out_day: undefined })))
      setMandatoryPOIs((prev) => prev.map((poi) => ({ ...poi, day: undefined })))
      setDestinations((prev) => prev.map((dest) => ({ ...dest, days: undefined, dates: undefined })))
    } else {
      form.setValue('startDate', undefined)
      form.setValue('endDate', undefined)

      // Clear incompatible specific fields and destination dates
      setHotels((prev) => prev.map((acc) => ({ ...acc, check_in_date: undefined, check_out_date: undefined })))
      setMandatoryPOIs((prev) => prev.map((poi) => ({ ...poi, date: undefined })))
      setDestinations((prev) => prev.map((dest) => ({ ...dest, dates: undefined, days: undefined })))
    }

    // Clear hotels and POIs that are outside the new trip range
    setTimeout(() => {
      const newTripDays = dateMode === 'specific' && dateRange?.from && dateRange?.to
        ? calculateDaysBetween(dateRange.from, dateRange.to)
        : parseInt(flexibleDays || '1')

      if (dateMode === 'specific' && dateRange?.from && dateRange?.to) {
        const newStart = dateRange.from
        const newEnd = dateRange.to

        // Clear hotels outside date range
        setHotels((prev) =>
          prev.map((hotel) => {
            if (hotel.check_in_date && hotel.check_out_date) {
              if (hotel.check_in_date < newStart || hotel.check_out_date > newEnd) {
                return { ...hotel, check_in_date: undefined, check_out_date: undefined }
              }
            }
            return hotel
          })
        )

        // Clear POIs outside date range
        setMandatoryPOIs((prev) =>
          prev.map((poi) => {
            if (poi.date) {
              if (poi.date < newStart || poi.date > newEnd) {
                return { ...poi, date: undefined }
              }
            }
            return poi
          })
        )
      } else {
        // Flexible mode - clear by day number
        setHotels((prev) =>
          prev.map((hotel) => {
            if (hotel.check_in_day !== undefined && hotel.check_out_day !== undefined) {
              if (hotel.check_in_day > newTripDays || hotel.check_out_day > newTripDays) {
                return { ...hotel, check_in_day: undefined, check_out_day: undefined }
              }
            }
            return hotel
          })
        )

        setMandatoryPOIs((prev) =>
          prev.map((poi) => {
            if (poi.day !== undefined && poi.day > newTripDays) {
              return { ...poi, day: undefined }
            }
            return poi
          })
        )
      }
    }, 0)

    setShowDateDialog(false)
  }

  const validateDestinations = useCallback(() => {
    if (destinations.length === 0) {
      return { valid: true, error: null }
    }

    // Check if all destinations have dates/days OR all are empty
    const hasAnyScheduled = destinations.some((dest) => {
      if (dateMode === 'specific') {
        return dest.dates?.start_date && dest.dates?.end_date
      } else {
        return dest.days !== undefined && dest.days > 0
      }
    })

    const hasAllScheduled = destinations.every((dest) => {
      if (dateMode === 'specific') {
        return dest.dates?.start_date && dest.dates?.end_date
      } else {
        return dest.days !== undefined && dest.days > 0
      }
    })

    // All empty -> accepted
    if (!hasAnyScheduled) {
      return { valid: true, error: null }
    }

    // Partial destinations empty -> error
    if (hasAnyScheduled && !hasAllScheduled) {
      return { valid: false, error: 'Enter dates for every destination, or clear all dates entries.' }
    }

    // Check total days match trip days (flexible mode only)
    if (dateMode === 'flexible') {
      const totalDestDays = destinations.reduce((sum, d) => sum + (d.days || 0), 0)
      const tripDays = parseInt(flexibleDays || '0')

      if (totalDestDays !== tripDays) {
        return { valid: false, error: `Total destination days (${totalDestDays}) must equal trip days (${tripDays})` }
      }
    }

    return { valid: true, error: null }
  }, [destinations, dateMode, flexibleDays])

  const canProceed = () => {
    if (currentStep === 1) {
      const v = form.getValues()
      const hasValidDestination = isValidDestination
      const hasDates = dateMode === 'specific' ? !!v.startDate && !!v.endDate : !!v.flexibleDays

      const destValidation = validateDestinations()

      return hasValidDestination && hasDates && !!v.pacing && destValidation.valid
    }
    return true
  }

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canProceed() && currentStep < 3) {
      setCurrentStep((s) => s + 1)
    }
  }

  const handlePrevious = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1)
    }
  }

  // Check if multi-city is allowed (only for trips > 1 day)
  const canAddMultipleDestinations = totalDays > 1

  const handleAddDestination = (location: Location) => {
    if (destinations.length >= 1 && !canAddMultipleDestinations) {
      toast.error('Single day trips can only have one destination')
      return
    }

    if (destinations.length >= MAX_DESTINATIONS) {
      toast.error(`Maximum ${MAX_DESTINATIONS} destinations allowed`)
      return
    }

    // Check for duplicates
    if (destinations.some(d => d.city === location.label)) {
      toast.error('Destination already added')
      return
    }

    const newDestination: Destination = {
      city: location.label,
    }
    const updatedDestinations = [...destinations, newDestination]
    setDestinations(updatedDestinations)
    setDestinationSearch('')
    setDestinationOpen(false)

    // Set default selected destination for hotel/places search
    if (updatedDestinations.length === 1) {
      setSelectedHotelDestination(location.label)
      setSelectedPlacesDestination(location.label)
    }

    // Update form destination field to reflect we have destinations
    form.setValue('destination', location.label, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const handleRemoveDestination = (index: number) => {
    const removedDest = destinations[index]
    const updated = destinations.filter((_, idx) => idx !== index)
    setDestinations(updated)

    // Update form destination field
    if (updated.length === 0) {
      form.setValue('destination', '', {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    // Check if any hotels or mandatory POIs reference this destination
    const removedCity = removedDest.city.toLowerCase()

    // Check hotels
    const invalidHotels = hotels.filter((hotel) =>
      hotel.poi_name.toLowerCase().includes(removedCity)
    )

    // Check mandatory POIs
    const invalidPOIs = mandatoryPOIs.filter((poi) =>
      poi.poi_name.toLowerCase().includes(removedCity)
    )

    if (invalidHotels.length > 0 || invalidPOIs.length > 0) {
      const messages = []
      if (invalidHotels.length > 0) {
        messages.push(`${invalidHotels.length} hotel(s) may be in ${removedDest.city}`)
      }
      if (invalidPOIs.length > 0) {
        messages.push(`${invalidPOIs.length} place(s) may be in ${removedDest.city}`)
      }
      toast.error(`Warning: ${messages.join(' and ')}. Please review your selections.`)
    }
  }

  const handleOpenDestinationSchedule = (destination: Destination, index: number) => {
    // Set up date range or flexible days based on current destination
    if (dateMode === 'specific') {
      if (destination.dates?.start_date && destination.dates?.end_date) {
        setDestDateRange({
          from: new Date(destination.dates.start_date),
          to: new Date(destination.dates.end_date),
        })
      } else {
        setDestDateRange(undefined)
      }
    } else {
      setDestFlexibleDays(destination.days?.toString() || '1')
    }

    setDestinationWhenDialog({ open: true, destination, index })
  }

  const handleSaveDestinationSchedule = () => {
    const { destination, index } = destinationWhenDialog
    if (!destination) return

    const oldDestination = destinations[index]
    const updated = { ...destination }

    // Update destination with new dates/days
    if (dateMode === 'specific') {
      if (!destDateRange?.from || !destDateRange?.to) {
        toast.error('Please select both start and end dates')
        return
      }

      const newStart = new Date(destDateRange.from.getFullYear(), destDateRange.from.getMonth(), destDateRange.from.getDate())
      const newEnd = new Date(destDateRange.to.getFullYear(), destDateRange.to.getMonth(), destDateRange.to.getDate())

      // Check for overlap with other destinations
      const hasOverlap = destinations.some((dest, idx) => {
        if (idx === index) return false
        if (!dest.dates?.start_date || !dest.dates?.end_date) return false

        const destStart = new Date(dest.dates.start_date)
        const destStartNorm = new Date(destStart.getFullYear(), destStart.getMonth(), destStart.getDate())
        const destEnd = new Date(dest.dates.end_date)
        const destEndNorm = new Date(destEnd.getFullYear(), destEnd.getMonth(), destEnd.getDate())

        // Check if ranges overlap: [newStart, newEnd] overlaps with [destStart, destEnd]
        return newStart <= destEndNorm && newEnd >= destStartNorm
      })

      if (hasOverlap) {
        toast.error('Date range overlaps with another destination')
        return
      }

      updated.dates = {
        type: 'specific',
        start_date: format(destDateRange.from, 'yyyy-MM-dd'),
        end_date: format(destDateRange.to, 'yyyy-MM-dd'),
      }
      updated.days = undefined
    } else {
      const days = parseInt(destFlexibleDays || '1')
      if (days < 1) {
        toast.error('Please specify at least 1 day')
        return
      }

      updated.days = days
      updated.dates = undefined
    }

    // Validate total days match trip days (flexible mode only)
    const updatedDestinations = [...destinations]
    updatedDestinations[index] = updated

    if (dateMode === 'flexible') {
      const totalDestDays = updatedDestinations.reduce((sum, d) => sum + (d.days || 0), 0)
      const tripDays = parseInt(flexibleDays || '0')

      if (totalDestDays > tripDays) {
        toast.error(`Total destination days (${totalDestDays}) exceeds trip days (${tripDays})`)
        return
      }
    }

    // Check if dates/days changed - if so, clear hotels and POIs for this destination
    const datesChanged = dateMode === 'specific'
      ? oldDestination.dates?.start_date !== updated.dates?.start_date ||
      oldDestination.dates?.end_date !== updated.dates?.end_date
      : oldDestination.days !== updated.days

    if (datesChanged) {
      const cityLower = destination.city.toLowerCase()

      // Clear hotel dates/days for this destination
      setHotels((prev) =>
        prev.map((hotel) => {
          if (hotel.destination_city?.toLowerCase() === cityLower) {
            return {
              ...hotel,
              check_in_date: undefined,
              check_out_date: undefined,
              check_in_day: undefined,
              check_out_day: undefined,
            }
          }
          return hotel
        })
      )

      // Clear POI dates/days for this destination
      setMandatoryPOIs((prev) =>
        prev.map((poi) => {
          if (poi.destination_city?.toLowerCase() === cityLower) {
            return {
              ...poi,
              date: undefined,
              day: undefined,
            }
          }
          return poi
        })
      )

      toast.info(`Cleared schedules for hotels and places in ${destination.city}`)
    }

    setDestinations(updatedDestinations)
    setDestinationWhenDialog({ open: false, destination: null, index: -1 })
  }

  const handleAddHotel = (poi: POI) => {
    // Prevent adding more hotels than available nights
    if (hotels.length >= availableNights) {
      toast.error('Total number of hotels cannot be more than the number of nights in the trip')
      return
    }
    const newHotel: Hotel = {
      poi_id: poi.id,
      poi_name: poi.name,
      latitude: poi.latitude,
      longitude: poi.longitude,
      destination_city: selectedHotelDestination || destinations[0]?.city,
      themes: poi.themes,
      role: poi.role,
      openHours: poi.openHours,
      images: poi.images,
    }
    setHotels([...hotels, newHotel])
    setHotelSearch('')
    setHotelOpen(false)
  }

  const handleRemoveHotel = (index: number) => {
    setHotels(hotels.filter((_, idx) => idx !== index))
  }

  const handleOpenHotelSchedule = (hotel: Hotel, index: number) => {
    setScheduleHotelDialog({ open: true, hotel, index })
  }

  const getUsedNights = (arr: Hotel[]) =>
    arr.reduce((sum, h) => {
      if (h.check_in_date && h.check_out_date) {
        return sum + Math.max(0, calculateDaysBetween(h.check_in_date, h.check_out_date) - 1)
      }
      if (h.check_in_day !== undefined && h.check_out_day !== undefined) {
        return sum + Math.max(0, h.check_out_day - h.check_in_day)
      }
      return sum
    }, 0)

  const handleSaveHotelSchedule = () => {
    const { hotel, index } = scheduleHotelDialog
    if (!hotel) return

    const availableNights = Math.max(0, totalDays - 1)

    // Helper to check overlaps (half-open intervals [start, end))
    const hasOverlapSpecific = (inA: Date, outA: Date, exIdx: number) =>
      hotels.some((h, i) => {
        if (i === exIdx) return false
        if (!h.check_in_date || !h.check_out_date) return false
        const aStart = new Date(inA.getFullYear(), inA.getMonth(), inA.getDate())
        const aEnd = new Date(outA.getFullYear(), outA.getMonth(), outA.getDate())
        const bStart = new Date(h.check_in_date.getFullYear(), h.check_in_date.getMonth(), h.check_in_date.getDate())
        const bEnd = new Date(h.check_out_date.getFullYear(), h.check_out_date.getMonth(), h.check_out_date.getDate())
        return aStart < bEnd && bStart < aEnd
      })

    const hasOverlapFlexible = (inDay: number, outDay: number, exIdx: number) =>
      hotels.some((h, i) => {
        if (i === exIdx) return false
        if (h.check_in_day === undefined || h.check_out_day === undefined) return false
        return inDay < h.check_out_day && h.check_in_day < outDay
      })

    // Validate check-in/out ordering and business rules
    if (dateMode === 'specific') {
      if (!hotel.check_in_date || !hotel.check_out_date) {
        toast.error('Please select both check-in and check-out dates')
        return
      }

      const inDate = new Date(hotel.check_in_date.getFullYear(), hotel.check_in_date.getMonth(), hotel.check_in_date.getDate())
      const outDate = new Date(hotel.check_out_date.getFullYear(), hotel.check_out_date.getMonth(), hotel.check_out_date.getDate())

      // Strict ordering: out > in; allow same-day to be handled inline
      if (outDate < inDate) {
        toast.error('Check-out cannot be before check-in')
        return
      }

      // Compute nights (inclusive days minus 1)
      const nights = Math.max(0, calculateDaysBetween(inDate, outDate) - 1)
      if (nights < 1) {
        // Keep dialog open; rely on inline error under the calendar
        return
      }

      // Check-in cannot be on the last trip day
      if (startDate) {
        const lastDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + (totalDays - 1))
        if (isSameDay(inDate, lastDay)) {
          toast.error('Check-in cannot be on the last trip day')
          return
        }
      }

      // Check-out cannot be on the first trip day
      if (startDate && isSameDay(outDate, startDate)) {
        toast.error('Check-out cannot be on the first trip day')
        return
      }

      // Overlap check
      if (hasOverlapSpecific(inDate, outDate, index)) {
        toast.error('Hotel stay overlaps with another stay')
        return
      }

      // Total nights used must not exceed available nights
      const updated = [...hotels]
      updated[index] = { ...hotel, check_in_date: inDate, check_out_date: outDate }

      const usedNights = getUsedNights(updated)

      if (usedNights > availableNights) {
        toast.error(`Total hotel nights (${usedNights}) exceed available nights (${availableNights})`)
        return
      }

      setHotels(updated)
      setScheduleHotelDialog({ open: false, hotel: null, index: -1 })
      return
    } else {
      // Flexible mode
      if (hotel.check_in_day === undefined || hotel.check_out_day === undefined) {
        toast.error('Please select both check-in and check-out day')
        return
      }

      const inDay = hotel.check_in_day
      const outDay = hotel.check_out_day

      // bounds
      if (inDay < 1 || inDay > totalDays) {
        toast.error('Invalid check-in day')
        return
      }
      if (outDay < 1 || outDay > totalDays) {
        toast.error('Invalid check-out day')
        return
      }

      // Check-in cannot be on the last trip day
      if (inDay === totalDays) {
        toast.error('Check-in cannot be on the last trip day')
        return
      }

      // Check-out cannot be on the first trip day
      if (outDay === 1) {
        toast.error('Check-out cannot be on the first trip day')
        return
      }

      // Strict ordering
      if (!(outDay > inDay)) {
        toast.error('Check-out day must be strictly after check-in day')
        return
      }

      const nights = outDay - inDay
      if (nights < 1) {
        toast.error('Hotel stay must be at least 1 night')
        return
      }

      // Overlap
      if (hasOverlapFlexible(inDay, outDay, index)) {
        toast.error('Hotel stay overlaps with another stay')
        return
      }

      const updated = [...hotels]
      updated[index] = { ...hotel, check_in_day: inDay, check_out_day: outDay }

      const usedNights = getUsedNights(updated)

      if (usedNights > availableNights) {
        toast.error(`Total hotel nights (${usedNights}) exceed available nights (${availableNights})`)
        return
      }

      setHotels(updated)
      setScheduleHotelDialog({ open: false, hotel: null, index: -1 })
    }
  }

  const handleAddPlace = (poi: POI) => {
    const newPlace: MandatoryPOI = {
      poi_id: poi.id,
      poi_name: poi.name,
      time_type: 'any_time',
      latitude: poi.latitude,
      longitude: poi.longitude,
      destination_city: selectedPlacesDestination || destinations[0]?.city,
      themes: poi.themes,
      role: poi.role,
      openHours: poi.openHours,
      images: poi.images,
    }
    setMandatoryPOIs([...mandatoryPOIs, newPlace])
    setPlacesSearch('')
    setPlacesOpen(false)
  }

  const handleRemovePlace = (index: number) => {
    setMandatoryPOIs(mandatoryPOIs.filter((_, idx) => idx !== index))
  }

  const handleOpenPlaceSchedule = (place: MandatoryPOI, index: number) => {
    const p: MandatoryPOI = { ...place }
    if (!p.time_type) {
      p.time_type = 'any_time'
    }
    setSchedulePlaceDialog({ open: true, place: p, index })
  }

  const handleSavePlaceSchedule = () => {
    const { place, index } = schedulePlaceDialog
    if (!place) return

    // Validate that both start_time and end_time are provided if time_type is 'specific'
    if (place.time_type === 'specific') {
      if (!place.start_time || !place.end_time) {
        toast.error('Please provide both start time and end time')
        return
      }
      if (place.end_time <= place.start_time) {
        toast.error('End time must be after start time')
        return
      }
    }

    const updated = [...mandatoryPOIs]
    updated[index] = place

    setMandatoryPOIs(updated)
    setSchedulePlaceDialog({ open: false, place: null, index: -1 })
  }

  const generateAPIPayload = () => {
    const destination = form.watch('destination')
    const customTitle = form.watch('title')
    const startDate = form.watch('startDate')
    const endDate = form.watch('endDate')
    const flexibleDays = form.watch('flexibleDays')
    const isMuslim = form.watch('isMuslim')
    const wheelchairAccessible = form.watch('wheelchairAccessible')
    const kidFriendly = form.watch('kidFriendly')
    const petFriendly = form.watch('petFriendly')
    const title = generateTitle(customTitle, destinations, destination, dateMode, startDate, endDate, flexibleDays)

    const hotelPayload = hotels.map((acc) => ({
      poi_id: acc.poi_id,
      poi_name: acc.poi_name,
      latitude: acc.latitude,
      longitude: acc.longitude,
      destination: acc.destination_city,
      check_in_date: acc.check_in_date ? formatDateToISO(acc.check_in_date) : undefined,
      check_out_date: acc.check_out_date ? formatDateToISO(acc.check_out_date) : undefined,
      check_in_day: acc.check_in_day,
      check_out_day: acc.check_out_day,
      themes: acc.themes,
      role: acc.role,
      open_hours: acc.openHours,
      images: acc.images,
    }))

    const mandatoryPOIsPayload = mandatoryPOIs.map((poi) => {
      const payload: any = {
        poi_id: poi.poi_id,
        poi_name: poi.poi_name,
        poi_destination: poi.destination_city,
        latitude: poi.latitude,
        longitude: poi.longitude,
        date: poi.date ? formatDateToISO(poi.date) : undefined,
        day: poi.day,
        themes: poi.themes,
        role: poi.role,
        open_hours: poi.openHours,
        images: poi.images,
      }

      // Only include time fields if both are provided
      if (poi.time_type === 'specific' && poi.start_time && poi.end_time) {
        payload.start_time = poi.start_time
        payload.end_time = poi.end_time
      }

      return payload
    })

    // Prepare destinations payload
    const destinationsPayload = destinations.map((dest) => {
      const destPayload: any = {
        city: dest.city,
      }

      if (dateMode === 'specific' && dest.dates) {
        destPayload.dates = {
          type: 'specific',
          start_date: dest.dates.start_date,
          end_date: dest.dates.end_date,
        }
      } else if (dateMode === 'flexible' && dest.days) {
        destPayload.days = dest.days
      }

      return destPayload
    })

    const dietaryRestrictionsValue = form.watch('dietaryRestrictions')

    const basePayload: any = {
      title,
      travelers: {
        adults: form.watch('adults'),
        children: form.watch('children'),
        pets: form.watch('pets'),
      },
      preferences: {
        // budget: form.watch('budget'),
        pacing: form.watch('pacing'),
        interests: form.watch('interests'),
      },
      flags: {
        ...(isMuslim && { is_muslim: true }),
        ...(wheelchairAccessible && { wheelchair_accessible: true }),
        ...(kidFriendly && { kids_friendly: true }),
        ...(petFriendly && { pets_friendly: true }),
      },
      ...(dietaryRestrictionsValue && dietaryRestrictionsValue !== 'none' && { dietary_restrictions: dietaryRestrictionsValue }),
      ...(hotelPayload.length > 0 && { hotels: hotelPayload }),
      ...(mandatoryPOIsPayload.length > 0 && { mandatory_pois: mandatoryPOIsPayload }),
    }

    // Add destinations (new multi-city format) or fallback to legacy destination
    if (destinationsPayload.length > 0) {
      basePayload.destinations = destinationsPayload
    } else if (destination) {
      basePayload.destination = destination
    }

    if (dateMode === 'specific') {
      const startISO = startDate ? formatDateToISO(startDate) : null
      const endISO = endDate ? formatDateToISO(endDate) : null

      return {
        ...basePayload,
        dates: { type: 'specific', start_date: startISO, end_date: endISO },
      }
    }

    const days = parseInt(flexibleDays || '0')
    const preferredMonth = form.watch('flexibleMonth') || null
    return {
      ...basePayload,
      dates: { type: 'flexible', days, preferred_month: preferredMonth },
    }
  }

  const onSubmit = async () => {
    if (dateMode === 'specific' && (!form.getValues('startDate') || !form.getValues('endDate'))) {
      toast.error('Please select travel dates')
      return
    }

    const payload = generateAPIPayload()

    const promise = createItinerary(payload as any).then((data) => {
      if (data && data.itin_id) {
        localStorage.setItem('fika:lastChatId', data.itin_id)
        localStorage.setItem(`fika:chat:${data.itin_id}`, JSON.stringify(data))

        setTimeout(() => {
          navigate('/chat')
        }, 1000)

        return data
      }
      throw new Error('Invalid response')
    })

    toast.promise(promise, {
      loading: 'Creating your itinerary...',
      success: 'Itinerary created! Redirecting...',
      error: 'Failed to create itinerary. Please try again.',
    })
  }


  useEffect(() => {
    if (destinationSearchTimeoutRef.current) {
      clearTimeout(destinationSearchTimeoutRef.current)
    }

    if (destinationSearch.length >= LOCATION_SEARCH_MIN_LENGTH) {
      setIsSearchingDestination(true)
      destinationSearchTimeoutRef.current = setTimeout(async () => {
        const results = await searchLocations(destinationSearch)
        setDestinationLocations(results)
        setIsSearchingDestination(false)
      }, LOCATION_SEARCH_DEBOUNCE_MS)
    } else {
      setDestinationLocations([])
      setIsSearchingDestination(false)
    }

    return () => {
      if (destinationSearchTimeoutRef.current) {
        clearTimeout(destinationSearchTimeoutRef.current)
      }
    }
  }, [destinationSearch])

  // Set default selected destinations when destinations change
  useEffect(() => {
    if (destinations.length > 0 && !selectedHotelDestination) {
      setSelectedHotelDestination(destinations[0].city)
    }
    if (destinations.length > 0 && !selectedPlacesDestination) {
      setSelectedPlacesDestination(destinations[0].city)
    }
  }, [destinations, selectedHotelDestination, selectedPlacesDestination])

  useEffect(() => {
    if (hotelSearchTimeoutRef.current) {
      clearTimeout(hotelSearchTimeoutRef.current)
    }

    const searchDest = selectedHotelDestination || destinations[0]?.city
    if (hotelSearch.length >= 3 && searchDest) {
      setIsSearchingHotel(true)
      hotelSearchTimeoutRef.current = setTimeout(async () => {
        const results = await searchPOIsByDestinationAndRole(searchDest, ['accommodation'], hotelSearch)
        setHotelPOIs(
          results.map((poi) => ({
            id: poi.id,
            name: poi.name,
            role: poi.role || 'accommodation',
            latitude: poi.coordinates?.lat || 0,
            longitude: poi.coordinates?.lng || 0,
            themes: poi.themes || [],
            openHours: poi.openHours,
            images: poi.images || [],
          }))
        )
        setIsSearchingHotel(false)
      }, 300)
    } else {
      setHotelPOIs([])
      setIsSearchingHotel(false)
    }

    return () => {
      if (hotelSearchTimeoutRef.current) {
        clearTimeout(hotelSearchTimeoutRef.current)
      }
    }
  }, [hotelSearch, selectedHotelDestination, destinations])

  useEffect(() => {
    if (placesSearchTimeoutRef.current) {
      clearTimeout(placesSearchTimeoutRef.current)
    }

    const searchDest = selectedPlacesDestination || destinations[0]?.city
    if (placesSearch.length >= 3 && searchDest) {
      setIsSearchingPlaces(true)
      placesSearchTimeoutRef.current = setTimeout(async () => {
        const results = await searchPOIsByDestinationAndRole(searchDest, ['meal', 'attraction'], placesSearch)
        setPlacesPOIs(
          results.map((poi) => ({
            id: poi.id,
            name: poi.name,
            role: poi.role || poi.category,
            latitude: poi.coordinates?.lat || 0,
            longitude: poi.coordinates?.lng || 0,
            themes: poi.themes || [],
            openHours: poi.openHours,
            images: poi.images || [],
          }))
        )
        setIsSearchingPlaces(false)
      }, 300)
    } else {
      setPlacesPOIs([])
      setIsSearchingPlaces(false)
    }

    return () => {
      if (placesSearchTimeoutRef.current) {
        clearTimeout(placesSearchTimeoutRef.current)
      }
    }
  }, [placesSearch, selectedPlacesDestination, destinations])

  return (
    <>
      <div className="p-6">
        {/* Stepper */}
        <div className="mx-auto mb-6 flex w-full max-w-2xl items-center gap-3">
          {[1, 2, 3].map((s, idx) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div
                  className={
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm ' +
                    (currentStep === s ? 'bg-black text-white' : s < currentStep ? 'bg-black/70 text-white' : 'border text-muted-foreground')
                  }
                >
                  {s}
                </div>
                <span className="hidden text-sm sm:inline">
                  {s === 1 ? 'Basics' : s === 2 ? 'Preferences' : 'Extras'}
                </span>
              </div>
              {idx < 2 && <div className={`h-0.5 flex-1 rounded ${currentStep > s ? 'bg-black/70' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {currentStep === 1 && (
              <FieldGroup>
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input placeholder={generatedTitle || 'Enter trip name'} value={title || ''} onChange={(e) => form.setValue('title', e.target.value)} />
                </Field>

                <Field>
                  <FieldLabel>Where</FieldLabel>
                  <SearchableSelect
                    inputValue={destinationSearch}
                    onInputChange={setDestinationSearch}
                    placeholder={
                      destinations.length >= MAX_DESTINATIONS
                        ? `Maximum ${MAX_DESTINATIONS} destinations`
                        : 'Where are you going?'
                    }
                    minLength={LOCATION_SEARCH_MIN_LENGTH}
                    open={destinationOpen}
                    onOpenChange={setDestinationOpen}
                    isLoading={isSearchingDestination}
                    items={destinationLocations}
                    getItemKey={(l) => l.id}
                    getItemLabel={(l) => l.label}
                    onSelect={handleAddDestination}
                    disabled={destinations.length >= MAX_DESTINATIONS || destinations.length >= (canAddMultipleDestinations ? MAX_DESTINATIONS : 1)}
                  />

                  <div className="space-y-2">
                    {destinations.map((dest, index) => (
                      <div key={index} className="rounded-xl border p-3 pt-2">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{dest.city}</span>
                            <div className='flex gap-2 items-center justify-end'>
                            <Input
                              readOnly
                              value={
                                dateMode === 'specific'
                                  ? dest.dates?.start_date && dest.dates?.end_date
                                    ? `${format(new Date(dest.dates.start_date), 'MMM d')} — ${format(new Date(dest.dates.end_date), 'MMM d')}`
                                    : 'Dates'
                                  : dest.days
                                    ? `${dest.days} day${dest.days !== 1 ? 's' : ''}`
                                    : 'Days'
                              }
                              onClick={() => handleOpenDestinationSchedule(dest, index)}
                              className="h-8 cursor-pointer text-center text-muted-foreground text-xs"
                              placeholder={dateMode === 'specific' ? 'Set dates' : 'Set days'}
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveDestination(index)} className="h-8 w-8">
                              <X />
                            </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {destinations.length > 0 && !validateDestinations().valid && (
                    <FieldError className='text-center'>{validateDestinations().error}</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel>When</FieldLabel>
                  <Input readOnly value={dateDisplay} onClick={() => setShowDateDialog(true)} className="cursor-pointer" placeholder="Select dates" />
                </Field>

                <Field>
                  <FieldLabel>Who</FieldLabel>
                  <Input readOnly value={whoDisplay} onClick={() => setShowWhoDialog(true)} className="cursor-pointer" placeholder="Select travelers" />
                </Field>

                {/* <Field>
                  <FieldLabel>Budget</FieldLabel>
                  <Input
                    readOnly
                    value={BUDGET_OPTIONS.find((d) => d.value === budget)?.label || ''}
                    onClick={() => setShowBudgetDialog(true)}
                    className="cursor-pointer"
                    placeholder="Select budget"
                  />
                </Field> */}

                <Field>
                  <FieldLabel>Travel Pacing</FieldLabel>
                  <Input
                    readOnly
                    value={PACING_OPTIONS.find((p) => p.value === pacing)?.label || ''}
                    onClick={() => setShowPacingDialog(true)}
                    className="cursor-pointer"
                    placeholder="Select pacing"
                  />
                </Field>

                <Field>
                  <FieldLabel>Dietary Restrictions</FieldLabel>
                  <Input
                    readOnly
                    value={DIETARY_OPTIONS.find((d) => d.value === dietaryRestrictions)?.label || ''}
                    onClick={() => setShowDietaryDialog(true)}
                    className="cursor-pointer"
                    placeholder="Select dietary restrictions"
                  />
                </Field>
                <Field>
                  <Button type="button" onClick={handleNext} disabled={!canProceed()} className="w-full">
                    Next
                  </Button>
                </Field>
              </FieldGroup>
          )}

          {currentStep === 2 && (
            <FieldGroup>
              <Field>
                <FieldLabel>Interests</FieldLabel>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {INTEREST_OPTIONS.map((i) => (
                    <Button
                      key={i.value}
                      type="button"
                      variant={watchInterests.includes(i.value) ? 'default' : 'outline'}
                      onClick={() => toggleInterest(i.value)}
                      className={watchInterests.includes(i.value) ? 'from-gray to-gray bg-linear-to-r/longer via-gray-700' : ''}
                    >
                      {i.label}
                    </Button>
                  ))}
                </div>
              </Field>
              <Field orientation="horizontal">
                <Button type="button" variant="outline" size="icon" onClick={handlePrevious} aria-label="Previous step">
                  <ChevronLeft className="size-5" />
                </Button>
                <Button type="submit" className="flex flex-1">
                  Create Itinerary
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" onClick={handleNext} aria-label="Next step">
                      <ChevronRight className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Additional settings</TooltipContent>
                </Tooltip>
              </Field>
            </FieldGroup>
          )}

          {currentStep === 3 && (
            <FieldGroup>
              {totalDays > 1 && (
                <Field>
                  <FieldLabel>Hotel</FieldLabel>
                  <div className="flex gap-2 w-full">
                    {destinations.length > 1 && (
                      <Select value={selectedHotelDestination} onValueChange={setSelectedHotelDestination}>
                        <SelectTrigger className="w-40 rounded-full">
                          <SelectValue placeholder="Destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {destinations.map((dest) => (
                            <SelectItem key={dest.city} value={dest.city}>
                              {dest.city.split(',')[0]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <SearchableSelect
                      inputValue={hotelSearch}
                      onInputChange={setHotelSearch}
                      placeholder={
                        hotels.length >= availableNights || (dateMode === 'specific' ? !hasAvailableCheckInSpecific : !hasAvailableCheckInFlexible)
                          ? 'No more hotel dates available'
                          : 'Search for hotels, hostels...'
                      }
                      minLength={3}
                      open={hotelOpen}
                      onOpenChange={(open) => {
                        const addDisabledByNights = hotels.length >= availableNights
                        const addDisabledByOccupancy = dateMode === 'specific' ? !hasAvailableCheckInSpecific : !hasAvailableCheckInFlexible
                        if ((addDisabledByNights || addDisabledByOccupancy) && open) {
                          const msg = addDisabledByNights
                            ? 'Total number of hotels cannot be more than the number of nights in the trip'
                            : 'No available hotel check-in dates remain in your trip'
                          toast.error(msg)
                          return false
                        }
                        setHotelOpen(open)
                      }}
                      isLoading={isSearchingHotel}
                      items={hotelPOIs}
                      getItemKey={(p) => p.id}
                      getItemLabel={(p) => p.name}
                      onSelect={(poi) => {
                        handleAddHotel(poi)
                      }}
                      disabled={
                        hotels.length >= availableNights || (dateMode === 'specific' ? !hasAvailableCheckInSpecific : !hasAvailableCheckInFlexible)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    {hotels.map((acc, index) => (
                      <div key={index} className="rounded-xl border p-3 pt-2">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2 items-end">
                              <span className="text-sm font-medium">{acc.poi_name}</span>
                              {acc.destination_city && (
                                <span className="text-muted-foreground text-xs">{acc.destination_city.split(',')[0]}</span>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveHotel(index)} className="h-8 w-8">
                              <X />
                            </Button>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex w-full flex-col items-center">
                              <Label className="text-muted-foreground/60 text-xs">Check-in</Label>
                              <Input
                                readOnly
                                value={dateMode === 'specific' ? formatDateDisplay(acc.check_in_date) : formatDayDisplay(acc.check_in_day)}
                                onClick={() => handleOpenHotelSchedule(acc, index)}
                                className="h-8 w-full cursor-pointer text-xs"
                                placeholder="Check-in"
                              />
                            </div>
                            <div className="flex w-full flex-col items-center">
                              <Label className="text-muted-foreground/60 text-xs">Check-out</Label>
                              <Input
                                readOnly
                                value={dateMode === 'specific' ? formatDateDisplay(acc.check_out_date) : formatDayDisplay(acc.check_out_day)}
                                onClick={() => handleOpenHotelSchedule(acc, index)}
                                className="h-8 w-full cursor-pointer text-xs"
                                placeholder="Check-out"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>
              )}

              <Field>
                <FieldLabel>Places to Visit</FieldLabel>
                <div className="flex gap-2">
                  {destinations.length > 1 && (
                    <Select value={selectedPlacesDestination} onValueChange={setSelectedPlacesDestination}>
                      <SelectTrigger className="w-40 rounded-full">
                        <SelectValue placeholder="Destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((dest) => (
                          <SelectItem key={dest.city} value={dest.city}>
                            {dest.city.split(',')[0]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <SearchableSelect
                    inputValue={placesSearch}
                    onInputChange={setPlacesSearch}
                    placeholder="Search for attractions, restaurants..."
                    minLength={3}
                    open={placesOpen}
                    onOpenChange={setPlacesOpen}
                    isLoading={isSearchingPlaces}
                    items={placesPOIs}
                    getItemKey={(p) => p.id}
                    getItemLabel={(p) => p.name}
                    onSelect={(poi) => handleAddPlace(poi)}
                  />
                </div>

                <div className="space-y-2">
                  {mandatoryPOIs.map((place, index) => (
                    <div key={index} className="rounded-xl border p-3 pt-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2 items-end">
                            <span className="text-sm font-medium">{place.poi_name}</span>
                            {place.destination_city && destinations.length > 1 && (
                              <span className="text-muted-foreground text-xs">{place.destination_city.split(',')[0]}</span>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemovePlace(index)} className="h-8 w-8">
                            <X />
                          </Button>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex w-full flex-col items-center">
                            <Label className="text-muted-foreground/60 text-xs">{dateMode === 'specific' ? 'Date' : 'Day'}</Label>
                            <Input
                              readOnly
                              value={dateMode === 'specific' ? formatDateDisplay(place.date) : formatDayDisplay(place.day)}
                              onClick={() => handleOpenPlaceSchedule(place, index)}
                              className="h-8 cursor-pointer text-xs"
                              placeholder="Date"
                            />
                          </div>
                          <div className="flex w-full flex-col items-center">
                            <Label className="text-muted-foreground/60 text-xs">Time</Label>
                            <Input
                              readOnly
                              value={
                                place.time_type === 'all_day'
                                  ? 'All day'
                                  : place.time_type === 'any_time'
                                    ? 'Any time'
                                    : place.start_time && place.end_time
                                      ? `${place.start_time} - ${place.end_time}`
                                      : 'Set time'
                              }
                              onClick={() => handleOpenPlaceSchedule(place, index)}
                              className="h-8 cursor-pointer text-xs"
                              placeholder="Time"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Field>

              <Field orientation="horizontal">
                <Button type="button" variant="outline" size="icon" onClick={handlePrevious} aria-label="Previous step">
                  <ChevronLeft className="size-5" />
                </Button>
                <Button type="submit" className="flex flex-1">
                  Create Itinerary
                </Button>
              </Field>
            </FieldGroup>
          )}
        </form>
      </div>

      <WhenDialog
        open={showDateDialog}
        onOpenChange={setShowDateDialog}
        dateMode={dateMode}
        onDateModeChange={setDateMode}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        flexibleDays={flexibleDays || '1'}
        onFlexibleDaysChange={(days) => handleInputChange('flexibleDays', days)}
        flexibleMonth={flexibleMonth || ''}
        onFlexibleMonthChange={(month) => handleInputChange('flexibleMonth', month)}
        onSave={handleDateDialogSave}
      />

      <WhoDialog
        open={showWhoDialog}
        onOpenChange={setShowWhoDialog}
        adults={adults}
        onAdultsChange={(val) => form.setValue('adults', val)}
        children={children}
        onChildrenChange={(val) => form.setValue('children', val)}
        pets={pets}
        onPetsChange={(val) => form.setValue('pets', val)}
        isMuslim={form.watch('isMuslim') || false}
        onIsMuslimChange={(val) => form.setValue('isMuslim', val)}
        wheelchairAccessible={form.watch('wheelchairAccessible') || false}
        onWheelchairAccessibleChange={(val) => form.setValue('wheelchairAccessible', val)}
        kidFriendly={form.watch('kidFriendly') || false}
        onKidFriendlyChange={(val) => form.setValue('kidFriendly', val)}
        petFriendly={form.watch('petFriendly') || false}
        onPetFriendlyChange={(val) => form.setValue('petFriendly', val)}
        onSave={() => setShowWhoDialog(false)}
      />

      {/* <BudgetDialog
        open={showBudgetDialog}
        onOpenChange={setShowBudgetDialog}
        budget={budget}
        onBudgetChange={(val) => form.setValue('budget', val)}
        onSave={() => setShowBudgetDialog(false)}
      /> */}

      <PacingDialog
        open={showPacingDialog}
        onOpenChange={setShowPacingDialog}
        pacing={pacing}
        onPacingChange={(val) => form.setValue('pacing', val)}
        onSave={() => setShowPacingDialog(false)}
      />

      <DietaryDialog
        open={showDietaryDialog}
        onOpenChange={setShowDietaryDialog}
        dietaryRestrictions={dietaryRestrictions}
        onDietaryRestrictionsChange={(val) => form.setValue('dietaryRestrictions', val)}
        onSave={() => setShowDietaryDialog(false)}
      />

      {scheduleHotelDialog.hotel && (
        <ScheduleDialog
          open={scheduleHotelDialog.open}
          onOpenChange={(open) => setScheduleHotelDialog({ open, hotel: null, index: -1 })}
          mode="multi-day"
          title={`Schedule: ${scheduleHotelDialog.hotel.poi_name}`}
          isSpecificDates={dateMode === 'specific'}
          availableDates={
            dateMode === 'specific' && startDate && endDate
              ? Array.from({ length: totalDays }, (_, i) => new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000))
              : Array.from({ length: totalDays }, () => new Date())
          }
          disabledDates={(date) => isDateDisabledForHotel(date, scheduleHotelDialog.index)}
          disabledCheckInDayIndices={
            dateMode === 'flexible'
              ? (() => {
                const occupied = computeOccupiedFlexible(scheduleHotelDialog.index)
                const indices = new Set<number>()
                occupied.forEach((d) => indices.add(d))
                // still prevent check-in on the very last trip day (no night after)
                indices.add(totalDays)
                return Array.from(indices)
              })()
              : undefined
          }
          disabledCheckOutDayIndices={
            dateMode === 'flexible'
              ? (() => {
                const base = new Set<number>()
                // cannot check-out on trip start (no night before it)
                base.add(1)
                const inDay = scheduleHotelDialog.hotel?.check_in_day
                if (typeof inDay === 'number') {
                  // cannot check-out same day as check-in
                  base.add(inDay)
                  const occ = computeOccupiedFlexible(scheduleHotelDialog.index)
                  // disable the in-range occupied days (they belong to other hotels)
                  occ.forEach((d) => base.add(d))
                }
                return Array.from(base)
              })()
              : undefined
          }
          defaultMonth={startDate}
          dateRange={{ from: scheduleHotelDialog.hotel.check_in_date, to: scheduleHotelDialog.hotel.check_out_date }}
          onDateRangeChange={(range) => {
            const updated = { ...scheduleHotelDialog.hotel! }
            updated.check_in_date = range?.from
            updated.check_out_date = range?.to
            setScheduleHotelDialog({ ...scheduleHotelDialog, hotel: updated })
          }}
          checkInDay={scheduleHotelDialog.hotel.check_in_day?.toString()}
          onCheckInDayChange={(day) => {
            const updated = { ...scheduleHotelDialog.hotel!, check_in_day: parseInt(day, 10) }
            setScheduleHotelDialog({ ...scheduleHotelDialog, hotel: updated })
          }}
          checkOutDay={scheduleHotelDialog.hotel.check_out_day?.toString()}
          onCheckOutDayChange={(day) => {
            const updated = { ...scheduleHotelDialog.hotel!, check_out_day: parseInt(day, 10) }
            setScheduleHotelDialog({ ...scheduleHotelDialog, hotel: updated })
          }}
          onSave={handleSaveHotelSchedule}
        />
      )}

      {schedulePlaceDialog.place && (
        <ScheduleDialog
          open={schedulePlaceDialog.open}
          onOpenChange={(open) => setSchedulePlaceDialog({ open, place: null, index: -1 })}
          mode="single-day"
          title={`Schedule: ${schedulePlaceDialog.place.poi_name}`}
          isSpecificDates={dateMode === 'specific'}
          availableDates={
            dateMode === 'specific' && startDate && endDate
              ? Array.from({ length: totalDays }, (_, i) => new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000))
              : Array.from({ length: totalDays }, () => new Date())
          }
          disabledDates={(date) => {
            if (!startDate || !endDate) return true
            return date < startDate || date > endDate
          }}
          defaultMonth={startDate}
          selectedDate={schedulePlaceDialog.place.date}
          onDateChange={(date) => {
            const updated = { ...schedulePlaceDialog.place!, date }
            setSchedulePlaceDialog({ ...schedulePlaceDialog, place: updated })
          }}
          selectedDay={schedulePlaceDialog.place.day?.toString()}
          onDayChange={(day) => {
            const updated = { ...schedulePlaceDialog.place!, day: parseInt(day) }
            setSchedulePlaceDialog({ ...schedulePlaceDialog, place: updated })
          }}
          timeType={schedulePlaceDialog.place.time_type}
          onTimeTypeChange={(type) => {
            const updated = { ...schedulePlaceDialog.place!, time_type: type }
            setSchedulePlaceDialog({ ...schedulePlaceDialog, place: updated })
          }}
          startTime={schedulePlaceDialog.place.start_time || ''}
          onStartTimeChange={(time) => {
            const updated = { ...schedulePlaceDialog.place!, start_time: time }
            setSchedulePlaceDialog({ ...schedulePlaceDialog, place: updated })
          }}
          endTime={schedulePlaceDialog.place.end_time || ''}
          onEndTimeChange={(time) => {
            const updated = { ...schedulePlaceDialog.place!, end_time: time }
            setSchedulePlaceDialog({ ...schedulePlaceDialog, place: updated })
          }}
          onSave={handleSavePlaceSchedule}
        />
      )}

      {destinationWhenDialog.destination && (
        <Dialog open={destinationWhenDialog.open} onOpenChange={(open) => setDestinationWhenDialog({ open, destination: null, index: -1 })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{destinationWhenDialog.destination.city}</DialogTitle>
            </DialogHeader>

            {dateMode === 'specific' ? (
              <div className="space-y-4">
                <Calendar
                  mode="range"
                  selected={destDateRange}
                  onSelect={(range) => {
                    setDestDateRange(range)
                  }}
                  numberOfMonths={isMobile ? 1 : 2}
                  className="p-0"
                  disabled={(date) => {
                    if (!startDate || !endDate) return true

                    // Normalize dates to midnight for comparison
                    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                    const tripStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
                    const tripEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

                    // Must be within trip dates
                    if (checkDate < tripStart || checkDate > tripEnd) return true

                    // Check if date is occupied by another destination
                    return destinations.some((dest, idx) => {
                      if (idx === destinationWhenDialog.index) return false
                      if (!dest.dates?.start_date || !dest.dates?.end_date) return false

                      const destStart = new Date(dest.dates.start_date)
                      const destStartNorm = new Date(destStart.getFullYear(), destStart.getMonth(), destStart.getDate())
                      const destEnd = new Date(dest.dates.end_date)
                      const destEndNorm = new Date(destEnd.getFullYear(), destEnd.getMonth(), destEnd.getDate())

                      // Date is disabled if it falls within another destination's range (inclusive)
                      return checkDate >= destStartNorm && checkDate <= destEndNorm
                    })
                  }}
                  defaultMonth={startDate}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mt-4 flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={parseInt(destFlexibleDays || '1') <= 1}
                    onClick={() => setDestFlexibleDays(String(Math.max(1, parseInt(destFlexibleDays || '1') - 1)))}
                  >
                    <Minus />
                  </Button>
                  <span className="w-12 text-center text-2xl font-semibold">{destFlexibleDays}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={(() => {
                      const currentDays = parseInt(destFlexibleDays || '1')
                      const otherDestDays = destinations.reduce((sum, dest, idx) => {
                        if (idx === destinationWhenDialog.index) return sum
                        return sum + (dest.days || 0)
                      }, 0)
                      const tripDays = parseInt(flexibleDays || '1')
                      return currentDays >= tripDays - otherDestDays
                    })()}
                    onClick={() => {
                      const currentDays = parseInt(destFlexibleDays || '1')
                      const otherDestDays = destinations.reduce((sum, dest, idx) => {
                        if (idx === destinationWhenDialog.index) return sum
                        return sum + (dest.days || 0)
                      }, 0)
                      const tripDays = parseInt(flexibleDays || '1')
                      const maxDays = tripDays - otherDestDays

                      setDestFlexibleDays(String(Math.min(maxDays, currentDays + 1)))
                    }}
                  >
                    <Plus />
                  </Button>
                </div>
                <p className="text-muted-foreground text-center text-xs">
                  {(() => {
                    const otherDestDays = destinations.reduce((sum, dest, idx) => {
                      if (idx === destinationWhenDialog.index) return sum
                      return sum + (dest.days || 0)
                    }, 0)
                    const tripDays = parseInt(flexibleDays || '1')
                    const remaining = tripDays - otherDestDays - parseInt(destFlexibleDays || '1')
                    return `${remaining} day${remaining !== 1 ? 's' : ''} remaining`
                  })()}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDestinationWhenDialog({ open: false, destination: null, index: -1 })}>
                Cancel
              </Button>
              <Button onClick={handleSaveDestinationSchedule}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export default CreateItineraryForm
