import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { PACING_OPTIONS } from '@/lib/constants'
import React from 'react'

interface PacingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pacing: string
  onPacingChange: (value: string) => void
  onSave: () => void
}

export const PacingDialog: React.FC<PacingDialogProps> = ({ open, onOpenChange, pacing, onPacingChange, onSave }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='!max-w-sm'>
        <DialogHeader>
          <DialogTitle>Pacing</DialogTitle>
        </DialogHeader>
        <RadioGroup value={pacing} onValueChange={onPacingChange}>
          {PACING_OPTIONS.map((opt) => (
            <div key={opt.value} className='flex items-center space-x-3'>
              <RadioGroupItem value={opt.value} id={opt.value} />
              <label className='cursor-pointer justify-between flex w-full' htmlFor={opt.value}>
                <span className='text-sm font-medium'>{opt.label}</span>
                <span className='text-muted-foreground text-sm'>{opt.time}</span>
              </label>
            </div>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button onClick={onSave}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
