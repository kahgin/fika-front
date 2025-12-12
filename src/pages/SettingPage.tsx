import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import LoginForm from '@/components/forms/login-form'
import SignupForm from '@/components/forms/signup-form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { changePassword, updateProfile } from '@/services/api'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, refreshUser, isAuthenticated, isLoading } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showSignupDialog, setShowSignupDialog] = useState(false)
  const isMobile = useIsMobile()

  const [formValues, setFormValues] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user) {
      setFormValues({
        name: user.name || '',
        email: user.email,
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Please login to save changes')
      return
    }
    try {
      await updateProfile({ name: formValues.name })
      await refreshUser()
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile')
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    try {
      const success = await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      if (success) {
        toast.success('Password updated successfully')
        setShowPasswordModal(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        toast.error('Failed to update password')
      }
    } catch {
      toast.error('Failed to update password')
    }
  }

  const handleDeleteAccount = async () => {
    // TODO: Implement delete account API
    toast.error('Account deletion not yet implemented')
    setShowDeleteConfirm(false)
  }

  if (isLoading) {
    return (
      <div className='flex h-full flex-col items-center justify-center'>
        <p className='text-muted-foreground'>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-4'>
        <p className='text-muted-foreground'>Please sign in to view settings</p>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => setShowLoginDialog(true)}>
            Sign in
          </Button>
          <Button onClick={() => setShowSignupDialog(true)}>Create account</Button>
        </div>
        <LoginForm
          open={showLoginDialog}
          onOpenChange={setShowLoginDialog}
          onSwitchToSignup={() => {
            setShowLoginDialog(false)
            setShowSignupDialog(true)
          }}
        />
        <SignupForm
          open={showSignupDialog}
          onOpenChange={setShowSignupDialog}
          onSwitchToLogin={() => {
            setShowSignupDialog(false)
            setShowLoginDialog(true)
          }}
        />
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex h-12 items-center border-b px-6'>
        <h6>Settings</h6>
      </div>

      <div className='flex-1 overflow-auto' style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT}px` } : undefined}>
        <div className='space-y-6 p-6'>
          {/* User Info Section */}
          <form onSubmit={handleSubmit} className='space-y-6 rounded-xl border p-6'>
            <h4>User Information</h4>

            {/* Profile Picture */}
            <div className='flex items-center gap-4'>
              <Avatar className='h-12 w-12'>
                <AvatarImage src={user?.avatar || undefined} alt={user?.name || 'User'} />
                <AvatarFallback className='text-xs'>
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h6>@{user?.username || 'guest'}</h6>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className='mb-2 block text-sm font-medium'>Full Name</label>
              <Input name='name' type='text' value={formValues.name} onChange={handleChange} />
            </div>

            {/* Email Field */}
            <div>
              <label className='mb-2 block text-sm font-medium'>Email Address</label>
              <Input name='email' type='email' value={formValues.email} onChange={handleChange} />
            </div>

            {/* Username Field */}
            <div>
              <label className='mb-2 block text-sm font-medium'>Username</label>
              <Input name='username' type='username' value={`@${user?.username}`} readOnly />
            </div>

            {/* Password */}
            <div>
              <label className='mb-2 block text-sm font-medium'>Password</label>
              <div className='flex items-center gap-2'>
                <Input type='password' value={`password`} className='select-none' readOnly />
                <Button variant='outline' onClick={() => setShowPasswordModal(true)}>
                  Change
                </Button>
              </div>
            </div>

            {/* Save/Cancel */}
            <div className='flex pt-4'>
              <Button type='submit' variant='default'>
                Save Changes
              </Button>
            </div>
          </form>

          {/* Settings Section */}
          <div className='rounded-lg border'>
            <div className='p-6'>
              <h2 className='text-lg font-semibold'>Account Settings</h2>
            </div>
            <div className='p-6'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='font-medium'>Delete Account</p>
                    <p className='text-muted-foreground text-sm'>
                      Permanently delete your account and all associated data.
                    </p>
                  </div>
                  <Button variant='destructive' onClick={() => setShowDeleteConfirm(true)}>
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form className='space-y-4' onSubmit={handlePasswordChange}>
            <Input
              type='password'
              placeholder='Current password'
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              required
            />
            <Input
              type='password'
              placeholder='New password'
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              required
            />
            <Input
              type='password'
              placeholder='Confirm new password'
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              required
            />
            <DialogFooter>
              <Button type='submit'>Update Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete your account? This action cannot be undone and will permanently remove all
            your data.
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button className='bg-red-600 hover:bg-red-700' onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
