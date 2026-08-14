import React from "react";

export function MaterialPill({ children }) {
  return (
    <span className="rounded-full border border-greige bg-alabaster px-3 py-1.5 text-sm text-charcoal/70">
      {children}
    </span>
  );
}
