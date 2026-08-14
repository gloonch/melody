import React from "react";
import { CheckCircle2 } from "lucide-react";

export function SuccessToast({ message, toastKey = "success" }) {
  return message ? (
    <>
      <div
        key={`${toastKey}-overlay`}
        className="toast-overlay pointer-events-none fixed inset-0 z-[60] bg-vertical-ink-fade backdrop-blur-[1px]"
      />
      <div
        key={`${toastKey}-toast`}
        role="status"
        aria-live="polite"
        className="toast-content fixed inset-x-4 bottom-5 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-greige bg-alabaster px-5 py-4 text-right text-sm leading-7 text-charcoal shadow-soft md:text-base"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-greige/70 text-charcoal/70">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <span>{message}</span>
      </div>
    </>
  ) : null;
}
