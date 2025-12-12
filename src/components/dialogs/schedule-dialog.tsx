import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import type { DateRange } from 'react-day-picker'

type ScheduleMode = 'single-day' | 'multi-day'
export type TimeType = 'specific' | 'allDay' | 'anyTime'

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: ScheduleMode
  title?: string

  // Date selection
  isSpecificDates?: boolean
  availableDates?: Date[]
  disabledDates?: (date: Date) => boolean
  // For flexible-day selection, allow dimming day indices separately for check-in and check-out (1-based)
  disabledCheckInDayIndices?: number[]
  disabledCheckOutDayIndices?: number[]
  // Starting day number for flexible mode (e.g., if destination starts at Day 3, this is 3)
  startDayNumber?: number
  defaultMonth?: Date

  // Single-day mode
  selectedDate?: Date
  onDateChange?: (date: Date | undefined) => void
  selectedDay?: string
  onDayChange?: (day: string) => void

  // Multi-day mode (for hotels)
  // Specific dates: range selection
  dateRange?: DateRange
  onDateRangeChange?: (range: DateRange | undefined) => void
  // Backward compatibility (will be unused once parent is updated)
  checkInDate?: Date
  onCheckInDateChange?: (date: Date | undefined) => void
  checkOutDate?: Date
  onCheckOutDateChange?: (date: Date | undefined) => void
  // Flexible-day selection for multi-day mode
  checkInDay?: string
  onCheckInDayChange?: (day: string) => void
  checkOutDay?: string
  onCheckOutDayChange?: (day: string) => void

  // Time selection (single-day only)
  timeType?: TimeType
  onTimeTypeChange?: (type: TimeType) => void
  startTime?: string
  onStartTimeChange?: (time: string) => void
  endTime?: string
  onEndTimeChange?: (time: string) => void

  // Callbacks
  onSave: () => void
  onCancel?: () => void
}

