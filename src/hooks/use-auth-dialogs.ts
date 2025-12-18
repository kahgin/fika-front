import { useCallback, useState } from 'react'

export function useAuthDialogs() {
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  const openLogin = useCallback(() => setShowLogin(true), [])
  const openSignup = useCallback(() => setShowSignup(true), [])

  const switchToSignup = useCallback(() => {
    setShowLogin(false)
    setShowSignup(true)
  }, [])

  const switchToLogin = useCallback(() => {
    setShowSignup(false)
    setShowLogin(true)
  }, [])

  return {
    showLogin,
    setShowLogin,
    showSignup,
    setShowSignup,
    openLogin,
    openSignup,
    switchToSignup,
    switchToLogin,
  }
}
