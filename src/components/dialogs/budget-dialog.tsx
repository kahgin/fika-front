import { OptionSelectDialog } from '@/components/dialogs/option-select-dialog'
import React from 'react'

const BUDGET_OPTIONS = [
  { value: 'any', label: 'Any budget' },
  {
    value: 'tight',
    label: (
      <>
        <span className='mr-2'>$</span>On a budget
      </>
    ),
  },
  {
    value: 'sensible',
    label: (
      <>
        <span className='mr-2'>$</span>Sensibly priced
      </>
    ),
  },
  {
    value: 'upscale',
    label: (
      <>
        <span className='mr-2'>$$</span>Upscale
      </>
    ),
  },
  {
    value: 'luxury',
    label: (
      <>
        <span className='mr-2'>$$</span>Luxury
      </>
    ),
  },
] as const

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget: string
  onBudgetChange: (value: string) => void
  onSave: () => void
}

export const BudgetDialog: React.FC<BudgetDialogProps> = ({ open, onOpenChange, budget, onBudgetChange, onSave }) => {
  return (
    <OptionSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Budget'
      options={BUDGET_OPTIONS}
      value={budget}
      onValueChange={onBudgetChange}
      onSave={onSave}
    />
  )
}
