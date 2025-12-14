import LoginForm from '@/components/forms/login-form'
import SignupForm from '@/components/forms/signup-form'
import { useAuthDialogs } from '@/hooks/use-auth-dialogs'

interface AuthDialogsProps {
  dialogState?: ReturnType<typeof useAuthDialogs>
}

/**
 * Renders both LoginForm and SignupForm dialogs with proper state management.
 * Can either use provided dialogState or create its own internal state.
 */
export function AuthDialogs({ dialogState }: AuthDialogsProps) {
  const internalState = useAuthDialogs()
  const state = dialogState || internalState

  return (
    <>
      <LoginForm open={state.showLogin} onOpenChange={state.setShowLogin} onSwitchToSignup={state.switchToSignup} />
      <SignupForm open={state.showSignup} onOpenChange={state.setShowSignup} onSwitchToLogin={state.switchToLogin} />
    </>
  )
}

/**
 * Hook + Component combo for pages that need auth dialogs with trigger buttons
 */
export function useAuthDialogsWithComponent() {
  const dialogState = useAuthDialogs()

  const AuthDialogsComponent = () => <AuthDialogs dialogState={dialogState} />

  return {
    ...dialogState,
    AuthDialogsComponent,
  }
}
