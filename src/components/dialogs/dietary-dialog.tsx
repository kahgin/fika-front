import React from 'react'
import { OptionSelectDialog } from '@/components/dialogs/option-select-dialog'

const DIETARY_OPTIONS = [
  { value: 'none', label: 'No Restrictions' },
  { value: 'halal', label: 'Halal' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
] as const

interface DietaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dietaryRestrictions: string
  onDietaryRestrictionsChange: (value: string) => void
  onSave: () => void
}

export const DietaryDialog: React.FC<DietaryDialogProps> = ({ open, onOpenChange, dietaryRestrictions, onDietaryRestrictionsChange, onSave }) => {
  return (
    <OptionSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Dietary Restrictions"
      options={DIETARY_OPTIONS}
      value={dietaryRestrictions}
      onValueChange={onDietaryRestrictionsChange}
      onSave={onSave}
    />
  )
}
