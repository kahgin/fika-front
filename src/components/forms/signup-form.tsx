import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import { toast } from 'sonner'

interface SignupFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToLogin?: () => void
}

export default function SignupForm({ open, onOpenChange, onSwitchToLogin }: SignupFormProps) {
  const { signup } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      await signup({ email, password, name })
      toast.success('Account created successfully!')
      onOpenChange(false)
      window.location.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed. Please try again.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='flex flex-col gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='name'>Name</Label>
              <Input
                id='name'
                type='text'
                placeholder='John Doe'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='traveller@gmail.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='confirm-password'>Confirm Password</Label>
              <Input
                id='confirm-password'
                type='password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Button type='submit' className='w-full hover:cursor-pointer' disabled={loading}>
                {loading ? 'Creating account...' : 'Sign up'}
              </Button>
            </div>
          </div>
          {onSwitchToLogin && (
            <div className='mt-4 text-center text-sm'>
              Already have an account?{' '}
              <button
                type='button'
                className='hover:text-primary underline underline-offset-4 hover:cursor-pointer'
                onClick={() => {
                  onOpenChange(false)
                  onSwitchToLogin()
                }}
              >
                Login
              </button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
