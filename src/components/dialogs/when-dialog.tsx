import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'
import { MONTHS } from '@/lib/constants'
import { calculateDaysBetween } from '@/lib/date-range'
import { CalendarIcon, Minus, Plus } from 'lucide-react'
import React from 'react'
import type { DateRange } from 'react-day-picker'

export type DateMode = 'specific' | 'flexible'

const MIN_TRIP_DAYS = 1
const MAX_TRIP_DAYS = 10

interface WhenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateMode: DateMode
  onDateModeChange: (mode: DateMode) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  flexibleDays: string
  onFlexibleDaysChange: (days: string) => void
  flexibleMonth: string
  onFlexibleMonthChange: (month: string) => void
  onSave: () => void
}

export const WhenDialog: React.FC<WhenDialogProps> = ({
  open,
  onOpenChange,
  dateMode,
  onDateModeChange,
  dateRange,
  onDateRangeChange,
  flexibleDays,
  onFlexibleDaysChange,
  flexibleMonth,
  onFlexibleMonthChange,
  onSave,
}) => {
  const isMobile = useIsMobile()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>When</DialogTitle>
        </DialogHeader>
        <Tabs value={dateMode} onValueChange={(v) => onDateModeChange(v as DateMode)} className='items-center'>
          <TabsList className='grid grid-cols-2'>
            <TabsTrigger value='specific'>Dates</TabsTrigger>
            <TabsTrigger value='flexible'>Flexible</TabsTrigger>
          </TabsList>
          <TabsContent value='specific' className='my-4 space-y-4'>
            <Calendar
              mode='range'
              selected={dateRange}
              onSelect={(range) => {
                if (!range?.from) {
                  onDateRangeChange(range)
                  return
                }
                // Use same date for both if no end date (single day trip)
                const to = range.to || range.from
                const numDays = calculateDaysBetween(range.from, to)
                if (numDays >= MIN_TRIP_DAYS && numDays <= MAX_TRIP_DAYS) {
                  onDateRangeChange({ from: range.from, to })
                }
              }}
              min={0}
              max={MAX_TRIP_DAYS - 1}
              numberOfMonths={isMobile ? 1 : 2}
              disabled={(d) => d < new Date()}
              className='p-0'
            />
          </TabsContent>
          <TabsContent value='flexible' className='my-4 w-full space-y-4'>
            <div className='mt-4 flex items-center justify-center gap-4'>
              <Button
                type='button'
                variant='outline'
                size='icon'
                disabled={parseInt(flexibleDays || '1') <= MIN_TRIP_DAYS}
                onClick={() => onFlexibleDaysChange(String(parseInt(flexibleDays || '1') - 1))}
              >
                <Minus />
              </Button>
              <span className='w-12 text-center text-2xl font-semibold'>{flexibleDays || '1'}</span>
              <Button
                type='button'
                variant='outline'
                size='icon'
                disabled={parseInt(flexibleDays || '1') >= MAX_TRIP_DAYS}
                onClick={() => onFlexibleDaysChange(String(parseInt(flexibleDays || '1') + 1))}
              >
                <Plus />
              </Button>
            </div>
            <Label>Travel anytime</Label>
            <div className='mt-4 grid grid-cols-4 gap-2'>
              {MONTHS.map((m) => (
                <Button
                  key={m.value}
                  type='button'
                  variant={flexibleMonth === m.value ? 'default' : 'outline'}
                  onClick={() => {
                    if (flexibleMonth === m.value) {
                      onFlexibleMonthChange('')
                    } else {
                      onFlexibleMonthChange(m.value)
                    }
                  }}
                  className='flex h-20 flex-col shadow-none'
                >
                  <CalendarIcon className='size-6' />
                  {m.label}
                </Button>
              ))}
            </div>
          </TabsContent>
          <p className='text-muted-foreground text-center text-xs'>
            We currently support trips of up to {MAX_TRIP_DAYS} days.
          </p>
        </Tabs>
        <DialogFooter>
          <Button onClick={onSave}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
