import { useState } from "react";
import { ChatPanel } from "@/components/panels/ChatPanel";
import ItineraryPanel from "@/components/panels/ItineraryPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeftToLine, ArrowRightToLine } from "lucide-react";

export default function ChatPage() {
  const [isItineraryFullWidth, setIsItineraryFullWidth] = useState(false);

  const handleExpandItinerary = () => setIsItineraryFullWidth(true);
  const handleCollapseItinerary = () => setIsItineraryFullWidth(false);

  return (
    <>
      {/* Panel Header */}
      <div className="py-2 px-6 flex items-center justify-between border-b">
        <div className="flex items-center justify-between w-full">
          <h6 className="font-semibold">Chat</h6>
          <Button variant="ghost" size="icon" onClick={isItineraryFullWidth ? handleCollapseItinerary : handleExpandItinerary}>
            {isItineraryFullWidth ? <ArrowRightToLine /> : <ArrowLeftToLine /> }
          </Button>
        </div>
      </div>
      <div className="h-screen flex">
        {/* ChatPanel */}
        <div className={isItineraryFullWidth ? "hidden" : "flex-1 min-w-0 basis-1/2 border-r bg-white dark:bg-background"}>
          <ChatPanel />
        </div>

        {/* ItineraryPanel */}
        <div className={isItineraryFullWidth ? "flex-1 min-w-0" : "flex-1 min-w-0 basis-1/2 bg-white dark:bg-background"}>
          <div className="relative h-full">
            <ItineraryPanel className="h-full" />
          </div>
        </div>
      </div>
    </>
  );
}
