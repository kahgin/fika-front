import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/use-mobile'
import { BOTTOM_NAV_HEIGHT } from '@/components/bottom-nav'

export default function ChatPanel() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const isMobile = useIsMobile()

  const handleSend = () => {
    if (!message.trim()) return

    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setMessage('')

    // Simulate bot response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Hi, how can I assist you with your trip planning today? Whether you need recommendations, itinerary suggestions, or help with bookings, I'm here to help!`,
        },
      ])
    }, 1000)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4" style={isMobile ? { paddingBottom: `${BOTTOM_NAV_HEIGHT}px` } : undefined}>
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="space-y-2 text-center">
              <h1 className="font-secondary text-foreground font-bold">Plan without hassle</h1>
              <p className="text-muted-foreground">Start a conversation to plan your perfect journey</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) =>
              msg.role === 'user' ? (
                <div key={index} className="flex">
                  <div className="bg-primary rounded-xl px-4 py-2">
                    <p className="text-primary-foreground text-sm leading-relaxed text-pretty">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div key={index} className="flex">
                  <div className="w-full">
                    <p className="text-sm leading-relaxed text-pretty">{msg.content}</p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div
        className="z-50 border-t bg-white p-4"
        style={
          isMobile
            ? {
                position: 'fixed',
                bottom: `${BOTTOM_NAV_HEIGHT}px`,
                left: 0,
                right: 0,
              }
            : undefined
        }
      >
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything about your trip..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
