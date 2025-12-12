import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import { DietaryDialog, PacingDialog, ScheduleDialog, WhenDialog, WhoDialog } from '@/components/dialogs'
import type { TimeType } from '@/components/dialogs/schedule-dialog'
import type { DateMode } from '@/components/dialogs/when-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FallbackImage } from '@/components/ui/fallback-image'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { DIETARY_OPTIONS, INTEREST_OPTIONS, MONTHS, PACING_OPTIONS } from '@/lib/constants'
import {
  calculateDaysBetween,
  formatDateDisplay,
  formatDateRange,
  formatDateToISO,
  formatDayDisplay,
} from '@/lib/date-range'
import { createItinerary, searchLocations, searchPOIsByDestinationAndRole, type Location } from '@/services/api'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Info, Minus, Plus, X } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

// Types & Interfaces

interface Destination {
  city: string
  days?: number
  dates?: {
    type: 'specific' | 'flexible'
    startDate?: string
    endDate?: string
    days?: number
  }
}

interface Hotel {
  poiId: string
  poiName: string
  latitude: number
  longitude: number
  checkInDate?: Date
  checkOutDate?: Date
  checkInDay?: number
  checkOutDay?: number
  destinationCity?: string
  themes?: string[]
  role?: string
  openHours?: any
  images?: string[]
  validationError?: string
}

interface MandatoryPOI {
  poiId: string
  poiName: string
  latitude: number
  longitude: number
  date?: Date
  day?: number
  destinationCity?: string
  timeType: TimeType
  startTime?: string
  endTime?: string
  themes?: string[]
  role?: string
  openHours?: any
  images?: string[]
  validationError?: string
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
const FORM_STATE_KEY = 'fika:createItineraryFormState'

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
  const pacing = form.watch('pacing')
  const dietaryRestrictions = form.watch('dietaryRestrictions')
  const watchInterests = form.watch('interests') || []

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

  const generateTitle = useCallback(
    (
      customTitle?: string,
      dests?: Destination[],
      dest?: string,
      mode?: DateMode,
      start?: Date,
      end?: Date,
      flexDays?: string
    ) => {
      if (customTitle && customTitle.trim()) {
        return customTitle.trim()
      }

      // Multi-city title generation
      if (dests && dests.length > 0) {
        const cityNames = dests.map((d) => d.city.split(',')[0].trim()).join(' & ')

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
    },
    []
  )

  const generatedTitle = useMemo(
    () => generateTitle(title, destinations, destination, dateMode, startDate, endDate, flexibleDays),
    [generateTitle, title, destinations, destination, dateMode, startDate, endDate, flexibleDays]
  )

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
        if (!h.checkInDate || !h.checkOutDate) return
        const inIdx = dayIndexFromTripStart(h.checkInDate)
        const outIdx = dayIndexFromTripStart(h.checkOutDate)
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
        if (h.checkInDay === undefined || h.checkOutDay === undefined) return
        for (let d = h.checkInDay; d < h.checkOutDay; d++) {
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

      const occupied = computeOccupiedSpecific(excludeIndex)
      const idx = dayIndexFromTripStart(date)

      return occupied.has(idx)
    },
    [startDate, endDate, computeOccupiedSpecific, dayIndexFromTripStart]
  )

  // Get destination date range for a specific destination city
  const getDestinationDateRange = useCallback(
    (destinationCity?: string) => {
      if (!destinationCity) return { destStartDate: startDate, destEndDate: endDate }

      const dest = destinations.find((d) => d.city.toLowerCase() === destinationCity.toLowerCase())
      if (!dest) return { destStartDate: startDate, destEndDate: endDate }

      if (dateMode === 'specific' && dest.dates?.startDate && dest.dates?.endDate) {
        return {
          destStartDate: new Date(dest.dates.startDate),
          destEndDate: new Date(dest.dates.endDate),
        }
      }

      return { destStartDate: startDate, destEndDate: endDate }
    },
    [destinations, dateMode, startDate, endDate]
  )

  // Get destination day range for flexible mode
  const getDestinationDayRange = useCallback(
    (destinationCity?: string) => {
      if (!destinationCity || dateMode !== 'flexible') return { startDay: 1, endDay: totalDays }

      const dest = destinations.find((d) => d.city.toLowerCase() === destinationCity.toLowerCase())
      if (!dest || !dest.days) return { startDay: 1, endDay: totalDays }

      // Calculate start day based on position in destinations array
      let startDay = 1
      for (const d of destinations) {
        if (d.city.toLowerCase() === destinationCity.toLowerCase()) break
        startDay += d.days || 0
      }

      return { startDay, endDay: startDay + (dest.days || 1) - 1 }
    },
    [destinations, dateMode, totalDays]
  )

