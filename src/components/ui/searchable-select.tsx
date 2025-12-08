import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

export interface SearchableSelectProps<T> {
  inputValue: string
  onInputChange: (value: string) => void
  placeholder?: string
  minLength?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  isLoading: boolean
  items: T[]
  getItemKey: (item: T) => string
  getItemLabel: (item: T) => string
  getItemDisabled?: (item: T) => boolean
  onSelect: (item: T) => void
  disabled?: boolean
}

export function SearchableSelect<T>({
  inputValue,
  onInputChange,
  placeholder = '',
  minLength = 3,
  open,
  onOpenChange,
  isLoading,
  items,
  getItemKey,
  getItemLabel,
  getItemDisabled,
  onSelect,
  disabled = false,
}: SearchableSelectProps<T>) {
  const hasResults = items.length > 0
  const showBorder = isLoading || (inputValue.length >= minLength && hasResults)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild className="w-full">
        <div className="relative">
          <Input
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              onInputChange(e.target.value)
              onOpenChange(true)
            }}
            onFocus={() => {
              if (inputValue.length >= minLength) {
                onOpenChange(true)
              }
            }}
            disabled={disabled}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={cn('w-[var(--radix-popover-trigger-width)] p-0', !showBorder && 'border-none')}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border border-b-2"></div>
              </div>
            )}
            {!isLoading && inputValue.length >= minLength && !hasResults && <CommandEmpty>No results found</CommandEmpty>}
            {!isLoading && hasResults && (
              <CommandGroup>
                {items.map((item) => {
                  const isDisabled = getItemDisabled?.(item) || false
                  return (
                    <CommandItem
                      key={getItemKey(item)}
                      value={getItemLabel(item)}
                      onSelect={() => !isDisabled && onSelect(item)}
                      disabled={isDisabled}
                      className={cn(isDisabled && 'opacity-50 cursor-not-allowed')}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span>{getItemLabel(item)}</span>
                        {isDisabled && <span className="text-muted-foreground text-xs">Added</span>}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
