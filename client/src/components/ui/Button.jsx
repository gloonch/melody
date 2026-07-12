import React from "react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/classNames";

const buttonBase =
  "inline-flex items-center justify-center gap-2 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0";

const buttonVariants = {
  primary:
    "bg-[#c08081] text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] hover:bg-[#ad7274]",
  dark: "bg-[#2f3b33] text-white hover:bg-[#51645a]",
  light:
    "bg-[#f7eadf] text-[#2f3b33] shadow-[0_18px_40px_rgba(24,30,25,0.26)] hover:bg-white",
  outlineLight:
    "border border-white/60 bg-white/12 text-white shadow-[0_18px_40px_rgba(24,30,25,0.2)] backdrop-blur hover:bg-white/18",
  outlineNeutral:
    "border border-[#d8cabd] bg-white text-[#6d5d53] hover:border-[#c08081]/50 hover:text-[#c08081]",
  dangerOutline:
    "border border-[#f0d7d8] bg-white text-[#b85d60] hover:bg-[#fff7f7]",
};

const buttonSizes = {
  sm: "h-10 px-4",
  panelSm: "h-11 px-4",
  md: "h-12 px-6",
  panelMd: "h-12 px-5",
  lg: "h-14 px-7",
};

const buttonShapes = {
  pill: "rounded-full",
  panel: "rounded-xl",
  soft: "rounded-2xl",
};

export function buttonClassName({ variant = "primary", size = "md", shape = "pill", className = "" } = {}) {
  return cx(
    buttonBase,
    buttonShapes[shape] || buttonShapes.pill,
    buttonVariants[variant] || buttonVariants.primary,
    buttonSizes[size] || buttonSizes.md,
    className,
  );
}

export function Button({ variant = "primary", size = "md", shape = "pill", className = "", type = "button", ...props }) {
  return <button type={type} className={buttonClassName({ variant, size, shape, className })} {...props} />;
}

export function ButtonLink({ to, href, variant = "primary", size = "md", shape = "pill", className = "", children, ...props }) {
  const resolvedClassName = buttonClassName({ variant, size, shape, className });

  if (to) {
    return (
      <Link to={to} className={resolvedClassName} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={resolvedClassName} {...props}>
      {children}
    </a>
  );
}
