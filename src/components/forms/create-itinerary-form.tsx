import { z } from 'zod'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field'
import { ChevronLeft, Check, X, ChevronRight } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { searchLocations, type Location, createItinerary, searchPOIsByDestinationAndRole } from '@/services/api'
import { WhenDialog, WhoDialog, BudgetDialog, PacingDialog, ScheduleDialog } from '@/components/dialogs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// TYPES & INTERFACES
interface CreateItineraryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Accommodation {
  poi_id: string
  poi_name: string
  check_in_date?: Date
  check_out_date?: Date
  check_in_day?: number
  check_out_day?: number
}

interface MandatoryPOI {
  poi_id: string
  poi_name: string
  date?: Date
  day?: number
  time_type: 'specific' | 'all_day' | 'any_time'
  start_time?: string
  end_time?: string
}

interface POI {
  id: string
  name: string
  role: string
}

type DateMode = 'specific' | 'flexible'
type BudgetKey = 'any' | 'tight' | 'sensible' | 'upscale' | 'luxury'

// CONSTANTS
const PACING_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'packed', label: 'Packed' },
] as const

const INTEREST_OPTIONS = [
  { value: 'food_culinary', label: 'Food & Culinary' },
  { value: 'cultural_history', label: 'Cultural & History' },
  { value: 'religious_sites', label: 'Religious Sites' },
  { value: 'nature', label: 'Nature & Parks' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'family', label: 'Family Attractions' },
  { value: 'art_museums', label: 'Art & Museums' },
  { value: 'adventure', label: 'Adventure' },
] as const

const MONTHS = [
  { value: 'september', label: 'September' },
  { value: 'october', label: 'October' },
  { value: 'november', label: 'November' },
  { value: 'december', label: 'December' },
  { value: 'january', label: 'January' },
  { value: 'february', label: 'February' },
  { value: 'march', label: 'March' },
  { value: 'april', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'june', label: 'June' },
  { value: 'july', label: 'July' },
  { value: 'august', label: 'August' },
] as const

const BUDGET_LABELS: Record<BudgetKey, string> = {
  any: 'Any budget',
  tight: 'On a budget',
  sensible: 'Sensibly priced',
  upscale: 'Upscale',
  luxury: 'Luxury',
}

const LOCATION_SEARCH_MIN_LENGTH = 3
const LOCATION_SEARCH_DEBOUNCE_MS = 300

// HELPER FUNCTIONS
const calculateDaysBetween = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  const diffMs = end.getTime() - start.getTime()
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
}