  // Get days occupied by all_day POIs (for disabling in schedule dialog)
  const getAllDayOccupiedDates = useCallback(
    (excludeIndex?: number) => {
      const occupiedDates = new Set<string>()
      const occupiedDays = new Set<number>()

      mandatoryPOIs.forEach((poi, idx) => {
        if (excludeIndex !== undefined && idx === excludeIndex) return
        if (poi.timeType !== 'allDay') return

        if (dateMode === 'specific' && poi.date) {
          occupiedDates.add(poi.date.toISOString().split('T')[0])
        } else if (poi.day !== undefined) {
          occupiedDays.add(poi.day)
        }
      })

      return { occupiedDates, occupiedDays }
    },
    [mandatoryPOIs, dateMode]
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

  const handleDateDialogSave = () => {
    if (dateMode === 'specific') {
      if (dateRange?.from) {
        form.setValue('startDate', dateRange.from)
        form.setValue('endDate', dateRange?.to || dateRange.from)
      }
      form.setValue('flexibleDays', undefined as any)
      form.setValue('flexibleMonth', undefined as any)

      setHotels((prev) => prev.map((acc) => ({ ...acc, checkInDay: undefined, checkOutDay: undefined })))
      setMandatoryPOIs((prev) => prev.map((poi) => ({ ...poi, day: undefined })))
      setDestinations((prev) => prev.map((dest) => ({ ...dest, days: undefined, dates: undefined })))
    } else {
      form.setValue('startDate', undefined)
      form.setValue('endDate', undefined)

      setHotels((prev) => prev.map((acc) => ({ ...acc, checkInDate: undefined, checkOutDate: undefined })))
      setMandatoryPOIs((prev) => prev.map((poi) => ({ ...poi, date: undefined })))
      setDestinations((prev) => prev.map((dest) => ({ ...dest, dates: undefined, days: undefined })))
    }

    setTimeout(() => {
      const newTripDays =
        dateMode === 'specific' && dateRange?.from && dateRange?.to
          ? calculateDaysBetween(dateRange.from, dateRange.to)
          : parseInt(flexibleDays || '1')

      if (dateMode === 'specific' && dateRange?.from && dateRange?.to) {
        const newStart = dateRange.from
        const newEnd = dateRange.to

        setHotels((prev) =>
          prev.map((hotel) => {
            if (hotel.checkInDate && hotel.checkOutDate) {
              if (hotel.checkInDate < newStart || hotel.checkOutDate > newEnd) {
                return { ...hotel, checkInDate: undefined, checkOutDate: undefined }
              }
            }
            return hotel
          })
        )

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
        setHotels((prev) =>
          prev.map((hotel) => {
            if (hotel.checkInDay !== undefined && hotel.checkOutDay !== undefined) {
              if (hotel.checkInDay > newTripDays || hotel.checkOutDay > newTripDays) {
                return { ...hotel, checkInDay: undefined, checkOutDay: undefined }
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
        return dest.dates?.startDate && dest.dates?.endDate
      } else {
        return dest.days !== undefined && dest.days > 0
      }
    })

    const hasAllScheduled = destinations.every((dest) => {
      if (dateMode === 'specific') {
        return dest.dates?.startDate && dest.dates?.endDate
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
    if (destinations.some((d) => d.city === location.label)) {
      toast.error('Destination already added')
      return
    }

    // Validate destination is Johor or Singapore
    const cityName = location.label.split(',')[0].trim().toLowerCase()
    const isValidDestination = cityName === 'johor' || cityName === 'singapore'

    if (!isValidDestination) {
      toast.error('Only Johor and Singapore destinations are supported')
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

    const cityLower = location.label.toLowerCase()
    setHotels((prev) =>
      prev.map((hotel) => {
        if (hotel.destinationCity?.toLowerCase() === cityLower && hotel.validationError) {
          return { ...hotel, validationError: undefined }
        }
        return hotel
      })
    )

    setMandatoryPOIs((prev) =>
      prev.map((poi) => {
        if (poi.destinationCity?.toLowerCase() === cityLower && poi.validationError) {
          return { ...poi, validationError: undefined }
        }
        return poi
      })
    )
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

    // Immediately validate and mark hotels/POIs that reference the removed destination
    const removedCityLower = removedDest.city.toLowerCase()

    // Mark hotels with validation errors
    setHotels((prev) =>
      prev.map((hotel) => {
        if (hotel.destinationCity?.toLowerCase() === removedCityLower) {
          return {
            ...hotel,
            validationError: `Destination "${hotel.destinationCity}" not found in selected destinations`,
          }
        }
        return hotel
      })
    )

    // Mark POIs with validation errors
    setMandatoryPOIs((prev) =>
      prev.map((poi) => {
        if (poi.destinationCity?.toLowerCase() === removedCityLower) {
          return {
            ...poi,
            validationError: `Destination "${poi.destinationCity}" not found in selected destinations`,
          }
        }
        return poi
      })
    )

    // Show toast notification
    const affectedHotels = hotels.filter((h) => h.destinationCity?.toLowerCase() === removedCityLower)
    const affectedPOIs = mandatoryPOIs.filter((p) => p.destinationCity?.toLowerCase() === removedCityLower)

    if (affectedHotels.length > 0 || affectedPOIs.length > 0) {
      const messages = []
      if (affectedHotels.length > 0) {
        messages.push(`${affectedHotels.length} hotel(s)`)
      }
      if (affectedPOIs.length > 0) {
        messages.push(`${affectedPOIs.length} place(s)`)
      }
      toast.error(`${messages.join(' and ')} reference removed destination "${removedDest.city}"`)
    }
  }

  const handleOpenDestinationSchedule = (destination: Destination, index: number) => {
    // Set up date range or flexible days based on current destination
    if (dateMode === 'specific') {
      if (destination.dates?.startDate && destination.dates?.endDate) {
        setDestDateRange({
          from: new Date(destination.dates.startDate),
          to: new Date(destination.dates.endDate),
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

      const newStart = new Date(
        destDateRange.from.getFullYear(),
        destDateRange.from.getMonth(),
        destDateRange.from.getDate()
      )
      const newEnd = new Date(destDateRange.to.getFullYear(), destDateRange.to.getMonth(), destDateRange.to.getDate())

      // Check for overlap with other destinations
      const hasOverlap = destinations.some((dest, idx) => {
        if (idx === index) return false
        if (!dest.dates?.startDate || !dest.dates?.endDate) return false

        const destStart = new Date(dest.dates.startDate)
        const destStartNorm = new Date(destStart.getFullYear(), destStart.getMonth(), destStart.getDate())
        const destEnd = new Date(dest.dates.endDate)
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
        startDate: format(destDateRange.from, 'yyyy-MM-dd'),
        endDate: format(destDateRange.to, 'yyyy-MM-dd'),
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

    // Validate total days match trip days
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

    const datesChanged =
      dateMode === 'specific'
        ? oldDestination.dates?.startDate !== updated.dates?.startDate ||
          oldDestination.dates?.endDate !== updated.dates?.endDate
        : oldDestination.days !== updated.days

    if (datesChanged) {
      const cityLower = destination.city.toLowerCase()

      setHotels((prev) =>
        prev.map((hotel) => {
          if (hotel.destinationCity?.toLowerCase() === cityLower) {
            return {
              ...hotel,
              checkInDate: undefined,
              checkOutDate: undefined,
              checkInDay: undefined,
              checkOutDay: undefined,
            }
          }
          return hotel
        })
      )

      setMandatoryPOIs((prev) =>
        prev.map((poi) => {
          if (poi.destinationCity?.toLowerCase() === cityLower) {
            return {
              ...poi,
              date: undefined,
              day: undefined,
            }
          }
          return poi
        })
      )
    }

    setDestinations(updatedDestinations)
    setDestinationWhenDialog({ open: false, destination: null, index: -1 })
  }

  const handleAddHotel = (poi: POI) => {
    const targetDestination = selectedHotelDestination || destinations[0]?.city

    // Check if destination already has a hotel
    const destinationHasHotel = hotels.some((h) => h.destinationCity === targetDestination)
    if (destinationHasHotel) {
      toast.error('Only one hotel per destination allowed')
      return
    }

    const newHotel: Hotel = {
      poiId: poi.id,
      poiName: poi.name,
      latitude: poi.latitude,
      longitude: poi.longitude,
      destinationCity: targetDestination,
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

  const handleSaveHotelSchedule = () => {
    const { hotel, index } = scheduleHotelDialog
    if (!hotel) return

    if (dateMode === 'specific') {
      if (!hotel.checkInDate || !hotel.checkOutDate) {
        toast.error('Please select both check-in and check-out dates')
        return
      }

      const inDate = new Date(
        hotel.checkInDate.getFullYear(),
        hotel.checkInDate.getMonth(),
        hotel.checkInDate.getDate()
      )
      const outDate = new Date(
        hotel.checkOutDate.getFullYear(),
        hotel.checkOutDate.getMonth(),
        hotel.checkOutDate.getDate()
      )

      // Check overlap with other hotels using half-open interval [check_in, check_out)
      const hasOverlap = hotels.some((h, i) => {
        if (i === index) return false
        if (!h.checkInDate || !h.checkOutDate) return false

        const existingIn = new Date(h.checkInDate.getFullYear(), h.checkInDate.getMonth(), h.checkInDate.getDate())
        const existingOut = new Date(h.checkOutDate.getFullYear(), h.checkOutDate.getMonth(), h.checkOutDate.getDate())

        // Overlap if: new_check_in < existing_check_out AND new_check_out > existing_check_in
        return inDate < existingOut && outDate > existingIn
      })

      if (hasOverlap) {
        toast.error('Hotel dates overlap with another booking')
        return
      }

      const updated = [...hotels]
      updated[index] = { ...hotel, checkInDate: inDate, checkOutDate: outDate }
      setHotels(updated)
      setScheduleHotelDialog({ open: false, hotel: null, index: -1 })
    } else {
      // Flexible mode
      if (hotel.checkInDay === undefined || hotel.checkOutDay === undefined) {
        toast.error('Please select both check-in and check-out day')
        return
      }

      const inDay = hotel.checkInDay
      const outDay = hotel.checkOutDay

      // Validate bounds
      if (inDay < 1 || inDay > totalDays || outDay < 1 || outDay > totalDays) {
        toast.error('Invalid day selection')
        return
      }

      const updated = [...hotels]
      updated[index] = { ...hotel, checkInDay: inDay, checkOutDay: outDay }
      setHotels(updated)
      setScheduleHotelDialog({ open: false, hotel: null, index: -1 })
    }
  }

  const handleAddPlace = (poi: POI) => {
    const newPlace: MandatoryPOI = {
      poiId: poi.id,
      poiName: poi.name,
      timeType: 'anyTime',
      latitude: poi.latitude,
      longitude: poi.longitude,
      destinationCity: selectedPlacesDestination || destinations[0]?.city,
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
    if (!p.timeType) {
      p.timeType = 'anyTime'
    }
    setSchedulePlaceDialog({ open: true, place: p, index })
  }

  const handleSavePlaceSchedule = () => {
    const { place, index } = schedulePlaceDialog
    if (!place) return

    // Validate that both startTime and endTime are provided if timeType is 'specific'
    if (place.timeType === 'specific') {
      if (!place.startTime || !place.endTime) {
        toast.error('Please provide both start time and end time')
        return
      }
      if (place.endTime <= place.startTime) {
        toast.error('End time must be after start time')
        return
      }
    }

    const updated = [...mandatoryPOIs]
    updated[index] = place

    setMandatoryPOIs(updated)
    setSchedulePlaceDialog({ open: false, place: null, index: -1 })
  }

  // Validation helper: Check if hotel booking overlaps with existing bookings
  const isHotelAvailable = useCallback(
    (
      checkIn: Date | number,
      checkOut: Date | number,
      existingBookings: Array<{ checkIn: Date | number; checkOut: Date | number }>
    ) => {
      // Convert to comparable format
      const newCheckIn = typeof checkIn === 'number' ? checkIn : checkIn.getTime()
      const newCheckOut = typeof checkOut === 'number' ? checkOut : checkOut.getTime()

      for (const booking of existingBookings) {
        const existingCheckIn = typeof booking.checkIn === 'number' ? booking.checkIn : booking.checkIn.getTime()
        const existingCheckOut = typeof booking.checkOut === 'number' ? booking.checkOut : booking.checkOut.getTime()

        // Check overlap: new period starts before existing ends AND new period ends after existing starts
        if (newCheckIn < existingCheckOut && newCheckOut > existingCheckIn) {
          return false
        }
      }

      return true
    },
    []
  )

  // Validate hotels and POIs before submission
  const validateHotelsAndPOIs = useCallback(() => {
    const errors: { hotels: string[]; pois: string[] } = { hotels: [], pois: [] }

    // Validate hotels
    hotels.forEach((hotel, index) => {
      let error = ''

      // Check if destination exists
      const hotelDestExists = destinations.some(
        (dest) => dest.city.toLowerCase() === hotel.destinationCity?.toLowerCase()
      )

      if (!hotelDestExists) {
        error = `${hotel.destinationCity} not found in selected destinations`
      }

      // Only validate dates/days if they are set
      if (dateMode === 'specific') {
        if (hotel.checkInDate && hotel.checkOutDate) {
          // Check if dates are within destination date range
          const destForHotel = destinations.find(
            (dest) => dest.city.toLowerCase() === hotel.destinationCity?.toLowerCase()
          )

          if (destForHotel?.dates?.startDate && destForHotel?.dates?.endDate) {
            const destStart = new Date(destForHotel.dates.startDate)
            const destEnd = new Date(destForHotel.dates.endDate)

            if (hotel.checkInDate < destStart || hotel.checkOutDate > destEnd) {
              error =
                error ||
                `Hotel dates must be within destination dates (${format(destStart, 'MMM d')} - ${format(destEnd, 'MMM d')})`
            }
          }

          // Check for overlaps with other hotels
          const otherHotels = hotels
            .filter((_, i) => i !== index)
            .filter((h) => h.checkInDate && h.checkOutDate)
            .map((h) => ({ checkIn: h.checkInDate!, checkOut: h.checkOutDate! }))

          if (!isHotelAvailable(hotel.checkInDate, hotel.checkOutDate, otherHotels)) {
            error = error || 'Hotel dates overlap with another hotel booking'
          }
        }
      } else {
        // Flexible mode - only validate if days are set
        if (hotel.checkInDay !== undefined && hotel.checkOutDay !== undefined) {
          // Check for overlaps
          const otherHotels = hotels
            .filter((_, i) => i !== index)
            .filter((h) => h.checkInDay !== undefined && h.checkOutDay !== undefined)
            .map((h) => ({ checkIn: h.checkInDay!, checkOut: h.checkOutDay! }))

          if (!isHotelAvailable(hotel.checkInDay, hotel.checkOutDay, otherHotels)) {
            error = error || 'Hotel days overlap with another hotel booking'
          }
        }
      }

      errors.hotels[index] = error
    })

    // Validate mandatory POIs
    mandatoryPOIs.forEach((poi, index) => {
      let error = ''

      // Check if destination exists
      const poiDestExists = destinations.some((dest) => dest.city.toLowerCase() === poi.destinationCity?.toLowerCase())

      if (!poiDestExists) {
        error = `Destination "${poi.destinationCity}" not found in selected destinations`
      }

      // Only validate dates/days/times if they are set
      if (dateMode === 'specific') {
        if (poi.date) {
          // Check if date is within destination date range
          const destForPOI = destinations.find((dest) => dest.city.toLowerCase() === poi.destinationCity?.toLowerCase())

          if (destForPOI?.dates?.startDate && destForPOI?.dates?.endDate) {
            const destStart = new Date(destForPOI.dates.startDate)
            const destEnd = new Date(destForPOI.dates.endDate)

            if (poi.date < destStart || poi.date > destEnd) {
              error =
                error ||
                `Date must be within destination dates (${format(destStart, 'MMM d')} - ${format(destEnd, 'MMM d')})`
            }
          }

          // Check for time overlaps on the same day
          if (!error && poi.date) {
            const sameDayPOIs = mandatoryPOIs.filter((p, i) => {
              if (i === index) return false
              if (!p.date) return false
              return p.date.getTime() === poi.date!.getTime()
            })

            // If current POI is allDay, check if any other POI exists on same day
            if (poi.timeType === 'allDay' && sameDayPOIs.length > 0) {
              error = error || 'Cannot add all-day activity when other activities exist on the same day'
            }

            // If any other POI on same day is allDay, current POI cannot be added
            if (sameDayPOIs.some((p) => p.timeType === 'allDay')) {
              error = error || 'Cannot add activity on a day with an all-day activity'
            }

            // Check for specific time overlaps
            if (poi.timeType === 'specific' && poi.startTime && poi.endTime) {
              const hasTimeOverlap = sameDayPOIs.some((p) => {
                if (p.timeType !== 'specific' || !p.startTime || !p.endTime) return false
                // Check if time ranges overlap: [start1, end1) overlaps with [start2, end2)
                return poi.startTime! < p.endTime && poi.endTime! > p.startTime
              })

              if (hasTimeOverlap) {
                error = error || 'Time overlaps with another activity on the same day'
              }
            }
          }
        }
      } else {
        // Flexible mode - only validate if day is set
        if (poi.day !== undefined) {
          // Check for time overlaps on the same day
          const sameDayPOIs = mandatoryPOIs.filter((p, i) => {
            if (i === index) return false
            return p.day === poi.day
          })

          // If current POI is allDay, check if any other POI exists on same day
          if (poi.timeType === 'allDay' && sameDayPOIs.length > 0) {
            error = error || 'Cannot add all-day activity when other activities exist on the same day'
          }

          // If any other POI on same day is allDay, current POI cannot be added
          if (sameDayPOIs.some((p) => p.timeType === 'allDay')) {
            error = error || 'Cannot add activity on a day with an all-day activity'
          }

          // Check for specific time overlaps
          if (poi.timeType === 'specific' && poi.startTime && poi.endTime) {
            const hasTimeOverlap = sameDayPOIs.some((p) => {
              if (p.timeType !== 'specific' || !p.startTime || !p.endTime) return false
              // Check if time ranges overlap: [start1, end1) overlaps with [start2, end2)
              return poi.startTime! < p.endTime && poi.endTime! > p.startTime
            })

            if (hasTimeOverlap) {
              error = error || 'Time overlaps with another activity on the same day'
            }
          }
        }
      }

      // Validate time if specific
      if (poi.timeType === 'specific') {
        if (!poi.startTime || !poi.endTime) {
          error = error || 'Start and end times are required'
        } else if (poi.endTime <= poi.startTime) {
          error = error || 'End time must be after start time'
        }
      }

      errors.pois[index] = error
    })

    return errors
  }, [hotels, mandatoryPOIs, destinations, dateMode, isHotelAvailable])

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

    // Map hotels and use destination dates/days if hotel dates/days are not set
    const hotelPayload = hotels.map((acc) => {
      // Find the destination for this hotel
      const hotelDest = destinations.find((dest) => dest.city.toLowerCase() === acc.destinationCity?.toLowerCase())

      let checkInDate = acc.checkInDate ? formatDateToISO(acc.checkInDate) : undefined
      let checkOutDate = acc.checkOutDate ? formatDateToISO(acc.checkOutDate) : undefined
      let checkInDay = acc.checkInDay
      let checkOutDay = acc.checkOutDay

      // If hotel dates/days are not set, use destination dates/days
      if (dateMode === 'specific' && hotelDest?.dates) {
        if (!checkInDate && hotelDest.dates.startDate) {
          checkInDate = hotelDest.dates.startDate
        }
        if (!checkOutDate && hotelDest.dates.endDate) {
          checkOutDate = hotelDest.dates.endDate
        }
      } else if (dateMode === 'flexible' && hotelDest?.days) {
        if (checkInDay === undefined) {
          checkInDay = 1 // First day of destination
        }
        if (checkOutDay === undefined) {
          checkOutDay = hotelDest.days + 1 // Last day + 1 (checkout day)
        }
      }

      return {
        poiId: acc.poiId,
        poiName: acc.poiName,
        latitude: acc.latitude,
        longitude: acc.longitude,
        destination: acc.destinationCity,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        checkInDay: checkInDay,
        checkOutDay: checkOutDay,
        themes: acc.themes,
        role: acc.role,
        openHours: acc.openHours,
        images: acc.images,
      }
    })

    const mandatoryPOIsPayload = mandatoryPOIs.map((poi) => {
      const payload: any = {
        poiId: poi.poiId,
        poiName: poi.poiName,
        poiDestination: poi.destinationCity,
        latitude: poi.latitude,
        longitude: poi.longitude,
        date: poi.date ? formatDateToISO(poi.date) : undefined,
        day: poi.day,
        timeType: poi.timeType || 'anyTime',
        themes: poi.themes,
        role: poi.role,
        openHours: poi.openHours,
        images: poi.images,
      }

      // Only include time fields if both are provided
      if (poi.timeType === 'specific' && poi.startTime && poi.endTime) {
        payload.startTime = poi.startTime
        payload.endTime = poi.endTime
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
          startDate: dest.dates.startDate,
          endDate: dest.dates.endDate,
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
        pacing: form.watch('pacing'),
        interests: form.watch('interests'),
      },
      flags: {
        ...(isMuslim && { isMuslim: true }),
        ...(wheelchairAccessible && { wheelchairAccessible: true }),
        ...(kidFriendly && { kidsFriendly: true }),
        ...(petFriendly && { petsFriendly: true }),
      },
      ...(dietaryRestrictionsValue &&
        dietaryRestrictionsValue !== 'none' && { dietaryRestrictions: dietaryRestrictionsValue }),
      ...(hotelPayload.length > 0 && { hotels: hotelPayload }),
      ...(mandatoryPOIsPayload.length > 0 && { mandatoryPois: mandatoryPOIsPayload }),
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
        dates: { type: 'specific', startDate: startISO, endDate: endISO },
      }
    }

    const days = parseInt(flexibleDays || '0')
    const preferredMonth = form.watch('flexibleMonth') || null
    return {
      ...basePayload,
      dates: { type: 'flexible', days, preferredMonth: preferredMonth },
    }
  }

  const onSubmit = async () => {
    if (dateMode === 'specific' && (!form.getValues('startDate') || !form.getValues('endDate'))) {
      toast.error('Please select travel dates')
      return
    }

    // Validate hotels and POIs
    const validationErrors = validateHotelsAndPOIs()
    const hasHotelErrors = validationErrors.hotels.some((e) => e)
    const hasPOIErrors = validationErrors.pois.some((e) => e)

    if (hasHotelErrors || hasPOIErrors) {
      // Update state with validation errors
      setHotels((prev) =>
        prev.map((hotel, i) => ({
          ...hotel,
          validationError: validationErrors.hotels[i] || undefined,
        }))
      )

      setMandatoryPOIs((prev) =>
        prev.map((poi, i) => ({
          ...poi,
          validationError: validationErrors.pois[i] || undefined,
        }))
      )

      // Show toast notification
      const errorCount = validationErrors.hotels.filter((e) => e).length + validationErrors.pois.filter((e) => e).length
      toast.error(`Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''} before submitting`)

      // Navigate to step 3 if not already there
      if (currentStep !== 3) {
        setCurrentStep(3)
      }

      return
    }

    setHotels((prev) => prev.map((hotel) => ({ ...hotel, validationError: undefined })))
    setMandatoryPOIs((prev) => prev.map((poi) => ({ ...poi, validationError: undefined })))

    const payload = generateAPIPayload()

    const promise = createItinerary(payload as any)
      .then((data) => {
        if (data && data.itinId) {
          localStorage.setItem('fika:lastChatId', data.itinId)
          localStorage.setItem(`fika:chat:${data.itinId}`, JSON.stringify(data))

          setTimeout(() => {
            navigate('/chat', { state: { initialTab: 'itinerary' } })
          }, 1000)

          return data
        }
        throw new Error('Invalid response')
      })
      .catch((error) => {
        console.error('Create itinerary error:', error)
        throw error
      })

    toast.promise(promise, {
      loading: 'Creating your itinerary...',
      success: 'Itinerary created! Redirecting...',
      error: (err) => {
        const message = err?.message || 'Failed to create itinerary. Please try again.'
        return message
      },
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

  // Load form state from sessionStorage on mount
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem(FORM_STATE_KEY)
      if (savedState) {
        const parsed = JSON.parse(savedState)

        // Restore form values
        if (parsed.formValues) {
          Object.keys(parsed.formValues).forEach((key) => {
            const value = parsed.formValues[key]
            if (key === 'startDate' || key === 'endDate') {
              form.setValue(key as any, value ? new Date(value) : undefined)
            } else {
              form.setValue(key as any, value)
            }
          })
        }

        // Restore other state
        if (parsed.currentStep) setCurrentStep(parsed.currentStep)
        if (parsed.dateMode) setDateMode(parsed.dateMode)
        if (parsed.destinations) setDestinations(parsed.destinations)
        if (parsed.hotels) {
          setHotels(
            parsed.hotels.map((h: any) => ({
              ...h,
              checkInDate: h.checkInDate ? new Date(h.checkInDate) : undefined,
              checkOutDate: h.checkOutDate ? new Date(h.checkOutDate) : undefined,
            }))
          )
        }
        if (parsed.mandatoryPOIs) {
          setMandatoryPOIs(
            parsed.mandatoryPOIs.map((p: any) => ({
              ...p,
              date: p.date ? new Date(p.date) : undefined,
            }))
          )
        }
        if (parsed.selectedHotelDestination) setSelectedHotelDestination(parsed.selectedHotelDestination)
        if (parsed.selectedPlacesDestination) setSelectedPlacesDestination(parsed.selectedPlacesDestination)
        if (parsed.dateRange) {
          setDateRange({
            from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : undefined,
            to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined,
          })
        }
      }
    } catch (error) {
      console.error('Failed to load form state:', error)
    }
  }, [])

  // Save form state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      const formValues = form.getValues()
      const stateToSave = {
        formValues: {
          ...formValues,
          startDate: formValues.startDate?.toISOString(),
          endDate: formValues.endDate?.toISOString(),
        },
        currentStep,
        dateMode,
        destinations,
        hotels: hotels.map((h) => ({
          ...h,
          checkInDate: h.checkInDate?.toISOString(),
          checkOutDate: h.checkOutDate?.toISOString(),
          validationError: undefined, // Don't persist errors
        })),
        mandatoryPOIs: mandatoryPOIs.map((p) => ({
          ...p,
          date: p.date?.toISOString(),
          validationError: undefined, // Don't persist errors
        })),
        selectedHotelDestination,
        selectedPlacesDestination,
        dateRange: {
          from: dateRange?.from?.toISOString(),
          to: dateRange?.to?.toISOString(),
        },
      }

      sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(stateToSave))
    } catch (error) {
      console.error('Failed to save form state:', error)
    }
  }, [
    form.watch(),
    currentStep,
    dateMode,
    destinations,
    hotels,
    mandatoryPOIs,
    selectedHotelDestination,
    selectedPlacesDestination,
    dateRange,
  ])

  // Sticky navigation bar height
  const STICKY_NAV_HEIGHT = 64

  return (
    <div className='flex h-full flex-col'>
      {/* Scrollable content area */}
      <div
        className='flex-1 overflow-auto p-6'
        style={{
          // Only add extra bottom padding on mobile where the nav is fixed
          paddingBottom: isMobile ? `${STICKY_NAV_HEIGHT + BOTTOM_NAV_HEIGHT + 16}px` : undefined,
        }}
      >
        {/* Stepper */}
        <div className='mx-auto mb-6 flex w-full max-w-2xl items-center gap-3'>
          {[1, 2, 3].map((s, idx) => (
            <React.Fragment key={s}>
              <div className='flex items-center gap-2'>
                <div
                  className={
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm ' +
                    (currentStep === s
                      ? 'bg-black text-white'
                      : s < currentStep
                        ? 'bg-black/70 text-white'
                        : 'text-muted-foreground border')
                  }
                >
                  {s}
                </div>
                <span className='hidden text-sm sm:inline'>
                  {s === 1 ? 'Basics' : s === 2 ? 'Preferences' : 'Extras'}
                </span>
              </div>
              {idx < 2 && <div className={`h-0.5 flex-1 rounded ${currentStep > s ? 'bg-black/70' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} id='create-itinerary-form'>
          {currentStep === 1 && (
            <FieldGroup>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  placeholder={generatedTitle || 'Enter trip name'}
                  value={title || ''}
                  onChange={(e) => form.setValue('title', e.target.value)}
                />
              </Field>

              <Field>
                <div className='flex items-center gap-2'>
                  <FieldLabel>Where</FieldLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className='text-muted-foreground size-3.5' />
                    </TooltipTrigger>
                    <TooltipContent>Only Johor and Singapore are supported</TooltipContent>
                  </Tooltip>
                </div>
                <SearchableSelect
                  inputValue={destinationSearch}
                  onInputChange={setDestinationSearch}
                  placeholder={
                    destinations.length >= MAX_DESTINATIONS
                      ? `Maximum ${MAX_DESTINATIONS} destinations`
                      : !canAddMultipleDestinations && destinations.length >= 1
                        ? 'Multi-city is disabled for a single day trip'
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
                  disabled={
                    destinations.length >= MAX_DESTINATIONS ||
                    destinations.length >= (canAddMultipleDestinations ? MAX_DESTINATIONS : 1)
                  }
                />

                <div className='space-y-2'>
                  {destinations.map((dest, index) => (
                    <div key={index} className='rounded-xl border p-3 pt-2'>
                      <div className='min-w-0 flex-1 space-y-2'>
                        <div className='flex items-center justify-between'>
                          <span className='text-sm font-medium'>{dest.city}</span>
                          <div className='flex items-center justify-end gap-2'>
                            <Input
                              readOnly
                              value={
                                dateMode === 'specific'
                                  ? dest.dates?.startDate && dest.dates?.endDate
                                    ? `${format(new Date(dest.dates.startDate), 'MMM d')} — ${format(new Date(dest.dates.endDate), 'MMM d')}`
                                    : 'Dates'
                                  : dest.days
                                    ? `${dest.days} day${dest.days !== 1 ? 's' : ''}`
                                    : 'Days'
                              }
                              onClick={() => handleOpenDestinationSchedule(dest, index)}
                              className='text-muted-foreground h-8 cursor-pointer text-center text-xs'
                              placeholder={dateMode === 'specific' ? 'Set dates' : 'Set days'}
                            />
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => handleRemoveDestination(index)}
                              className='h-8 w-8'
                            >
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
                <Input
                  readOnly
                  value={dateDisplay}
                  onClick={() => setShowDateDialog(true)}
                  className='cursor-pointer'
                  placeholder='Select dates'
                />
              </Field>

              <Field>
                <FieldLabel>Who</FieldLabel>
                <Input
                  readOnly
                  value={whoDisplay}
                  onClick={() => setShowWhoDialog(true)}
                  className='cursor-pointer'
                  placeholder='Select travelers'
                />
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
                  className='cursor-pointer'
                  placeholder='Select pacing'
                />
              </Field>

              <Field>
                <FieldLabel>Dietary Restrictions</FieldLabel>
                <Input
                  readOnly
                  value={DIETARY_OPTIONS.find((d) => d.value === dietaryRestrictions)?.label || ''}
                  onClick={() => setShowDietaryDialog(true)}
                  className='cursor-pointer'
                  placeholder='Select dietary restrictions'
                />
              </Field>
            </FieldGroup>
          )}

          {currentStep === 2 && (
            <FieldGroup>
              <Field>
                <FieldLabel>Interests</FieldLabel>
                <div className='mt-2 grid grid-cols-2 gap-3'>
                  {INTEREST_OPTIONS.map((i) => (
                    <Button
                      key={i.value}
                      type='button'
                      variant={watchInterests.includes(i.value) ? 'default' : 'outline'}
                      onClick={() => toggleInterest(i.value)}
                      className={
                        watchInterests.includes(i.value) ? 'from-gray to-gray bg-linear-to-r/longer via-gray-700' : ''
                      }
                    >
                      {i.label}
                    </Button>
                  ))}
                </div>
              </Field>
            </FieldGroup>
          )}

          {currentStep === 3 && (
            <FieldGroup>
              {totalDays > 1 && (
                <Field>
                  <FieldLabel>Hotel</FieldLabel>
                  <div className='flex w-full gap-2'>
                    {destinations.length > 1 && (
                      <Select value={selectedHotelDestination} onValueChange={setSelectedHotelDestination}>
                        <SelectTrigger className='w-40 rounded-full'>
                          <SelectValue placeholder='Destination' />
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
                        hotels.some((h) => h.destinationCity === (selectedHotelDestination || destinations[0]?.city))
                          ? 'Only one hotel per destination'
                          : 'Search for hotels, hostels...'
                      }
                      minLength={3}
                      open={hotelOpen}
                      onOpenChange={(open) => {
                        const targetDest = selectedHotelDestination || destinations[0]?.city
                        const destHasHotel = hotels.some((h) => h.destinationCity === targetDest)
                        if (destHasHotel && open) {
                          toast.error('Only one hotel per destination allowed')
                          return false
                        }
                        setHotelOpen(open)
                      }}
                      isLoading={isSearchingHotel}
                      items={hotelPOIs}
                      getItemKey={(p) => p.id}
                      getItemLabel={(p) => p.name}
                      getItemDisabled={(p) => hotels.some((h) => h.poiId === p.id)}
                      onSelect={(poi) => {
                        handleAddHotel(poi)
                      }}
                      disabled={hotels.some(
                        (h) => h.destinationCity === (selectedHotelDestination || destinations[0]?.city)
                      )}
                    />
                  </div>

                  <div className='space-y-2'>
                    {hotels.map((acc, index) => (
                      <div key={index} className='rounded-xl border p-3'>
                        <div className='flex items-center gap-3'>
                          <FallbackImage
                            src={acc.images?.[0] ? `${acc.images[0]}=s300` : undefined}
                            alt={acc.poiName}
                            className='size-12 flex-shrink-0 rounded-lg object-cover'
                          />
                          <div className='min-w-0 flex-1'>
                            <div className='flex items-start justify-between gap-2'>
                              <div className='flex flex-col'>
                                <span className='truncate text-sm font-medium'>{acc.poiName}</span>
                                {acc.destinationCity && (
                                  <span className='text-muted-foreground text-xs'>
                                    {acc.destinationCity.split(',')[0]}
                                  </span>
                                )}
                              </div>
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => handleRemoveHotel(index)}
                                className='h-8 w-8 flex-shrink-0'
                              >
                                <X />
                              </Button>
                            </div>
                          </div>
                          {acc.validationError && (
                            <FieldError className='text-center'>{acc.validationError}</FieldError>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>
              )}

              <Field>
                <FieldLabel>Places to Visit</FieldLabel>
                <div className='flex gap-2'>
                  {destinations.length > 1 && (
                    <Select value={selectedPlacesDestination} onValueChange={setSelectedPlacesDestination}>
                      <SelectTrigger className='w-40 rounded-full'>
                        <SelectValue placeholder='Destination' />
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
                    placeholder='Search for attractions, restaurants...'
                    minLength={3}
                    open={placesOpen}
                    onOpenChange={setPlacesOpen}
                    isLoading={isSearchingPlaces}
                    items={placesPOIs}
                    getItemKey={(p) => p.id}
                    getItemLabel={(p) => p.name}
                    getItemDisabled={(p) => mandatoryPOIs.some((poi) => poi.poiId === p.id)}
                    onSelect={(poi) => handleAddPlace(poi)}
                  />
                </div>

                <div className='space-y-2'>
                  {mandatoryPOIs.map((place, index) => (
                    <div key={index} className='rounded-xl border p-3'>
                      <div className='flex items-start gap-3'>
                        <FallbackImage
                          src={place.images?.[0] ? `${place.images[0]}=s300` : undefined}
                          alt={place.poiName}
                          className='size-16 flex-shrink-0 rounded-lg object-cover'
                        />
                        <div className='min-w-0 flex-1 space-y-1'>
                          <div className='flex items-start justify-between'>
                            <div className='flex flex-col'>
                              <span className='leading-tight font-medium'>{place.poiName}</span>
                              {place.destinationCity && destinations.length > 1 && (
                                <span className='text-muted-foreground text-xs'>
                                  {place.destinationCity.split(',')[0]}
                                </span>
                              )}
                            </div>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => handleRemovePlace(index)}
                              className='h-8 w-8 flex-shrink-0'
                            >
                              <X />
                            </Button>
                          </div>
                          <div className='flex gap-2'>
                            <div className='flex w-full flex-col items-center'>
                              <Label className='text-muted-foreground/60 text-xs'>
                                {dateMode === 'specific' ? 'Date' : 'Day'}
                              </Label>
                              <Input
                                readOnly
                                value={
                                  dateMode === 'specific' ? formatDateDisplay(place.date) : formatDayDisplay(place.day)
                                }
                                onClick={() => handleOpenPlaceSchedule(place, index)}
                                className='h-8 cursor-pointer text-center text-xs'
                                placeholder='Date'
                              />
                            </div>
                            <div className='flex w-full flex-col items-center'>
                              <Label className='text-muted-foreground/60 text-xs'>Time</Label>
                              <Input
                                readOnly
                                value={
                                  place.timeType === 'allDay'
                                    ? 'All day'
                                    : place.timeType === 'anyTime'
                                      ? 'Any time'
                                      : place.startTime && place.endTime
                                        ? `${place.startTime} - ${place.endTime}`
                                        : 'Set time'
                                }
                                onClick={() => handleOpenPlaceSchedule(place, index)}
                                className='h-8 cursor-pointer text-center text-xs'
                                placeholder='Time'
                              />
                            </div>
                          </div>
                          {place.validationError && (
                            <FieldError className='mt-1 text-center'>{place.validationError}</FieldError>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
            </FieldGroup>
          )}
        </form>
      </div>

      {/* Sticky Navigation Bar */}
      <div
        className='z-30 flex-shrink-0 border-t bg-white px-6 py-4'
        style={
          isMobile
            ? {
                position: 'fixed',
                bottom: `${BOTTOM_NAV_HEIGHT}px`,
                left: 0,
                right: 0,
              }
            : undefined
        }
      >
        <div className='mx-auto flex max-w-2xl items-center gap-3'>
          {currentStep > 1 && (
            <Button type='button' variant='outline' size='icon' onClick={handlePrevious} aria-label='Previous step'>
              <ChevronLeft className='size-5' />
            </Button>
          )}
          {currentStep === 1 && (
            <Button type='button' onClick={handleNext} disabled={!canProceed()} className='flex-1'>
              Next
            </Button>
          )}
          {currentStep === 2 && (
            <>
              <Button type='submit' form='create-itinerary-form' className='flex flex-1'>
                Create Itinerary
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type='button' variant='outline' size='icon' onClick={handleNext} aria-label='Next step'>
                    <ChevronRight className='size-5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Additional settings</TooltipContent>
              </Tooltip>
            </>
          )}
          {currentStep === 3 && (
            <Button type='submit' form='create-itinerary-form' className='flex flex-1'>
              Create Itinerary
            </Button>
          )}
        </div>
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
          mode='multi-day'
          title={`Schedule: ${scheduleHotelDialog.hotel.poiName}`}
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
                  // cannot check-out on first trip day (no night before it)
                  base.add(1)
                  const inDay = scheduleHotelDialog.hotel?.checkInDay
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
          dateRange={{ from: scheduleHotelDialog.hotel.checkInDate, to: scheduleHotelDialog.hotel.checkOutDate }}
          onDateRangeChange={(range) => {
            const updated = { ...scheduleHotelDialog.hotel! }
            updated.checkInDate = range?.from
            updated.checkOutDate = range?.to
            setScheduleHotelDialog({ ...scheduleHotelDialog, hotel: updated })
          }}
          checkInDay={scheduleHotelDialog.hotel.checkInDay?.toString()}
          onCheckInDayChange={(day) => {
            const updated = { ...scheduleHotelDialog.hotel!, checkInDay: parseInt(day, 10) }
            setScheduleHotelDialog({ ...scheduleHotelDialog, hotel: updated })
          }}
          checkOutDay={scheduleHotelDialog.hotel.checkOutDay?.toString()}
          onCheckOutDayChange={(day) => {
            const updated = { ...scheduleHotelDialog.hotel!, checkOutDay: parseInt(day, 10) }
            setScheduleHotelDialog({ ...scheduleHotelDialog, hotel: updated })
          }}
          onSave={handleSaveHotelSchedule}
        />
      )}

      {schedulePlaceDialog.place &&
        (() => {
          const placeDestCity = schedulePlaceDialog.place.destinationCity
          const { destStartDate, destEndDate } = getDestinationDateRange(placeDestCity)
          const { startDay, endDay } = getDestinationDayRange(placeDestCity)
          const { occupiedDates, occupiedDays } = getAllDayOccupiedDates(schedulePlaceDialog.index)

          // Calculate available dates for destination
          const availableDatesForDest =
            dateMode === 'specific' && destStartDate && destEndDate
              ? (() => {
                  const days: Date[] = []
                  const current = new Date(
                    destStartDate.getFullYear(),
                    destStartDate.getMonth(),
                    destStartDate.getDate()
                  )
                  const end = new Date(destEndDate.getFullYear(), destEndDate.getMonth(), destEndDate.getDate())
                  while (current <= end) {
                    days.push(new Date(current))
                    current.setDate(current.getDate() + 1)
                  }
                  return days
                })()
              : Array.from({ length: endDay - startDay + 1 }, () => new Date())

          // Calculate disabled days for flexible mode
          const disabledDayIndices =
            dateMode === 'flexible'
              ? (() => {
                  const disabled: number[] = []
                  // Add days outside destination range
                  for (let i = 1; i <= totalDays; i++) {
                    if (i < startDay || i > endDay) {
                      disabled.push(i)
                    }
                  }
                  // Add all_day occupied days
                  occupiedDays.forEach((day) => disabled.push(day))
                  return disabled
                })()
              : undefined

          return (
            <ScheduleDialog
              open={schedulePlaceDialog.open}
              onOpenChange={(open) => setSchedulePlaceDialog({ open, place: null, index: -1 })}
              mode='single-day'
              title={`Schedule: ${schedulePlaceDialog.place.poiName}`}
              isSpecificDates={dateMode === 'specific'}
              availableDates={availableDatesForDest}
              startDayNumber={startDay}
              disabledDates={(date) => {
                if (!destStartDate || !destEndDate) return true
                const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                const destStart = new Date(
                  destStartDate.getFullYear(),
                  destStartDate.getMonth(),
                  destStartDate.getDate()
                )
                const destEnd = new Date(destEndDate.getFullYear(), destEndDate.getMonth(), destEndDate.getDate())
                // Disable if outside destination date range
                if (checkDate < destStart || checkDate > destEnd) return true
                // Disable if already has all_day POI
                const dateStr = checkDate.toISOString().split('T')[0]
                if (occupiedDates.has(dateStr)) return true
                return false
              }}
              disabledCheckInDayIndices={disabledDayIndices}
              defaultMonth={destStartDate}
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
              timeType={schedulePlaceDialog.place.timeType}
              onTimeTypeChange={(type) => {
                const updated = { ...schedulePlaceDialog.place!, timeType: type }
                setSchedulePlaceDialog({ ...schedulePlaceDialog, place: updated })
              }}
              startTime={schedulePlaceDialog.place.startTime || ''}
              onStartTimeChange={(time) => {
                const updated = { ...schedulePlaceDialog.place!, startTime: time }
                setSchedulePlaceDialog({ ...schedulePlaceDialog, place: updated })
              }}
              endTime={schedulePlaceDialog.place.endTime || ''}
              onEndTimeChange={(time) => {
                const updated = { ...schedulePlaceDialog.place!, endTime: time }
                setSchedulePlaceDialog({ ...schedulePlaceDialog, place: updated })
              }}
              onSave={handleSavePlaceSchedule}
            />
          )
        })()}

      {destinationWhenDialog.destination && (
        <Dialog
          open={destinationWhenDialog.open}
          onOpenChange={(open) => setDestinationWhenDialog({ open, destination: null, index: -1 })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{destinationWhenDialog.destination.city}</DialogTitle>
            </DialogHeader>

            {dateMode === 'specific' ? (
              <div className='space-y-4'>
                <Calendar
                  mode='range'
                  selected={destDateRange}
                  onSelect={(range) => {
                    setDestDateRange(range)
                  }}
                  numberOfMonths={isMobile ? 1 : 2}
                  className='p-0'
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
                      if (!dest.dates?.startDate || !dest.dates?.endDate) return false

                      const destStart = new Date(dest.dates.startDate)
                      const destStartNorm = new Date(destStart.getFullYear(), destStart.getMonth(), destStart.getDate())
                      const destEnd = new Date(dest.dates.endDate)
                      const destEndNorm = new Date(destEnd.getFullYear(), destEnd.getMonth(), destEnd.getDate())

                      // Date is disabled if it falls within another destination's range (inclusive)
                      return checkDate >= destStartNorm && checkDate <= destEndNorm
                    })
                  }}
                  defaultMonth={startDate}
                />
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='mt-4 flex items-center justify-center gap-4'>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    disabled={parseInt(destFlexibleDays || '1') <= 1}
                    onClick={() => setDestFlexibleDays(String(Math.max(1, parseInt(destFlexibleDays || '1') - 1)))}
                  >
                    <Minus />
                  </Button>
                  <span className='w-12 text-center text-2xl font-semibold'>{destFlexibleDays}</span>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
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
                <p className='text-muted-foreground text-center text-xs'>
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
              <Button
                variant='outline'
                onClick={() => setDestinationWhenDialog({ open: false, destination: null, index: -1 })}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveDestinationSchedule}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default CreateItineraryForm
