import React from "react";

interface DualPanelLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode | null;
  rightVisible?: boolean;
  fullWidth?: "left" | "right" | null;
  className?: string;
}

/**
 * DualPanelLayout
 * - Desktop two-column layout with smooth width transitions
 * - Supports split and full-width modes without imposing page logic
 * - Mobile behavior is left to the consumer for now to avoid breaking existing UX
 */
export function DualPanelLayout({
  left,
  right,
  rightVisible = true,
  fullWidth = null,
  className = "",
}: DualPanelLayoutProps) {
  // Determine widths for desktop
  const leftClasses = [
    "transition-[width,opacity] duration-300 ease-in-out min-w-0 overflow-y-auto border-r",
  ];
  const rightClasses = [
    "transition-[width,opacity] duration-300 ease-in-out min-w-0 overflow-y-auto",
  ];

  if (!rightVisible) {
    // Only left side
    leftClasses.push("w-full");
  } else if (fullWidth === "left") {
    leftClasses.push("w-full");
    rightClasses.push("w-0 opacity-0 pointer-events-none");
  } else if (fullWidth === "right") {
    leftClasses.push("w-0 opacity-0 pointer-events-none");
    rightClasses.push("w-full");
  } else {
    // split view
    leftClasses.push("w-1/2");
    rightClasses.push("w-1/2");
  }

  return (
    <div className={"hidden lg:flex h-full " + className}>
      <div className={leftClasses.join(" ")}>{left}</div>
      {rightVisible && <div className={rightClasses.join(" ")}>{right}</div>}
    </div>
  );
}

export default DualPanelLayout;
