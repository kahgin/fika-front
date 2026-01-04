import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FallbackImage } from '@/components/ui/fallback-image'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { searchPOIsByDestinationAndRole, updateItineraryMeta } from '@/services/api'
import { Loader2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ScheduleDialog, type TimeType } from './schedule-dialog'

interface Destination {
  city: string
  days?: number
  dates?: {
    startDate?: string
    endDate?: string
  }
}

interface Hotel {
  poiId: string
  poiName: string
  latitude: number
  longitude: number
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
}

interface EditHotelsPoisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itineraryId?: string
  destinations?: Destination[]
  initialHotels?: Hotel[]
  initialMandatoryPOIs?: MandatoryPOI[]
  totalDays?: number
  dateMode?: 'specific' | 'flexible'
  startDate?: Date
  endDate?: Date
  onSave?: (data: any) => void
}

// Helper functions matching create-itinerary-form
const formatDateDisplay = (date?: Date) => {
  if (!date) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatDayDisplay = (day?: number) => {
  if (!day) return ''
  return `Day ${day}`
}

export function EditHotelsPoisDialog({
  open,
  onOpenChange,
  itineraryId,
  destinations = [],
  initialHotels = [],
  initialMandatoryPOIs = [],
  totalDays = 1,
  dateMode = 'flexible',
  startDate,
  endDate,
  onSave,
}: EditHotelsPoisDialogProps) {
  // State for hotels and mandatory POIs
  const [hotels, setHotels] = useState<Hotel[]>(initialHotels)
  const [mandatoryPOIs, setMandatoryPOIs] = useState<MandatoryPOI[]>(initialMandatoryPOIs)

  // Search state
  const [hotelSearch, setHotelSearch] = useState('')
  const [placesSearch, setPlacesSearch] = useState('')
  const [hotelOpen, setHotelOpen] = useState(false)
  const [placesOpen, setPlacesOpen] = useState(false)
  const [isSearchingHotel, setIsSearchingHotel] = useState(false)
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
  const [hotelPOIs, setHotelPOIs] = useState<POI[]>([])
  const [placesPOIs, setPlacesPOIs] = useState<POI[]>([])

  // Selected destination for multi-city
  const [selectedHotelDestination, setSelectedHotelDestination] = useState(destinations[0]?.city || '')
  const [selectedPlacesDestination, setSelectedPlacesDestination] = useState(destinations[0]?.city || '')

  // Schedule dialog for places
  const [schedulePlaceDialog, setSchedulePlaceDialog] = useState<{
    open: boolean
    place: MandatoryPOI | null
    index: number
  }>({ open: false, place: null, index: -1 })

  // Save state
  const [isSaving, setIsSaving] = useState(false)

  // Refs for search debounce
  const hotelSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const placesSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get destination day range for flexible mode
  const getDestinationDayRange = useCallback(
    (destinationCity?: string) => {
      if (!destinationCity || dateMode !== 'flexible') return { startDay: 1, endDay: totalDays }

      const dest = destinations.find((d) => d.city.toLowerCase() === destinationCity.toLowerCase())
      if (!dest || !dest.days) return { startDay: 1, endDay: totalDays }

      const allDestsHaveDays = destinations.every((d) => d.days && d.days > 0)
      if (!allDestsHaveDays) return { startDay: 1, endDay: totalDays }

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

  // Get destination date range for specific mode
  const getDestinationDateRange = useCallback(
    (destinationCity?: string) => {
      if (!startDate || !endDate) return { destStartDate: startDate, destEndDate: endDate }
      if (!destinationCity) return { destStartDate: startDate, destEndDate: endDate }

      // For single destination, use full trip dates
      if (destinations.length <= 1) return { destStartDate: startDate, destEndDate: endDate }

      const dest = destinations.find((d) => d.city.toLowerCase() === destinationCity.toLowerCase())
      if (!dest) return { destStartDate: startDate, destEndDate: endDate }

      // Only limit if destination has explicit dates set (from dest.dates)
      if (dest.dates?.startDate && dest.dates?.endDate) {
        return {
          destStartDate: new Date(dest.dates.startDate),
          destEndDate: new Date(dest.dates.endDate),
        }
      }

      // If no explicit dates set for this destination, allow full trip range
      return { destStartDate: startDate, destEndDate: endDate }
    },
    [destinations, startDate, endDate]
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

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setHotels(initialHotels)
      setMandatoryPOIs(initialMandatoryPOIs)
      setHotelSearch('')
      setPlacesSearch('')
      setSelectedHotelDestination(destinations[0]?.city || '')
      setSelectedPlacesDestination(destinations[0]?.city || '')
    }
  }, [open, initialHotels, initialMandatoryPOIs, destinations])

  // Set default destination when destinations change
  useEffect(() => {
    if (destinations.length > 0 && !selectedHotelDestination) {
      setSelectedHotelDestination(destinations[0].city)
    }
    if (destinations.length > 0 && !selectedPlacesDestination) {
      setSelectedPlacesDestination(destinations[0].city)
    }
  }, [destinations, selectedHotelDestination, selectedPlacesDestination])

  // Hotel search effect - matches create-itinerary-form exactly
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

  // Places search effect - matches create-itinerary-form exactly
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

  // Handlers - matching create-itinerary-form exactly
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

    // Require date/day when timeType is 'specific' or 'allDay'
    if (place.timeType === 'specific' || place.timeType === 'allDay') {
      if (dateMode === 'specific' && !place.date) {
        toast.error('Please select a date for this visit')
        return
      }
      if (dateMode === 'flexible' && !place.day) {
        toast.error('Please select a day for this visit')
        return
      }
    }

    const updated = [...mandatoryPOIs]
    updated[index] = place

    setMandatoryPOIs(updated)
    setSchedulePlaceDialog({ open: false, place: null, index: -1 })
  }

  const handleSave = async () => {
    if (!itineraryId) {
      toast.error('No itinerary ID provided')
      return
    }

    setIsSaving(true)
    try {
      // Prepare the meta update payload - match create-itinerary-form field names exactly
      const metaUpdate = {
        hotels: hotels.map((h) => ({
          poiId: h.poiId,
          poiName: h.poiName,
          latitude: h.latitude,
          longitude: h.longitude,
          destination: h.destinationCity, // Backend expects 'destination', not 'destinationCity'
        })),
        mandatoryPois: mandatoryPOIs.map((p) => ({
          poiId: p.poiId,
          poiName: p.poiName,
          latitude: p.latitude,
          longitude: p.longitude,
          poiDestination: p.destinationCity, // Backend expects 'poiDestination', not 'destinationCity'
          timeType: p.timeType || 'anyTime',
          day: p.day,
          startTime: p.startTime,
          endTime: p.endTime,
        })),
      }

      // Update meta only - do not recompute
      const updated = await updateItineraryMeta(itineraryId, metaUpdate)
      if (!updated) {
        throw new Error('Failed to update itinerary meta')
      }

      toast.success('Changes saved. Regenerate itinerary to apply changes.')
      onSave?.(updated)
      onOpenChange(false)
    } catch (e) {
      console.error('Save error:', e)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Edit Hotels & Places</DialogTitle>
            <DialogDescription>
              Your changes have been saved and will be applied when you regenerate the itinerary.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className='py-4'>
            {/* Hotel Section - only show for multi-day trips */}
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
                        {acc.validationError && <FieldError className='text-center'>{acc.validationError}</FieldError>}
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
            )}

            {/* Places Section */}
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

          <DialogFooter className='flex-col gap-2 sm:flex-row'>
            <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant='default' onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className='mr-2 size-4 animate-spin' />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog for Places */}
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
              : undefined

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
    </>
  )
}
