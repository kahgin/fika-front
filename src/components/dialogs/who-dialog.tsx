import React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Minus, Info } from 'lucide-react'

interface WhoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adults: number
  onAdultsChange: (value: number) => void
  children: number
  onChildrenChange: (value: number) => void
  pets: number
  onPetsChange: (value: number) => void
  isMuslim: boolean
  onIsMuslimChange: (value: boolean) => void
  kidFriendly: boolean
  onKidFriendlyChange: (value: boolean) => void
  petFriendly: boolean
  onPetFriendlyChange: (value: boolean) => void
  onSave: () => void
}

export const WhoDialog: React.FC<WhoDialogProps> = ({
  open,
  onOpenChange,
  adults,
  onAdultsChange,
  children,
  onChildrenChange,
  pets,
  onPetsChange,
  isMuslim,
  onIsMuslimChange,
  kidFriendly,
  onKidFriendlyChange,
  petFriendly,
  onPetFriendlyChange,
  onSave,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-sm">
        <DialogHeader>
          <DialogTitle>Who</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Adults</p>
                <p className="text-muted-foreground text-sm">Ages 13 or above</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-full" disabled={adults <= 1} onClick={() => onAdultsChange(Math.max(1, adults - 1))}>
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-medium">{adults}</span>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => onAdultsChange(Math.min(10, adults + 1))}>
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Children</p>
                <p className="text-muted-foreground text-sm">Ages 12 or below</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  disabled={children <= 0}
                  onClick={() => onChildrenChange(Math.max(0, children - 1))}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-medium">{children}</span>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => onChildrenChange(Math.min(10, children + 1))}>
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Pets</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-muted-foreground cursor-pointer text-sm underline underline-offset-4">Bringing a service animal?</p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Service animals aren't pets, so there's no need to add them here.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="rounded-full" disabled={pets <= 0} onClick={() => onPetsChange(Math.max(0, pets - 1))}>
                  <Minus className="size-3" />
                </Button>
                <span className="w-8 text-center font-medium">{pets}</span>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => onPetsChange(Math.min(5, pets + 1))}>
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="isMuslim" checked={isMuslim} onCheckedChange={(checked) => onIsMuslimChange(checked as boolean)} className="cursor-pointer" />
              <label
                htmlFor="isMuslim"
                className="text-primary/90 cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Muslim-friendly
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="text-muted-foreground size-3.5" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Prioritize halal restaurants and exclude nightlife</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {children >= 1 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="kidFriendly"
                  checked={kidFriendly}
                  onCheckedChange={(checked) => onKidFriendlyChange(checked as boolean)}
                  className="cursor-pointer"
                />
                <label
                  htmlFor="kidFriendly"
                  className="text-primary/90 cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Kid-friendly
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Prioritize kid-friendly places</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            {pets >= 1 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="petFriendly"
                  checked={petFriendly}
                  onCheckedChange={(checked) => onPetFriendlyChange(checked as boolean)}
                  className="cursor-pointer"
                />
                <label
                  htmlFor="petFriendly"
                  className="text-primary/90 cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Pet-friendly
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Prioritize pet-friendly places</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
