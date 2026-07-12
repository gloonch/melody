import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function SuccessToast({ message, toastKey = "success" }) {
  return (
    <AnimatePresence>
      {message ? (
        <>
          <motion.div
            key={`${toastKey}-overlay`}
            className="pointer-events-none fixed inset-0 z-[60] bg-[linear-gradient(180deg,rgba(47,59,51,0.08)_0%,rgba(47,59,51,0.18)_52%,rgba(47,59,51,0.08)_100%)] backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
          />
          <motion.div
            key={`${toastKey}-toast`}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
            className="fixed inset-x-4 bottom-5 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#d7ddd4] bg-[#fbfff9] px-5 py-4 text-right text-sm leading-7 text-[#3f5248] shadow-[0_18px_45px_rgba(47,59,51,0.2)] md:text-base"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e3ece3] text-[#51645a]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <span>{message}</span>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
