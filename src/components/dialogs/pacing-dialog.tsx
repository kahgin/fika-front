import { OptionSelectDialog } from '@/components/dialogs/option-select-dialog'
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
    <OptionSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Pacing'
      options={PACING_OPTIONS}
      value={pacing}
      onValueChange={onPacingChange}
      onSave={onSave}
    />
  )
}
