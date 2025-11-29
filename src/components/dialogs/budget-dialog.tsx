import React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget: string
  onBudgetChange: (value: string) => void
  onSave: () => void
}

export const BudgetDialog: React.FC<BudgetDialogProps> = ({ open, onOpenChange, budget, onBudgetChange, onSave }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-sm">
        <DialogHeader>
          <DialogTitle>Budget</DialogTitle>
        </DialogHeader>
        <RadioGroup value={budget} onValueChange={onBudgetChange}>
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
          <Button onClick={onSave}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
