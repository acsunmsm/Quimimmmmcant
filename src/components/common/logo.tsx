import { cn } from "@/lib/utils";
import React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("text-primary", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <circle cx="50" cy="50" r="10" fill="currentColor" />
        <ellipse
          cx="50"
          cy="50"
          rx="45"
          ry="18"
          stroke="currentColor"
          strokeWidth="4"
          transform="rotate(-45 50 50)"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="45"
          ry="18"
          stroke="currentColor"
          strokeWidth="4"
          transform="rotate(45 50 50)"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="45"
          ry="18"
          stroke="currentColor"
          strokeWidth="4"
          transform="rotate(0 50 50)"
        />
      </g>
    </svg>
  );
}
