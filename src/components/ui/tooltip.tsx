import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'

import { cn } from '@/lib/utils'

const TooltipContext = React.createContext<{ toggle: () => void } | null>(null)

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot='tooltip-provider' delayDuration={delayDuration} {...props} />
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const [open, setOpen] = React.useState(props.defaultOpen ?? false)

  // Sync with controlled open prop if provided
  const isOpen = props.open ?? open
  const onOpenChange = props.onOpenChange ?? setOpen

  const toggle = React.useCallback(() => {
    onOpenChange(!isOpen)
  }, [isOpen, onOpenChange])

  return (
    <TooltipContext.Provider value={{ toggle }}>
      <TooltipProvider>
        <TooltipPrimitive.Root data-slot='tooltip' {...props} open={isOpen} onOpenChange={onOpenChange} />
      </TooltipProvider>
    </TooltipContext.Provider>
  )
}

function TooltipTrigger({ onClick, ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  const context = React.useContext(TooltipContext)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    context?.toggle()
    onClick?.(e)
  }

  return <TooltipPrimitive.Trigger data-slot='tooltip-trigger' onClick={handleClick} {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot='tooltip-content'
        sideOffset={sideOffset}
        className={cn(
          'bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className='bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]' />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
