import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { login } from '@/services/api'
import SignupForm from './signup-form'

interface LoginFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function LoginForm({ open, onOpenChange }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login({ email, password })
      
      if (result.success) {
        toast(`Welcome back, ${result.user?.name || 'User'}!`)
        onOpenChange(false)
        // Refresh itineraries after login
        window.location.reload()
      } else {
        toast(result.message || 'Login failed. Please try again.')
      }
    } catch (error) {
      toast('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      // TODO: Implement Google OAuth
      toast('Google login coming soon')
    } catch (error) {
      toast('Google login failed')
    }
  }

  const handleSwitchToSignup = () => {
    onOpenChange(false)
    setShowSignup(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login to your account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
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
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                    onClick={() => toast('Password reset coming soon')}
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
                  Login with Google
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="underline underline-offset-4 hover:text-primary"
                onClick={handleSwitchToSignup}
              >
                Sign up
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SignupForm open={showSignup} onOpenChange={setShowSignup} />
    </>
  )
}
