import { OptionSelectDialog } from '@/components/dialogs/option-select-dialog'
import { DIETARY_OPTIONS } from '@/lib/constants'
import React from 'react'

interface DietaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dietaryRestrictions: string
  onDietaryRestrictionsChange: (value: string) => void
  onSave: () => void
}

export const DietaryDialog: React.FC<DietaryDialogProps> = ({
  open,
  onOpenChange,
  dietaryRestrictions,
  onDietaryRestrictionsChange,
  onSave,
}) => {
  return (
    <OptionSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Dietary Restrictions'
      options={DIETARY_OPTIONS}
      value={dietaryRestrictions}
      onValueChange={onDietaryRestrictionsChange}
      onSave={onSave}
    />
  )
}
