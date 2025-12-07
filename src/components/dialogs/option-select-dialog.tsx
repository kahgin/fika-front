import React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export interface OptionItem {
  value: string
  label: React.ReactNode
}

interface OptionSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  options: readonly OptionItem[] | OptionItem[]
  value: string
  onValueChange: (value: string) => void
  onSave: () => void
}

export const OptionSelectDialog: React.FC<OptionSelectDialogProps> = ({
  open,
  onOpenChange,
  title,
  options,
  value,
  onValueChange,
  onSave,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <RadioGroup value={value} onValueChange={onValueChange}>
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center space-x-3">
              <RadioGroupItem value={opt.value} id={opt.value} />
              <label className="text-sm" htmlFor={opt.value}>
                {opt.label}
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
