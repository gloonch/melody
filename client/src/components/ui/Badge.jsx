import React from "react";

export function MaterialPill({ children }) {
  return (
    <span className="rounded-full border border-[#e8ded4] bg-[#fbf8f4] px-3 py-1.5 text-sm text-[#74645a]">
      {children}
    </span>
  );
}
