import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditHotelsPoisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditHotelsPoisDialog({
  open,
  onOpenChange,
}: EditHotelsPoisDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Edit Hotels & Places</DialogTitle>
          <DialogDescription>
            Editing hotels and mandatory places is coming soon. To change hotels or must-visit places, try recreating
            your itinerary.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className='flex-col gap-2 sm:flex-row'>
          <Button variant='default' onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
