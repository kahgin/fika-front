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
import { ChevronLeft, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { searchLocations, type Location, createItinerary } from '@/services/api'
import { cn } from '@/lib/utils'
import { WhenDialog, WhoDialog, BudgetDialog, PacingDialog } from '@/components/dialogs'

// TYPES & INTERFACES
interface CreateItineraryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

      if (sameYear && sameMonth) {
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

  // Handlers
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep(1)
      form.reset()
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
        form.setValue('startDate', dateRange.from)
        form.setValue('endDate', dateRange?.to || dateRange.from)
      }
      form.setValue('flexibleDays', undefined as any)
      form.setValue('flexibleMonth', undefined as any)
    } else {
      form.setValue('startDate', undefined)
      form.setValue('endDate', undefined)
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
    if (canProceed() && currentStep < 2) {
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
                  <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Input
                          placeholder="Where are you going?"
                          value={locationSearch}
                          onChange={(e) => {
                            setLocationSearch(e.target.value)
                            setLocationOpen(true)
                            if (!e.target.value) {
                              setSelectedLocation(null)
                              form.setValue('destination', '', {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }
                          }}
                          onFocus={() => {
                            if (locationSearch.length >= LOCATION_SEARCH_MIN_LENGTH) {
                              setLocationOpen(true)
                            }
                          }}
                          className={cn(selectedLocation && 'pr-8')}
                        />
                        {selectedLocation && <Check className="text-primary absolute top-1/2 right-3 size-4 -translate-y-1/2" />}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      className={cn(
                        'w-[var(--radix-popover-trigger-width)] p-0',
                        !(isSearching || (locationSearch.length >= LOCATION_SEARCH_MIN_LENGTH && locations.length > 0)) && 'border-none'
                      )}
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <Command shouldFilter={false}>
                        <CommandList>
                          {isSearching && (
                            <div className="py-6 text-center text-sm">
                              <div className="border-primary inline-block h-4 w-4 animate-spin rounded-full border-b-2"></div>
                            </div>
                          )}
                          {!isSearching && locationSearch.length >= LOCATION_SEARCH_MIN_LENGTH && locations.length === 0 && (
                            <CommandEmpty>No locations found</CommandEmpty>
                          )}
                          {!isSearching && locations.length > 0 && (
                            <CommandGroup>
                              {locations.map((location) => (
                                <CommandItem key={location.id} value={location.label} onSelect={() => handleLocationSelect(location)}>
                                  <Check className={cn('mr-2 h-4 w-4', selectedLocation?.id === location.id ? 'opacity-100' : 'opacity-0')} />
                                  {location.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                        className={watchInterests.includes(i.value) ? 'bg-radial-[at_50%_0%] from-gray-700 via-gray-900 to-black' : ''}
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
    </>
  )
}

export default CreateItineraryForm
