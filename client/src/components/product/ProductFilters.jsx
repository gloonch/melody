import React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PRODUCT_FILTER_GROUPS, productMatchesFilters, productSizeBucket } from "../../lib/productCatalog";

function FilterOptions({ group, filters, products, onToggle }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
      {group.options.map((option) => {
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
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-[#a05f62] bg-[#a05f62] text-white" : "border-[#d8cdc3] bg-white/70 text-[#6d5d53] hover:border-[#c08081]"}`}
          >
            <span>{option.label}</span>
            {option.swatch ? <span aria-hidden="true" className="h-4 w-4 rounded-full border border-black/10" style={{ background: option.swatch }} /> : null}
            <span className={selected ? "text-white/75" : "text-[#9b8b80]"}>{new Intl.NumberFormat("fa-IR").format(count)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ProductFilters({ products, filters, resultCount, onQueryChange, onToggle, onReset }) {
  const useCaseGroup = PRODUCT_FILTER_GROUPS[0];
  const advancedGroups = PRODUCT_FILTER_GROUPS.slice(1);
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
        <p className="mb-3 text-center text-sm font-bold text-[#62534b] md:text-right">کاربرد</p>
        <FilterOptions group={useCaseGroup} filters={filters} products={products} onToggle={onToggle} />
      </div>

      <details className="mt-5 md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[#d8cdc3] bg-white/60 px-4 text-sm font-bold text-[#62534b]">
          <SlidersHorizontal className="h-4 w-4" /> فیلترهای بیشتر
        </summary>
        <div className="mt-5 grid gap-5">
          {advancedGroups.map((group) => (
            <div key={group.key}>
              <p className="mb-3 text-center text-sm font-bold text-[#62534b]">{group.label}</p>
              <FilterOptions group={group} filters={filters} products={products} onToggle={onToggle} />
            </div>
          ))}
        </div>
      </details>

      <div className="mt-6 hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-4">
        {advancedGroups.map((group) => (
          <fieldset key={group.key} className="min-w-0">
            <legend className="mb-3 text-sm font-bold text-[#62534b]">{group.label}</legend>
            <FilterOptions group={group} filters={filters} products={products} onToggle={onToggle} />
          </fieldset>
        ))}
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
