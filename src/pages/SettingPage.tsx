import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'
import { AuthDialogs } from '@/components/dialogs/auth-dialogs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthDialogs } from '@/hooks/use-auth-dialogs'
import { useIsMobile } from '@/hooks/use-mobile'
import { changePassword, deleteAccount, updateProfile } from '@/services/api'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, refreshUser, isAuthenticated, isLoading, logout } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const isMobile = useIsMobile()
  const {
    showLogin: showLoginDialog,
    setShowLogin: setShowLoginDialog,
    showSignup: showSignupDialog,
    setShowSignup: setShowSignupDialog,
    switchToSignup,
    switchToLogin,
  } = useAuthDialogs()

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

    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      toast.error('New password must be different from current password')
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      if (result.success) {
        toast.success('Password updated successfully')
        setShowPasswordModal(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        toast.error(result.error || 'Failed to update password')
      }
    } catch {
      toast.error('Failed to update password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete account') {
      toast.error('Please type "delete account" to confirm')
      return
    }

    setIsDeleting(true)
    try {
      const success = await deleteAccount()
      if (success) {
        toast.success('Account deleted successfully')
        setShowDeleteConfirm(false)
        logout()
      } else {
        toast.error('Failed to delete account')
      }
    } catch {
      toast.error('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
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
        <p className='text-muted-foreground text-center'>Please sign in.</p>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => setShowLoginDialog(true)}>
            Sign in
          </Button>
          <Button onClick={() => setShowSignupDialog(true)}>Create account</Button>
        </div>
        <AuthDialogs
          dialogState={{
            showLogin: showLoginDialog,
            setShowLogin: setShowLoginDialog,
            showSignup: showSignupDialog,
            setShowSignup: setShowSignupDialog,
            switchToSignup,
            switchToLogin,
            openLogin: () => setShowLoginDialog(true),
            openSignup: () => setShowSignupDialog(true),
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
                <AvatarFallback>
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h6>@{user?.username || 'guest'}</h6>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className='mb-2 block text-sm font-medium'>Display Name</label>
              <Input name='name' type='text' value={formValues.name} onChange={handleChange} />
            </div>

            {/* Email Field */}
            <div>
              <label className='mb-2 block text-sm font-medium'>Email Address</label>
              <Input name='email' type='email' value={formValues.email} onChange={handleChange} />
            </div>


            {/* Password */}
            <div>
              <label className='mb-2 block text-sm font-medium'>Password</label>
              <div className='flex items-center gap-2'>
                <Input type='password' value={`password`} className='select-none' readOnly />
                <Button type='button' variant='outline' onClick={() => setShowPasswordModal(true)}>
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
      <Dialog
        open={showPasswordModal}
        onOpenChange={(open) => {
          setShowPasswordModal(open)
          if (!open) {
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new password.</DialogDescription>
          </DialogHeader>
          <form className='space-y-4' onSubmit={handlePasswordChange}>
            <PasswordInput
              placeholder='Current password'
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              required
            />
            <PasswordInput
              placeholder='New password (min 8 characters)'
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              required
              minLength={8}
            />
            <PasswordInput
              placeholder='Confirm new password'
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              required
            />
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setShowPasswordModal(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={isChangingPassword}>
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open)
          if (!open) setDeleteConfirmText('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              To confirm, type <span className='font-semibold text-foreground'>delete account</span> below:
            </p>
            <Input
              type='text'
              placeholder='Type "delete account" to confirm'
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText.toLowerCase() !== 'delete account' || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
