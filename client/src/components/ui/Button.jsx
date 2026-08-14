import React from "react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/classNames";

const buttonBase =
  "inline-flex items-center justify-center gap-2 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0";

const buttonVariants = {
  primary:
    "bg-rosewood text-alabaster shadow-accent hover:bg-charcoal",
  dark: "bg-charcoal text-alabaster hover:bg-rosewood",
  light:
    "bg-alabaster text-charcoal shadow-soft hover:bg-greige",
  outlineLight:
    "border border-alabaster/60 bg-alabaster/12 text-alabaster shadow-soft backdrop-blur hover:bg-alabaster/18",
  outlineNeutral:
    "border border-greige bg-alabaster text-charcoal/70 hover:border-rosewood/50 hover:text-rosewood",
  dangerOutline:
    "border border-rosewood/40 bg-alabaster text-rosewood hover:bg-greige",
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
