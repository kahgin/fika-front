import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const isMobile = useIsMobile()

  const [formValues, setFormValues] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })

  useEffect(() => {
    if (user) {
      setFormValues({
        name: user.name,
        email: user.email,
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // send to backend here
    console.log('Saving:', formValues)
    if (user) {
      setUser({ ...user, ...formValues })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center border-b px-6">
        <h6>Settings</h6>
      </div>

      <div className="flex-1 overflow-auto" style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT}px` } : undefined}>
        <div className="space-y-6 p-6">
          {/* User Info Section */}
          <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border p-6">
            <h4>User Information</h4>

            {/* Profile Picture */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                <span className="text-xl font-semibold text-white">
                  {(user?.name || 'G')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </span>
              </div>
              <div>
                <h6>@{user?.username || 'guest'}</h6>
                <a href="#" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary text-sm hover:no-underline">
                  Change profile photo
                </a>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="mb-2 block text-sm font-medium">Full Name</label>
              <Input name="name" type="text" value={formValues.name} onChange={handleChange} />
            </div>

            {/* Email Field */}
            <div>
              <label className="mb-2 block text-sm font-medium">Email Address</label>
              <Input name="email" type="email" value={formValues.email} onChange={handleChange} />
            </div>

            {/* Username Field */}
            <div>
              <label className="mb-2 block text-sm font-medium">Username</label>
              <Input name="username" type="username" value={`@${user?.username || 'guest'}`} readOnly />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <div className="flex items-center gap-2">
                <Input value={`••••••••••••`} className="select-none" readOnly />
                <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                  Change
                </Button>
              </div>
            </div>

            {/* Save/Cancel */}
            <div className="flex pt-4">
              <Button type="submit" variant="default">
                Save Changes
              </Button>
            </div>
          </form>

          {/* Settings Section */}
          <div className="rounded-lg border">
            <div className="p-6">
              <h2 className="text-lg font-semibold">Account Settings</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-muted-foreground text-sm">Permanently delete your account and all associated data.</p>
                  </div>
                  <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
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
          <form className="space-y-4">
            <Input type="password" placeholder="Current password" required />
            <Input type="password" placeholder="New password" required />
            <Input type="password" placeholder="Confirm new password" required />
            <DialogFooter>
              <Button
                type="submit"
                onClick={(e) => {
                  e.preventDefault()
                  console.log('Password changed')
                  setShowPasswordModal(false)
                }}
              >
                Update Password
              </Button>
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
          <p>Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                console.log('Account deleted')
                setShowDeleteConfirm(false)
              }}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
