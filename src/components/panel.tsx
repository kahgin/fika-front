import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  halfWidth?: boolean;
  collapsed?: boolean;
}

export function Panel({ 
  children, 
  className, 
  fullWidth = false, 
  halfWidth = false,
  collapsed = false
}: PanelProps) {
  return (
    <div
      className={cn(
        "panel h-full min-h-0 panel-transition transition-[width,opacity] duration-300 ease-in-out",
        collapsed ? "w-0 opacity-0 pointer-events-none" : [
          fullWidth && "w-full",
          halfWidth && "w-1/2",
          !fullWidth && !halfWidth && "flex-1",
        ],
        "[&:not(:first-child)]:border-l [&:not(:first-child)]:rounded-2xl",
        className
      )}
    >
      {children}
    </div>
  );
}