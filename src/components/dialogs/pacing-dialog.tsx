import React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const PACING_OPTIONS = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'packed', label: 'Packed' },
] as const

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
      <DialogContent className="!max-w-sm">
        <DialogHeader>
          <DialogTitle>Pacing</DialogTitle>
        </DialogHeader>
        <RadioGroup value={pacing} onValueChange={onPacingChange}>
          {PACING_OPTIONS.map((p) => (
            <div key={p.value} className="flex items-center space-x-3">
              <RadioGroupItem value={p.value} id={p.value} />
              <label className="text-sm" htmlFor={p.value}>
                {p.label}
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
