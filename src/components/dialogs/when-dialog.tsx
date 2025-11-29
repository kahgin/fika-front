import React from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CalendarIcon, Plus, Minus } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

type DateMode = 'specific' | 'flexible'

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

const MIN_TRIP_DAYS = 1
const MAX_TRIP_DAYS = 10

const calculateDaysBetween = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  const diffMs = end.getTime() - start.getTime()
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
}

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
        <Tabs value={dateMode} onValueChange={(v) => onDateModeChange(v as DateMode)} className="items-center">
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
                    if (numDays >= MIN_TRIP_DAYS && numDays <= MAX_TRIP_DAYS) {
                      onDateRangeChange(range)
                    }
                  } else {
                    onDateRangeChange(range)
                  }
                } else {
                  onDateRangeChange(range)
                }
              }}
              min={0}
              max={MAX_TRIP_DAYS - 1}
              numberOfMonths={isMobile ? 1 : 2}
              disabled={(d) => d < new Date()}
              className="p-0"
            />
            <p className="text-muted-foreground text-center text-xs">
              The trip must be between {MIN_TRIP_DAYS} and {MAX_TRIP_DAYS} days
            </p>
          </TabsContent>
          <TabsContent value="flexible" className="my-4 w-full space-y-4">
            <Label>How many days?</Label>
            <div className="mt-4 flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={parseInt(flexibleDays || '1') <= MIN_TRIP_DAYS}
                onClick={() => onFlexibleDaysChange(String(Math.max(MIN_TRIP_DAYS, parseInt(flexibleDays || '1') - 1)))}
              >
                <Minus />
              </Button>
              <span className="w-12 text-center text-2xl font-semibold">{flexibleDays}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={parseInt(flexibleDays || '1') >= MAX_TRIP_DAYS}
                onClick={() => onFlexibleDaysChange(String(Math.min(MAX_TRIP_DAYS, parseInt(flexibleDays || '1') + 1)))}
              >
                <Plus />
              </Button>
            </div>
            <Label>Travel anytime</Label>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {MONTHS.map((m) => (
                <Button
                  key={m.value}
                  type="button"
                  variant={flexibleMonth === m.value ? 'default' : 'outline'}
                  onClick={() => {
                    if (flexibleMonth === m.value) {
                      onFlexibleMonthChange('')
                    } else {
                      onFlexibleMonthChange(m.value)
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
          <Button onClick={onSave}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
