import { z } from 'zod'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field'
import { CalendarIcon, Plus, Minus, ChevronLeft, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { searchLocations, type Location, createItinerary } from '@/services/api'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

interface CreateItineraryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const calculateDaysBetween = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  const diffMs = end.getTime() - start.getTime()
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
}

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

const CreateItineraryForm: React.FC<CreateItineraryFormProps> = ({ open, onOpenChange }) => {
  const isMobile = useIsMobile()
  const [currentStep, setCurrentStep] = useState(1)
  const [dateMode, setDateMode] = useState<'specific' | 'flexible'>('flexible')
  const [showDateDialog, setShowDateDialog] = useState(false)
  const [showWhoDialog, setShowWhoDialog] = useState(false)
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [showPacingDialog, setShowPacingDialog] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentStep(1)
      form.reset()
    }
    onOpenChange(newOpen)
  }

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
      budget: 'any',
      pacing: 'balanced',
      interests: [],
    },
  })

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() + 86400000),
  })

  const pacingOptions = [
    { value: 'relaxed', label: 'Relaxed' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'packed', label: 'Packed' },
  ]

  const interestOptions = [
    { value: 'food_culinary', label: 'Food & Culinary' },
    { value: 'cultural_history', label: 'Cultural & History' },
    { value: 'religious_sites', label: 'Religious Sites' },
    { value: 'nature', label: 'Nature & Parks' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'family', label: 'Family Attractions' },
    { value: 'art_museums', label: 'Art & Museums' },
    { value: 'adventure', label: 'Adventure' },
  ]

  const months = [
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
  ]

  const handleInputChange = (field: keyof FormData, value: any) => {
    form.setValue(field as any, value, {
      shouldDirty: true,
      shouldValidate: false,
    })
  }

  const watchInterests = form.watch('interests') || []
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

  const generateTitle = (customTitle?: string, dest?: string, mode?: typeof dateMode, start?: Date, end?: Date, flexDays?: string) => {
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
  }

  const generateAPIPayload = () => {
    const destination = form.watch('destination')
    const customTitle = form.watch('title')
    const startDate = form.watch('startDate')
    const endDate = form.watch('endDate')
    const flexibleDays = form.watch('flexibleDays')
    const title = generateTitle(customTitle, destination, dateMode, startDate, endDate, flexibleDays)

    if (dateMode === 'specific') {
      // Format dates as YYYY-MM-DD in local timezone
      const startISO = startDate
        ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
        : null
      const endISO = endDate
        ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        : null

      return {
        title,
        destination,
        dates: { type: 'specific', startDate: startISO, endDate: endISO },
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
      }
    }

    const days = parseInt(flexibleDays || '0')
    const preferredMonth = form.watch('flexibleMonth') || null
    return {
      title,
      destination,
      dates: { type: 'flexible', days, preferredMonth },
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

        // Navigate after success
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

  const budgetLabels = useMemo(
    () => ({
      any: 'Any budget',
      tight: 'On a budget',
      sensible: 'Sensibly priced',
      upscale: 'Upscale',
      luxury: 'Luxury',
    }),
    []
  )

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

  const budgetKey: 'any' | 'tight' | 'sensible' | 'upscale' | 'luxury' =
    budget === 'tight' || budget === 'sensible' || budget === 'upscale' || budget === 'luxury' ? budget : 'any'

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
      const label = months.find((m) => m.value === flexibleMonth)?.label
      return `${flexibleDays} days${label ? ` in ${label}` : ''}`
    }
    return 'Select dates'
  }, [dateMode, startDate, endDate, flexibleDays, flexibleMonth])

  const whoDisplay = useMemo(() => {
    const total = (adults || 0) + (children || 0)
    const base = `${total} ${total === 1 ? 'traveler' : 'travelers'}`
    return base
  }, [adults, children, pets])

  const generatedTitle = useMemo(
    () => generateTitle(title, destination, dateMode, startDate, endDate, flexibleDays),
    [title, destination, dateMode, startDate, endDate, flexibleDays]
  )

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (locationSearch.length >= 3) {
      setIsSearching(true)
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchLocations(locationSearch)
        setLocations(results)
        setIsSearching(false)
      }, 300)
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

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location)
    form.setValue('destination', location.name, {
      shouldDirty: true,
      shouldValidate: true,
    })
    setLocationSearch(location.label)
    setLocationOpen(false)
  }

  const isValidDestination = useMemo(() => {
    if (!destination) return false
    if (selectedLocation && selectedLocation.name === destination) return true
    return false
  }, [destination, selectedLocation])

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
                            if (locationSearch.length >= 3) {
                              setLocationOpen(true)
                            }
                          }}
                          className={cn(selectedLocation && 'pr-8')}
                        />
                        {selectedLocation && <Check className="text-primary absolute top-1/2 right-3 size-4 -translate-y-1/2" />}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <Command shouldFilter={false}>
                        <CommandList>
                          {isSearching && (
                            <div className="py-6 text-center text-sm">
                              <div className="border-primary inline-block h-4 w-4 animate-spin rounded-full border-b-2"></div>
                            </div>
                          )}
                          {!isSearching && locationSearch.length >= 3 && locations.length === 0 && <CommandEmpty>No locations found</CommandEmpty>}
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
                  <FieldError errors={[form.formState.errors.destination]} />
                </Field>
                <Field>
                  <FieldLabel>When</FieldLabel>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowDateDialog(true)}
                    className="flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm"
                  >
                    {dateDisplay}
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Who</FieldLabel>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowWhoDialog(true)}
                    className="flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm"
                  >
                    {whoDisplay}
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Budget</FieldLabel>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowBudgetDialog(true)}
                    className="flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm"
                  >
                    {budgetLabels[budgetKey]}
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Travel Pacing</FieldLabel>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowPacingDialog(true)}
                    className="flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm"
                  >
                    {pacingOptions.find((p) => p.value === pacing)?.label || 'Select pacing'}
                  </div>
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
                    {interestOptions.map((i) => (
                      <Button
                        key={i.value}
                        type="button"
                        variant={watchInterests.includes(i.value) ? 'default' : 'outline'}
                        onClick={() => toggleInterest(i.value)}
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

      {/* Inline dialogs */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>When</DialogTitle>
          </DialogHeader>
          <Tabs value={dateMode} onValueChange={(v) => setDateMode(v as any)} className="items-center">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="specific">Dates</TabsTrigger>
              <TabsTrigger value="flexible">Flexible</TabsTrigger>
            </TabsList>
            <TabsContent value="specific" className={isMobile ? 'my-4 space-y-4' : 'my-4 w-full space-y-4'}>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  if (range?.from) {
                    if (range.to) {
                      const numDays = calculateDaysBetween(range.from, range.to)
                      if (numDays >= 1 && numDays <= 10) {
                        setDateRange(range)
                      }
                    } else {
                      setDateRange(range)
                    }
                  } else {
                    setDateRange(range)
                  }
                }}
                min={0}
                max={9}
                numberOfMonths={isMobile ? 1 : 2}
                disabled={(d) => d < new Date()}
                className="p-0"
              />
              <p className="text-muted-foreground text-center text-xs">The trip must be between 1 and 10 days</p>
            </TabsContent>
            <TabsContent value="flexible" className="my-4 w-full space-y-4">
              <Label>How many days?</Label>
              <div className="mt-4 flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={parseInt(form.getValues('flexibleDays') || '1') <= 1}
                  onClick={() => handleInputChange('flexibleDays', String(Math.max(1, parseInt(form.getValues('flexibleDays') || '1') - 1)))}
                >
                  <Minus />
                </Button>
                <span className="w-12 text-center text-2xl font-semibold">{form.getValues('flexibleDays')}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={parseInt(form.getValues('flexibleDays') || '1') >= 10}
                  onClick={() => handleInputChange('flexibleDays', String(Math.min(10, parseInt(form.getValues('flexibleDays') || '1') + 1)))}
                >
                  <Plus />
                </Button>
              </div>
              <Label>Travel anytime</Label>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {months.map((m) => (
                  <Button
                    key={m.value}
                    type="button"
                    variant={form.getValues('flexibleMonth') === m.value ? 'default' : 'outline'}
                    onClick={() => {
                      const currentMonth = form.getValues('flexibleMonth')
                      if (currentMonth === m.value) {
                        handleInputChange('flexibleMonth', '')
                      } else {
                        handleInputChange('flexibleMonth', m.value)
                      }
                    }}
                    className="flex h-20 flex-col shadow-none"
                  >
                    <CalendarIcon className="size-6" />
                    {m.label}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button onClick={handleDateDialogSave}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWhoDialog} onOpenChange={setShowWhoDialog}>
        <DialogContent className="!max-w-sm">
          <DialogHeader>
            <DialogTitle>Who</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Adults</p>
                <p className="text-muted-foreground text-sm">Ages 13 or above</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  disabled={form.watch('adults') <= 1}
                  onClick={() => form.setValue('adults', Math.max(1, form.watch('adults') - 1))}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-medium">{form.watch('adults')}</span>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => form.setValue('adults', Math.min(10, form.watch('adults') + 1))}>
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>

            {/* Children */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Children</p>
                <p className="text-muted-foreground text-sm">Ages 12 or below</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  disabled={form.watch('children') <= 0}
                  onClick={() => form.setValue('children', Math.max(0, form.watch('children') - 1))}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-medium">{form.watch('children')}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => form.setValue('children', Math.min(10, form.watch('children') + 1))}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>

            {/* Pets */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Pets</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  disabled={form.watch('pets') <= 0}
                  onClick={() => form.setValue('pets', Math.max(0, form.watch('pets') - 1))}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-medium">{form.watch('pets')}</span>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => form.setValue('pets', Math.min(5, form.watch('pets') + 1))}>
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowWhoDialog(false)}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="!max-w-sm">
          <DialogHeader>
            <DialogTitle>Budget</DialogTitle>
          </DialogHeader>
          <RadioGroup value={form.watch('budget')} onValueChange={(val) => form.setValue('budget', val)}>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="any" id="any" />
              <label className="text-sm" htmlFor="any">
                Any budget
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="tight" id="tight" />
              <label className="text-sm" htmlFor="tight">
                <span className="mr-2">$</span>On a budget
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="sensible" id="sensible" />
              <label className="text-sm" htmlFor="sensible">
                <span className="mr-2">$$</span>Sensibly priced
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="upscale" id="upscale" />
              <label className="text-sm" htmlFor="upscale">
                <span className="mr-2">$$$</span>Upscale
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="luxury" id="luxury" />
              <label className="text-sm" htmlFor="luxury">
                <span className="mr-2">$$$$</span>Luxury
              </label>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button onClick={() => setShowBudgetDialog(false)}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPacingDialog} onOpenChange={setShowPacingDialog}>
        <DialogContent className="!max-w-sm">
          <DialogHeader>
            <DialogTitle>Pacing</DialogTitle>
          </DialogHeader>
          <RadioGroup value={form.watch('pacing')} onValueChange={(val) => form.setValue('pacing', val)}>
            {pacingOptions.map((p) => (
              <div key={p.value} className="flex items-center space-x-3">
                <RadioGroupItem value={p.value} id={p.value} />
                <label className="text-sm" htmlFor={p.value}>
                  {p.label}
                </label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button onClick={() => setShowPacingDialog(false)}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CreateItineraryForm
