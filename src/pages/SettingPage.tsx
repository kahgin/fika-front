import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function SettingsPage() {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [userInfo, setUserInfo] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    username: "johndoe123",
  })

  const [formValues, setFormValues] = useState({
    name: userInfo.name,
    email: userInfo.email,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // send to backend here
    console.log("Saving:", formValues)
    setUserInfo({ ...userInfo, ...formValues })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 h-12 flex items-center">
        <h6>Settings</h6>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* User Info Section */}
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border p-6 space-y-6"
          >
            <h4>User Information</h4>

            {/* Profile Picture */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-semibold">
                  {userInfo.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <div>
                <h6>@{userInfo.username}</h6>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary hover:no-underline"
                >
                  Change profile photo
                </a>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <Input
                name="name"
                type="text"
                value={formValues.name}
                onChange={handleChange}
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <Input
                name="email"
                type="email"
                value={formValues.email}
                onChange={handleChange}
              />
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Username
              </label>
              <Input name="username" type="username" value={`@${userInfo.username}`} readOnly />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="flex items-center gap-2">
                <Input value={`••••••••••••`} className="select-none" readOnly />
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordModal(true)}
                >
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
            <div className="p-6 ">
              <h2 className="text-lg font-semibold">Account Settings</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
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
                  console.log("Password changed")
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
          <p>
            Are you sure you want to delete your account? This action cannot be
            undone and will permanently remove all your data.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                console.log("Account deleted")
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