export function ScheduleDialog({
  open,
  onOpenChange,
  mode,
  title = 'Schedule',
  isSpecificDates = true,
  availableDates,
  disabledDates,
  disabledCheckInDayIndices,
  disabledCheckOutDayIndices,
  startDayNumber = 1,
  defaultMonth,
  dateRange,
  onDateRangeChange,
  selectedDate,
  onDateChange,
  selectedDay,
  onDayChange,
  checkInDay,
  onCheckInDayChange,
  checkOutDay,
  onCheckOutDayChange,
  timeType = 'anyTime',
  onTimeTypeChange,
  startTime = '',
  onStartTimeChange,
  endTime = '',
  onEndTimeChange,
  onSave,
  onCancel,
}: ScheduleDialogProps) {
  const isMobile = useIsMobile()

  const handleSave = () => {
    onSave()
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }

  const isSameDay = (a?: Date, b?: Date) => {
    if (!a || !b) return false
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  }

  const handleRangeSelect = (range: DateRange | undefined) => {
    // Auto-extend to next day when only one date is clicked
    if (range?.from && !range.to) {
      const next = new Date(range.from)
      next.setDate(next.getDate() + 1)
      const adjusted: DateRange = { from: range.from, to: next }
      onDateRangeChange?.(adjusted)
      return
    }
    onDateRangeChange?.(range)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {mode === 'single-day' && (
            <>
              {/* Date Selection */}
              {isSpecificDates ? (
                <div className='place-items-center'>
                  <Calendar
                    mode='single'
                    selected={selectedDate}
                    onSelect={onDateChange}
                    numberOfMonths={isMobile ? 1 : 2}
                    className='p-0'
                    defaultMonth={defaultMonth}
                    disabled={disabledDates}
                  />
                </div>
              ) : (
                <div className='place-items-center space-y-2'>
                  <Label className='text-sm'>Which day?</Label>
                  <Select value={selectedDay} onValueChange={onDayChange}>
                    <SelectTrigger className='gap-12 rounded-full'>
                      <SelectValue placeholder='Select day' />
                    </SelectTrigger>
                    <SelectContent className='rounded-xl'>
                      {availableDates?.map((_, idx) => {
                        const dayNum = startDayNumber + idx
                        return (
                          <SelectItem
                            key={idx}
                            value={String(dayNum)}
                            className='rounded-lg'
                            disabled={disabledCheckInDayIndices?.includes(dayNum)}
                          >
                            Day {dayNum}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Separator />

              {/* Time Selection */}
              <Tabs value={timeType} onValueChange={(v) => onTimeTypeChange?.(v as TimeType)} className='items-center'>
                <TabsList>
                  <TabsTrigger value='anyTime'>Any time</TabsTrigger>
                  <TabsTrigger value='specific'>Time</TabsTrigger>
                  <TabsTrigger value='allDay'>All day</TabsTrigger>
                </TabsList>

                <TabsContent value='specific' className='space-y-4'>
                  <div className='flex justify-between gap-8'>
                    <div className='flex w-full gap-2'>
                      <Label>Start</Label>
                      <Input
                        type='time'
                        value={startTime}
                        onChange={(e) => onStartTimeChange?.(e.target.value)}
                        className='rounded-full [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                      />
                    </div>
                    <div className='flex w-full gap-2'>
                      <Label>End</Label>
                      <Input
                        type='time'
                        value={endTime}
                        onChange={(e) => onEndTimeChange?.(e.target.value)}
                        className='rounded-full [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value='anyTime' />
                <TabsContent value='allDay' />
              </Tabs>
            </>
          )}

          {mode === 'multi-day' && (
            <>
              {isSpecificDates ? (
                <div className='place-items-center'>
                  <Calendar
                    mode='range'
                    selected={dateRange as any}
                    onSelect={handleRangeSelect as any}
                    numberOfMonths={isMobile ? 1 : 2}
                    className='p-0'
                    defaultMonth={defaultMonth}
                    disabled={disabledDates}
                  />
                  {dateRange?.from && dateRange?.to && isSameDay(dateRange.from, dateRange.to) && (
                    <p className='text-destructive mt-2 text-xs'>Check-out cannot be the same day as check-in.</p>
                  )}
                </div>
              ) : (
                <div className='flex justify-around gap-4'>
                  <div className='place-items-center space-y-2'>
                    <Label className='text-sm'>Check-in Day</Label>
                    <Select
                      value={checkInDay ?? selectedDay}
                      onValueChange={(v) => (onCheckInDayChange ? onCheckInDayChange(v) : onDayChange?.(v))}
                    >
                      <SelectTrigger className='gap-12 rounded-full'>
                        <SelectValue placeholder='Select day' />
                      </SelectTrigger>
                      <SelectContent className='rounded-xl'>
                        {availableDates?.map((_, idx) => {
                          const dayNum = startDayNumber + idx
                          return (
                            <SelectItem
                              key={idx}
                              value={String(dayNum)}
                              className='rounded-lg'
                              disabled={disabledCheckInDayIndices?.includes(dayNum)}
                            >
                              Day {dayNum}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='place-items-center space-y-2'>
                    <Label className='text-sm'>Check-out Day</Label>
                    <Select
                      value={checkOutDay ?? selectedDay}
                      onValueChange={(v) => (onCheckOutDayChange ? onCheckOutDayChange(v) : onDayChange?.(v))}
                    >
                      <SelectTrigger className='gap-12 rounded-full'>
                        <SelectValue placeholder='Select day' />
                      </SelectTrigger>
                      <SelectContent className='rounded-xl'>
                        {availableDates?.map((_, idx) => {
                          const dayNum = startDayNumber + idx
                          return (
                            <SelectItem
                              key={idx}
                              value={String(dayNum)}
                              className='rounded-lg'
                              disabled={disabledCheckOutDayIndices?.includes(dayNum)}
                            >
                              Day {dayNum}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
