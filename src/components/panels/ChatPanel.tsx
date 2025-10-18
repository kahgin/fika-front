import { useState } from "react";
import { Send } from "lucide-react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatPanelProps {
  fullWidth?: boolean;
  halfWidth?: boolean;
}

export function ChatPanel({ fullWidth, halfWidth }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setMessage("");
    
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content:
        `
        Hi, how can I assist you with your trip planning today? Whether you need recommendations, itinerary suggestions, or help with bookings, I'm here to help!
        `
      }]);
    }, 1000);
  };

  return (
    <Panel fullWidth={fullWidth} halfWidth={halfWidth}>
      <div className="flex flex-col h-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <h1 className="font-secondary font-bold text-foreground">
                  Plan without hassle
                </h1>
                <p className="text-muted-foreground">
                  Start a conversation to plan your perfect journey
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                msg.role === 'user' ? (
                  <div
                    key={index}
                    className="flex"
                  >
                    <div className="rounded-xl px-4 py-2 bg-primary">
                      <p className="text-pretty text-primary-foreground text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    key={index}
                    className="flex"
                  >
                    <div className="w-full">
                      <p className="text-pretty text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t">
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
    </Panel>
  );
}