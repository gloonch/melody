import React from "react";
import { Eye, EyeOff } from "lucide-react";

export function PanelField({ label, icon: Icon, children }) {
  return (
    <label className="grid gap-2 text-right text-sm text-charcoal/70">
      <span className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-charcoal/70" /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

export function PanelInput(props) {
  return (
    <input
      {...props}
      className={`h-[52px] rounded-2xl border border-transparent bg-alabaster px-4 text-sm text-charcoal outline-none transition placeholder:text-charcoal/70 focus:border-rosewood/60 focus:bg-alabaster ${props.className || ""
        }`}
    />
  );
}

export function PanelSection({ title, children }) {
  return (
    <section className="border-t border-dashed border-greige px-5 py-8 sm:px-7 lg:px-9">
      <h2 className="mb-6 text-xl text-charcoal">{title}</h2>
      {children}
    </section>
  );
}

export function PanelSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl bg-alabaster px-4 py-4 text-right text-sm text-charcoal/70 transition hover:bg-alabaster"
    >
      <span>{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-rosewood" : "bg-greige/70"}`}>
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-alabaster shadow-soft transition ${checked ? "right-6" : "right-1"
            }`}
        />
      </span>
    </button>
  );
}

export function PasswordInput({ value, onChange, placeholder, visible, onToggleVisibility, ...props }) {
  const VisibilityIcon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <PanelInput
        {...props}
        value={value}
        onChange={onChange}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        className="w-full pl-12"
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-charcoal/70 transition hover:bg-alabaster hover:text-rosewood"
        aria-label={visible ? "مخفی کردن رمز" : "نمایش رمز"}
      >
        <VisibilityIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
