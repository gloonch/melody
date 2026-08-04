import React from "react";
import { CheckCircle2 } from "lucide-react";

export function SuccessToast({ message, toastKey = "success" }) {
  return message ? (
    <>
      <div
        key={`${toastKey}-overlay`}
        className="toast-overlay pointer-events-none fixed inset-0 z-[60] bg-[linear-gradient(180deg,rgba(47,59,51,0.08)_0%,rgba(47,59,51,0.18)_52%,rgba(47,59,51,0.08)_100%)] backdrop-blur-[1px]"
      />
      <div
        key={`${toastKey}-toast`}
        role="status"
        aria-live="polite"
        className="toast-content fixed inset-x-4 bottom-5 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#d7ddd4] bg-[#fbfff9] px-5 py-4 text-right text-sm leading-7 text-[#3f5248] shadow-[0_18px_45px_rgba(47,59,51,0.2)] md:text-base"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e3ece3] text-[#51645a]">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <span>{message}</span>
      </div>
    </>
  ) : null;
}
