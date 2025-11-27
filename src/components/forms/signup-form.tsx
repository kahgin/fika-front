import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { signup } from '@/services/api'
import LoginForm from '@/components/forms/login-form'

interface SignupFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SignupForm({ open, onOpenChange }: SignupFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast('Passwords do not match')
      return
    }

    if (password.length < 8) {
      toast('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const result = await signup({ name, email, password })
      
      if (result.success) {
        toast(`Welcome, ${result.user?.name || 'User'}!`)
        onOpenChange(false)
        // Refresh page after signup
        window.location.reload()
      } else {
        toast(result.message || 'Signup failed. Please try again.')
      }
    } catch (error) {
      toast('Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      // TODO: Implement Google OAuth
      toast('Google signup coming soon')
    } catch (error) {
      toast('Google signup failed')
    }
  }

  const handleSwitchToLogin = () => {
    onOpenChange(false)
    setShowLogin(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create an account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="traveller@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign up'}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignup}>
                  Sign up with Google
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <button
                type="button"
                className="underline underline-offset-4 hover:text-primary"
                onClick={handleSwitchToLogin}
              >
                Login
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <LoginForm open={showLogin} onOpenChange={setShowLogin} />
    </>
  )
}
