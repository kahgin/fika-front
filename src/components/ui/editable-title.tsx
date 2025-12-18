import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Pencil, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface EditableTitleProps {
  value: string
  onSave: (newValue: string) => Promise<void> | void
  className?: string
  placeholder?: string
  maxLength?: number
  disabled?: boolean
}

export function EditableTitle({
  value,
  onSave,
  className = '',
  placeholder = 'Untitled',
  maxLength = 100,
  disabled = false,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim()
    if (!trimmedValue) {
      setEditValue(value)
      setIsEditing(false)
      return
    }

    if (trimmedValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(trimmedValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save title:', error)
      setEditValue(value)
    } finally {
      setIsSaving(false)
    }
  }, [editValue, value, onSave])

  const handleCancel = useCallback(() => {
    setEditValue(value)
    setIsEditing(false)
  }, [value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

  if (isEditing) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          maxLength={maxLength}
          placeholder={placeholder}
          className='h-8 w-full font-semibold'
        />
        <Button variant='ghost' size='icon' className='h-8 w-8 flex-shrink-0' onClick={handleSave} disabled={isSaving}>
          <Check className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 flex-shrink-0'
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className='h-4 w-4' />
        </Button>
      </div>
    )
  }

  return (
    <div className={`group flex items-center gap-1 ${className}`}>
      <h1 className='flex-1 truncate font-semibold'>{value || placeholder}</h1>
      {!disabled && (
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
          onClick={() => setIsEditing(true)}
        >
          <Pencil className='h-3 w-3' />
        </Button>
      )}
    </div>
  )
}
