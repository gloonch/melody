import React, { useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { PRODUCT_FILTER_GROUPS, productMatchesFilters, productSizeBucket } from "../../lib/productCatalog";

const COLLAPSED_OPTION_COUNT = 4;

function FilterOptions({ group, filters, products, onToggle, expanded, onExpandedChange }) {
  const selectedValues = filters[group.key];
  const orderedOptions = expanded
    ? group.options
    : [
        ...group.options.filter((option) => selectedValues.includes(option.value)),
        ...group.options.filter((option) => !selectedValues.includes(option.value)),
      ].slice(0, COLLAPSED_OPTION_COUNT);
  const hiddenOptions = group.options.filter((option) => !orderedOptions.includes(option));
  const canExpand = group.options.length > COLLAPSED_OPTION_COUNT;

  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5">
        {orderedOptions.map((option) => {
          const selected = filters[group.key].includes(option.value);
          const count = products.filter((product) => {
            const optionMatches = group.key === "sizes"
              ? productSizeBucket(product.diameterCm) === option.value
              : (product[group.key] || []).includes(option.value);
            return optionMatches && productMatchesFilters(product, filters, group.key);
          }).length;
          const disabled = count === 0 && !selected;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onToggle(group.key, option.value)}
              className={`flex min-h-9 min-w-0 items-center justify-between gap-1 rounded-full border px-1.5 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-2 sm:text-xs lg:px-3 lg:text-sm ${selected ? "border-[#a05f62] bg-[#a05f62] text-white" : "border-[#d8cdc3] bg-white/70 text-[#6d5d53] hover:border-[#c08081]"}`}
            >
              <span className="min-w-0 leading-5">{option.label}</span>
              <span className={`shrink-0 ${selected ? "text-white/75" : "text-[#9b8b80]"}`}>{new Intl.NumberFormat("fa-IR").format(count)}</span>
            </button>
          );
        })}
      </div>

      {!expanded && hiddenOptions.length > 0 ? (
        <div aria-hidden="true" className="relative mt-1 h-5 overflow-hidden text-center text-[11px] leading-5 text-[#9b8b80]/35">
          {hiddenOptions.map((option) => option.label).join("، ")}
          <span className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[#f5f1eb] to-transparent" />
        </div>
      ) : null}

      {canExpand ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => onExpandedChange(!expanded)}
          className="mx-auto mt-1.5 flex min-h-8 items-center justify-center gap-1 text-[11px] font-bold text-[#8d5558] transition hover:text-[#713f42] sm:text-xs"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "نمایش کمتر" : "مشاهده بیشتر"}
        </button>
      ) : null}
    </div>
  );
}

export function ProductFilters({ products, filters, resultCount, onQueryChange, onToggle, onReset }) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const hasFilters = filters.query || PRODUCT_FILTER_GROUPS.some((group) => filters[group.key].length);

  return (
    <section aria-label="جست‌وجو و فیلتر محصولات" className="mb-10 border-y border-[#ddd3c9] py-6 text-right">
      <div className="mx-auto max-w-2xl">
        <label className="relative block">
          <span className="sr-only">جست‌وجو در محصولات</span>
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9a877b]" />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="جست‌وجوی نام، کاربرد، تکنیک یا جنس"
            className="h-12 w-full rounded-full border border-[#d8cdc3] bg-white/80 px-12 text-sm text-[#4f433b] outline-none transition placeholder:text-[#a6978d] focus:border-[#a05f62]"
          />
        </label>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:gap-x-4 md:gap-x-7">
          {PRODUCT_FILTER_GROUPS.map((group) => (
            <fieldset key={group.key} className="min-w-0">
              <legend className="mb-2 text-xs font-bold text-[#62534b] sm:text-sm">{group.label}</legend>
              <FilterOptions
                group={group}
                filters={filters}
                products={products}
                onToggle={onToggle}
                expanded={Boolean(expandedGroups[group.key])}
                onExpandedChange={(expanded) => setExpandedGroups((current) => ({ ...current, [group.key]: expanded }))}
              />
            </fieldset>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-[#75655a] md:justify-between">
        <p aria-live="polite"><strong className="text-[#4f433b]">{new Intl.NumberFormat("fa-IR").format(resultCount)}</strong> محصول</p>
        {hasFilters ? (
          <button type="button" onClick={onReset} className="inline-flex min-h-10 items-center gap-2 text-[#8d5558] hover:text-[#713f42]">
            <X className="h-4 w-4" /> پاک‌کردن فیلترها
          </button>
        ) : null}
      </div>
    </section>
  );
}