const formatDateToISO = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// FORM SCHEMA
const formSchema = z
  .object({
    title: z.string().optional(),
    destination: z.string().min(1, 'Destination is required'),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    flexibleDays: z.string().optional(),
    flexibleMonth: z.string().optional(),
    adults: z.number().min(1).max(10),
    children: z.number().min(0).max(10),
    pets: z.number().min(0).max(5),
    isMuslim: z.boolean().optional(),
    kidFriendly: z.boolean().optional(),
    petFriendly: z.boolean().optional(),
    budget: z.string().min(1, 'Budget is required'),
    pacing: z.string().min(1, 'Pacing is required'),
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

type FormData = z.infer<typeof formSchema>

// COMPONENT
const CreateItineraryForm: React.FC<CreateItineraryFormProps> = ({ open, onOpenChange }) => {
  // State
  const [currentStep, setCurrentStep] = useState(1)
  const [dateMode, setDateMode] = useState<DateMode>('flexible')
  const [showDateDialog, setShowDateDialog] = useState(false)
  const [showWhoDialog, setShowWhoDialog] = useState(false)
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showPacingDialog, setShowPacingDialog] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() + 86400000),
  })

  // Step 3 state
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [mandatoryPOIs, setMandatoryPOIs] = useState<MandatoryPOI[]>([])
  const [accommodationOpen, setAccommodationOpen] = useState(false)
  const [accommodationSearch, setAccommodationSearch] = useState('')
  const [accommodationPOIs, setAccommodationPOIs] = useState<POI[]>([])
  const [isSearchingAccommodation, setIsSearchingAccommodation] = useState(false)
  const [placesOpen, setPlacesOpen] = useState(false)
  const [placesSearch, setPlacesSearch] = useState('')
  const [placesPOIs, setPlacesPOIs] = useState<POI[]>([])
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
  const [scheduleAccommodationDialog, setScheduleAccommodationDialog] = useState<{
    open: boolean
    accommodation: Accommodation | null
    index: number
  }>({ open: false, accommodation: null, index: -1 })
  const [schedulePlaceDialog, setSchedulePlaceDialog] = useState<{
    open: boolean
    place: MandatoryPOI | null
    index: number
  }>({ open: false, place: null, index: -1 })

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const accommodationSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const placesSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      kidFriendly: false,
      petFriendly: false,
      budget: 'any',
      pacing: 'balanced',
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
  const budget = form.watch('budget')
  const pacing = form.watch('pacing')
  const watchInterests = form.watch('interests') || []

  // Computed values
  const budgetKey: BudgetKey = budget === 'tight' || budget === 'sensible' || budget === 'upscale' || budget === 'luxury' ? budget : 'any'

  const isValidDestination = useMemo(() => {
    if (!destination) return false
    if (selectedLocation && selectedLocation.name === destination) return true
    return false
  }, [destination, selectedLocation])

  const dateDisplay = useMemo(() => {
    if (dateMode === 'specific' && startDate && endDate) {
      const sameYear = startDate.getFullYear() === endDate.getFullYear()
      const sameMonth = startDate.getMonth() === endDate.getMonth()
      const sameDay = startDate.getDate() === endDate.getDate()

      if (sameYear && sameMonth && sameDay) {
        return `${format(startDate, 'MMM d')}`
      } else if (sameYear && sameMonth) {
        return `${format(startDate, 'MMM d')} — ${format(endDate, 'd')}`
      } else if (sameYear) {
        return `${format(startDate, 'MMM d')} — ${format(endDate, 'MMM d')}`
      } else {
        return `${format(startDate, 'MMM d, yyyy')} — ${format(endDate, 'MMM d, yyyy')}`
      }
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

  const generateTitle = useCallback((customTitle?: string, dest?: string, mode?: DateMode, start?: Date, end?: Date, flexDays?: string) => {
    if (customTitle && customTitle.trim()) {
      return customTitle.trim()
    }

    const destination = dest || 'Trip'

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
    () => generateTitle(title, destination, dateMode, startDate, endDate, flexibleDays),
    [generateTitle, title, destination, dateMode, startDate, endDate, flexibleDays]
  )

  const isDateDisabledForAccommodation = useCallback(
    (date: Date, excludeIndex?: number) => {
      if (!startDate || !endDate) return true
      if (date < startDate || date > endDate) return true

      return accommodations.some((acc, idx) => {
        if (excludeIndex !== undefined && idx === excludeIndex) return false
        if (!acc.check_in_date || !acc.check_out_date) return false
        return date >= acc.check_in_date && date < acc.check_out_date
      })
    },
    [accommodations, startDate, endDate]
  )

  // Handlers
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep(1)
      form.reset()
      setAccommodations([])
      setMandatoryPOIs([])
    }
    onOpenChange(newOpen)
  }

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
        // Auto-set end date to the same as start if not provided
        form.setValue('startDate', dateRange.from)
        form.setValue('endDate', dateRange?.to || dateRange.from)
      }
      form.setValue('flexibleDays', undefined as any)
      form.setValue('flexibleMonth', undefined as any)

      // Clear incompatible flexible fields
      setAccommodations((prev) =>
        prev.map((acc) => ({ ...acc, check_in_day: undefined, check_out_day: undefined }))
      )
      setMandatoryPOIs((prev) => prev.map((poi) => ({ ...poi, day: undefined })))
    } else {
      form.setValue('startDate', undefined)
      form.setValue('endDate', undefined)

      // Clear incompatible specific fields
      setAccommodations((prev) =>
        prev.map((acc) => ({ ...acc, check_in_date: undefined, check_out_date: undefined }))
      )
      setMandatoryPOIs((prev) => prev.map((poi) => ({ ...poi, date: undefined })))
    }
    setShowDateDialog(false)
  }

  const canProceed = () => {
    if (currentStep === 1) {
      const v = form.getValues()
      const hasValidDestination = !!v.destination && isValidDestination
      const hasDates = dateMode === 'specific' ? !!v.startDate && !!v.endDate : !!v.flexibleDays
      return hasValidDestination && hasDates && !!v.budget && !!v.pacing
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

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location)
    form.setValue('destination', location.name, {
      shouldDirty: true,
      shouldValidate: true,
    })
    setLocationSearch(location.label)
    setLocationOpen(false)
  }

  const handleAddAccommodation = (poi: POI) => {
    // Prevent adding more accommodations than total days
    if (accommodations.length >= totalDays) {
      toast.error('You cannot add more accommodations than the total number of days')
      return
    }
    const newAccommodation: Accommodation = {
      poi_id: poi.id,
      poi_name: poi.name,
    }
    setAccommodations([...accommodations, newAccommodation])
    setAccommodationSearch('')
    setAccommodationOpen(false)
  }

  const handleRemoveAccommodation = (index: number) => {
    setAccommodations(accommodations.filter((_, idx) => idx !== index))
  }

  const handleOpenAccommodationSchedule = (accommodation: Accommodation, index: number) => {
    setScheduleAccommodationDialog({ open: true, accommodation, index })
  }

  const handleSaveAccommodationSchedule = () => {
    const { accommodation, index } = scheduleAccommodationDialog
    if (!accommodation) return

    // Validate check-in/out ordering and minimum 2-day stay (overnight)
    if (dateMode === 'specific') {
      if (!accommodation.check_in_date || !accommodation.check_out_date) {
        toast.error('Please select both check-in and check-out dates')
        return
      }
      const inDate = new Date(accommodation.check_in_date)
      const outDate = new Date(accommodation.check_out_date)
      if (outDate < inDate) {
        toast.error('Check-out must be on or after check-in')
        return
      }
      if (calculateDaysBetween(inDate, outDate) < 2) {
        toast.error('Accommodation stay must be at least 2 days (overnight)')
        return
      }
    } else {
      if (
        accommodation.check_in_day === undefined ||
        accommodation.check_out_day === undefined
      ) {
        toast.error('Please select both check-in and check-out day')
        return
      }
      if (accommodation.check_out_day < accommodation.check_in_day) {
        toast.error('Check-out day must be on or after check-in day')
        return
      }
      if ((accommodation.check_out_day - accommodation.check_in_day + 1) < 2) {
        toast.error('Accommodation stay must be at least 2 days (overnight)')
        return
      }
    }

    const updated = [...accommodations]
    updated[index] = accommodation

    const newOccupiedDays = updated.reduce((total, acc) => {
      if (dateMode === 'specific' && acc.check_in_date && acc.check_out_date) {
        return total + calculateDaysBetween(acc.check_in_date, acc.check_out_date)
      } else if (dateMode === 'flexible' && acc.check_in_day !== undefined && acc.check_out_day !== undefined) {
        return total + (acc.check_out_day - acc.check_in_day + 1)
      }
      return total
    }, 0)

    if (newOccupiedDays > totalDays) {
      toast.error(`Total accommodation days (${newOccupiedDays}) cannot exceed trip duration (${totalDays} days)`)
      return
    }

    setAccommodations(updated)
    setScheduleAccommodationDialog({ open: false, accommodation: null, index: -1 })
  }

  const handleAddPlace = (poi: POI) => {
    const newPlace: MandatoryPOI = {
      poi_id: poi.id,
      poi_name: poi.name,
      time_type: 'any_time',
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

    const updated = [...mandatoryPOIs]
    updated[index] = place

    setMandatoryPOIs(updated)
    setSchedulePlaceDialog({ open: false, place: null, index: -1 })
  }

  const formatDateDisplay = (date?: Date) => {
    if (!date) return 'Not set'
    return format(date, 'MMM d, yyyy')
  }

  const formatDayDisplay = (day?: number) => {
    if (day === undefined) return 'Not set'
    return `Day ${day}`
  }

  const generateAPIPayload = () => {
    const destination = form.watch('destination')
    const customTitle = form.watch('title')
    const startDate = form.watch('startDate')
    const endDate = form.watch('endDate')
    const flexibleDays = form.watch('flexibleDays')
    const isMuslim = form.watch('isMuslim')
    const kidFriendly = form.watch('kidFriendly')
    const petFriendly = form.watch('petFriendly')
    const title = generateTitle(customTitle, destination, dateMode, startDate, endDate, flexibleDays)

    const accommodationsPayload = accommodations.map((acc) => ({
      poi_id: acc.poi_id,
      check_in_date: acc.check_in_date ? formatDateToISO(acc.check_in_date) : undefined,
      check_out_date: acc.check_out_date ? formatDateToISO(acc.check_out_date) : undefined,
      check_in_day: acc.check_in_day,
      check_out_day: acc.check_out_day,
    }))

    const mandatoryPOIsPayload = mandatoryPOIs.map((poi) => ({
      poi_id: poi.poi_id,
      date: poi.date ? formatDateToISO(poi.date) : undefined,
      day: poi.day,
      time_type: poi.time_type,
      start_time: poi.time_type === 'specific' ? poi.start_time : undefined,
      end_time: poi.time_type === 'specific' ? poi.end_time : undefined,
    }))

    const basePayload = {
      title,
      destination,
      travelers: {
        adults: form.watch('adults'),
        children: form.watch('children'),
        pets: form.watch('pets'),
      },
      preferences: {
        budget: form.watch('budget'),
        pacing: form.watch('pacing'),
        interests: form.watch('interests'),
      },
      flags: {
        ...(isMuslim && { is_muslim: true }),
        ...(kidFriendly && { kids_friendly: true }),
        ...(petFriendly && { pets_friendly: true }),
      },
      ...(accommodationsPayload.length > 0 && { accommodations: accommodationsPayload }),
      ...(mandatoryPOIsPayload.length > 0 && { mandatory_pois: mandatoryPOIsPayload }),
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
      dates: { type: 'flexible', days, preferredMonth },
    }
  }

  const onSubmit = async () => {
    if (dateMode === 'specific' && (!form.getValues('startDate') || !form.getValues('endDate'))) {
      toast.error('Please select travel dates')
      return
    }

    const payload = generateAPIPayload()
    onOpenChange(false)

    const promise = createItinerary(payload as any).then((data) => {
      if (data && data.itin_id) {
        localStorage.setItem('fika:lastChatId', data.itin_id)
        localStorage.setItem(`fika:chat:${data.itin_id}`, JSON.stringify(data))

        setTimeout(() => {
          window.location.href = '/chat'
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

  // Effects
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (locationSearch.length >= LOCATION_SEARCH_MIN_LENGTH) {
      setIsSearching(true)
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchLocations(locationSearch)
        setLocations(results)
        setIsSearching(false)
      }, LOCATION_SEARCH_DEBOUNCE_MS)
    } else {
      setLocations([])
      setIsSearching(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [locationSearch])

  useEffect(() => {
    if (accommodationSearchTimeoutRef.current) {
      clearTimeout(accommodationSearchTimeoutRef.current)
    }

    if (accommodationSearch.length >= 3 && destination) {
      setIsSearchingAccommodation(true)
      accommodationSearchTimeoutRef.current = setTimeout(async () => {
        const results = await searchPOIsByDestinationAndRole(destination, ['accommodation'], accommodationSearch)
        setAccommodationPOIs(results.map((poi) => ({ id: poi.id, name: poi.name, role: 'accommodation' })))
        setIsSearchingAccommodation(false)
      }, 300)
    } else {
      setAccommodationPOIs([])
      setIsSearchingAccommodation(false)
    }

    return () => {
      if (accommodationSearchTimeoutRef.current) {
        clearTimeout(accommodationSearchTimeoutRef.current)
      }
    }
  }, [accommodationSearch, destination])

  useEffect(() => {
    if (placesSearchTimeoutRef.current) {
      clearTimeout(placesSearchTimeoutRef.current)
    }

    if (placesSearch.length >= 3 && destination) {
      setIsSearchingPlaces(true)
      placesSearchTimeoutRef.current = setTimeout(async () => {
        const results = await searchPOIsByDestinationAndRole(destination, ['meal', 'attraction'], placesSearch)
        setPlacesPOIs(results.map((poi) => ({ id: poi.id, name: poi.name, role: poi.category })))
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
  }, [placesSearch, destination])


  // RENDER
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="overflow-auto">
          <DialogHeader>
            <DialogTitle>Create Trip</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {currentStep === 1 && (
              <FieldGroup>
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input placeholder={generatedTitle || 'Enter trip name'} value={title || ''} onChange={(e) => form.setValue('title', e.target.value)} />
                </Field>

                <Field>
                  <FieldLabel>Where</FieldLabel>
                  <div className="relative">
                    <SearchableSelect
                      inputValue={locationSearch}
                      onInputChange={(val) => {
                        setLocationSearch(val)
                        if (!val) {
                          setSelectedLocation(null)
                          form.setValue('destination', '', { shouldDirty: true, shouldValidate: true })
                        }
                      }}
                      placeholder="Where are you going?"
                      minLength={LOCATION_SEARCH_MIN_LENGTH}
                      open={locationOpen}
                      onOpenChange={setLocationOpen}
                      isLoading={isSearching}
                      items={locations}
                      getItemKey={(l) => l.id}
                      getItemLabel={(l) => l.label}
                      onSelect={handleLocationSelect}
                    />
                    {selectedLocation && <Check className="text-primary absolute top-3 right-3 size-4" />}
                  </div>
                  {!isValidDestination && destination && <p className="text-destructive mt-1 text-sm">Please select a destination from the list</p>}
                  <FieldError className="pl-4 text-xs" errors={[form.formState.errors.destination]} />
                </Field>

                <Field>
                  <FieldLabel>When</FieldLabel>
                  <Input readOnly value={dateDisplay} onClick={() => setShowDateDialog(true)} className="cursor-pointer" placeholder="Select dates" />
                </Field>

                <Field>
                  <FieldLabel>Who</FieldLabel>
                  <Input readOnly value={whoDisplay} onClick={() => setShowWhoDialog(true)} className="cursor-pointer" placeholder="Select travelers" />
                </Field>

                <Field>
                  <FieldLabel>Budget</FieldLabel>
                  <Input
                    readOnly
                    value={BUDGET_LABELS[budgetKey]}
                    onClick={() => setShowBudgetDialog(true)}
                    className="cursor-pointer"
                    placeholder="Select budget"
                  />
                </Field>

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
                        className={watchInterests.includes(i.value) ? 'bg-linear-to-r/longer from-gray via-gray-700 to-gray' : ''}
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
                    <TooltipContent>
                      Additional settings
                    </TooltipContent>
                  </Tooltip>

                </Field>
              </FieldGroup>
            )}

            {currentStep === 3 && (
              <FieldGroup>
                <Field>
                  <FieldLabel>Accommodation</FieldLabel>
                  <SearchableSelect
                    inputValue={accommodationSearch}
                    onInputChange={setAccommodationSearch}
                    placeholder={accommodations.length >= totalDays ? 'Total number of accommodation cannot exceed total number of days' : 'Search for hotels, hostels...'}
                    minLength={3}
                    open={accommodationOpen}
                    onOpenChange={setAccommodationOpen}
                    isLoading={isSearchingAccommodation}
                    items={accommodationPOIs}
                    getItemKey={(p) => p.id}
                    getItemLabel={(p) => p.name}
                    onSelect={(poi) => {
                      if (accommodations.length >= totalDays) {
                        toast.error('You cannot add more accommodations than the total number of days')
                        return
                      }
                      handleAddAccommodation(poi)
                    }}
                    disabled={accommodations.length >= totalDays}
                  />

                  <div className="space-y-2">
                    {accommodations.map((acc, index) => (
                      <div key={index} className="border rounded-xl p-3 pt-2">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{acc.poi_name}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveAccommodation(index)} className="h-8 w-8">
                              <X />
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={dateMode === 'specific' ? formatDateDisplay(acc.check_in_date) : formatDayDisplay(acc.check_in_day)}
                              onClick={() => handleOpenAccommodationSchedule(acc, index)}
                              className="h-8 cursor-pointer text-xs"
                              placeholder="Check-in"
                            />
                            <Input
                              readOnly
                              value={dateMode === 'specific' ? formatDateDisplay(acc.check_out_date) : formatDayDisplay(acc.check_out_day)}
                              onClick={() => handleOpenAccommodationSchedule(acc, index)}
                              className="h-8 cursor-pointer text-xs"
                              placeholder="Check-out"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>

                <Field>
                  <FieldLabel>Places to Visit</FieldLabel>
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

                  <div className="space-y-2">
                    {mandatoryPOIs.map((place, index) => (
                      <div key={index} className="border rounded-xl p-3 pt-2">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className='text-sm font-medium'>{place.poi_name}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleRemovePlace(index)} className="h-8 w-8">
                              <X />
                            </Button>
                          </div>
                          <div className="mt-1 flex gap-2">
                            <Input
                              readOnly
                              value={dateMode === 'specific' ? formatDateDisplay(place.date) : formatDayDisplay(place.day)}
                              onClick={() => handleOpenPlaceSchedule(place, index)}
                              className="h-8 cursor-pointer text-xs"
                              placeholder="Date"
                            />
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
        </DialogContent>
      </Dialog>

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
        kidFriendly={form.watch('kidFriendly') || false}
        onKidFriendlyChange={(val) => form.setValue('kidFriendly', val)}
        petFriendly={form.watch('petFriendly') || false}
        onPetFriendlyChange={(val) => form.setValue('petFriendly', val)}
        onSave={() => setShowWhoDialog(false)}
      />

      <BudgetDialog
        open={showBudgetDialog}
        onOpenChange={setShowBudgetDialog}
        budget={budget}
        onBudgetChange={(val) => form.setValue('budget', val)}
        onSave={() => setShowBudgetDialog(false)}
      />

      <PacingDialog
        open={showPacingDialog}
        onOpenChange={setShowPacingDialog}
        pacing={pacing}
        onPacingChange={(val) => form.setValue('pacing', val)}
        onSave={() => setShowPacingDialog(false)}
      />

      {scheduleAccommodationDialog.accommodation && (
        <ScheduleDialog
          open={scheduleAccommodationDialog.open}
          onOpenChange={(open) => setScheduleAccommodationDialog({ open, accommodation: null, index: -1 })}
          mode="multi-day"
          title={`Schedule: ${scheduleAccommodationDialog.accommodation.poi_name}`}
          isSpecificDates={dateMode === 'specific'}
          availableDates={
            dateMode === 'specific' && startDate && endDate
              ? Array.from({ length: totalDays }, (_, i) => new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000))
              : Array.from({ length: totalDays }, () => new Date())
          }
          disabledDates={(date) => isDateDisabledForAccommodation(date, scheduleAccommodationDialog.index)}
          defaultMonth={startDate}
          dateRange={{ from: scheduleAccommodationDialog.accommodation.check_in_date, to: scheduleAccommodationDialog.accommodation.check_out_date }}
          onDateRangeChange={(range) => {
            const updated = { ...scheduleAccommodationDialog.accommodation! }
            updated.check_in_date = range?.from
            updated.check_out_date = range?.to
            setScheduleAccommodationDialog({ ...scheduleAccommodationDialog, accommodation: updated })
          }}
          checkInDay={scheduleAccommodationDialog.accommodation.check_in_day?.toString()}
          onCheckInDayChange={(day) => {
            const updated = { ...scheduleAccommodationDialog.accommodation!, check_in_day: parseInt(day, 10) }
            setScheduleAccommodationDialog({ ...scheduleAccommodationDialog, accommodation: updated })
          }}
          checkOutDay={scheduleAccommodationDialog.accommodation.check_out_day?.toString()}
          onCheckOutDayChange={(day) => {
            const updated = { ...scheduleAccommodationDialog.accommodation!, check_out_day: parseInt(day, 10) }
            setScheduleAccommodationDialog({ ...scheduleAccommodationDialog, accommodation: updated })
          }}
          onSave={handleSaveAccommodationSchedule}
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
              : Array.from({ length: totalDays }, (_, i) => new Date())
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
    </>
  )
}

export default CreateItineraryForm
