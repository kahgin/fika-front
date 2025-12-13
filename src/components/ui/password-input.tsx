import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState } from 'react'

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showToggle?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className='relative'>
        <Input ref={ref} type={showPassword ? 'text' : 'password'} className={className} {...props} />
        {showToggle && (
          <button
            type='button'
            className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
          </button>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
