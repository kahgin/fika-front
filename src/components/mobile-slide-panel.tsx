import { type ReactNode } from 'react'

interface MobileSlidePanelProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  isLoading?: boolean
  loadingText?: string
}

/**
 * A reusable mobile slide-up panel component with backdrop overlay.
 * Used for displaying POI details and other content on mobile devices.
 */
export function MobileSlidePanel({
  isOpen,
  onClose,
  children,
  isLoading = false,
  loadingText = 'Loading...',
}: MobileSlidePanelProps) {
  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={
          'fixed inset-0 z-40 transition-opacity duration-300 ' +
          (isOpen ? 'pointer-events-auto bg-black/40 opacity-100' : 'pointer-events-none opacity-0')
        }
        aria-hidden='true'
        onClick={onClose}
      />

      {/* Slide-up panel */}
      <div
        className={
          'fixed inset-0 z-50 flex h-screen flex-col transition-transform duration-300 ease-in-out ' +
          (isOpen ? 'pointer-events-auto' : 'pointer-events-none')
        }
        style={{
          transform: isOpen ? 'translateY(0%)' : 'translateY(100%)',
        }}
      >
        <div className='flex h-full flex-1 flex-col overflow-hidden border-t border-gray-200 bg-white shadow-2xl'>
          {isLoading ? (
            <div className='flex h-full items-center justify-center'>
              <div className='space-y-3 text-center'>
                <div className='mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900'></div>
                <p className='text-muted-foreground text-sm'>{loadingText}</p>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </>
  )
}
