import React from "react";
import { ChevronLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { trackEvent } from "../../lib/analytics";
import { formatProductDiameter, productLabels } from "../../lib/productCatalog";
import { ResponsiveImage } from "../ui/ResponsiveImage";

export function ProductCard({ product, index, showOverlay = true, sizes = "(min-width: 768px) 33vw, 50vw" }) {
  const productPath = product.slug || product.id;
  const productHref = `/products/${productPath}`;
  const location = useLocation();
  const navigate = useNavigate();
  const techniques = productLabels(product, "techniques", 2);
  const useCases = productLabels(product, "useCases", 2);
  const materials = productLabels(product, "materials", 2);
  const diameter = formatProductDiameter(product.diameterCm);

  const handleProductClick = (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    trackEvent("product_selected", {
      product_id: product.id,
      content_type: "product",
      source: location.pathname === "/" ? "landing" : "catalog",
    });
    navigate(productHref, {
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        scrollY: window.scrollY,
      },
    });
  };

  return (
    <article
      className="group overflow-hidden rounded-[18px] bg-alabaster text-right transition-transform duration-500 hover:-translate-y-1"
    >
      <Link to={productHref} onClick={handleProductClick} className="relative block aspect-square overflow-hidden">
        <ResponsiveImage
          src={product.coverImageUrl}
          sources={product.coverImageSources}
          alt={product.title}
          sizes={sizes}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {showOverlay ? (
          <>
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-vertical-surface-fade" />
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-4">
              <h3 className="line-clamp-2 max-w-[62%] text-right text-lg leading-7 text-charcoal">{product.title}</h3>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rosewood px-3 py-1.5 text-xs font-bold text-alabaster shadow-accent">
                جزئیات
                <ChevronLeft className="h-4 w-4" />
              </span>
            </div>
          </>
        ) : null}
      </Link>
      {!showOverlay ? (
        <Link to={productHref} onClick={handleProductClick} className="block min-h-[126px] px-3 py-4 sm:px-4">
          <h3 className="line-clamp-2 text-sm font-bold leading-6 text-charcoal sm:text-base">{product.title}</h3>
          <p className="mt-2 line-clamp-1 text-xs leading-5 text-charcoal/70">
            {[...techniques, ...materials].join(" · ") || "مشخصات در حال تکمیل"}
          </p>
          <p className="mt-1 line-clamp-1 text-xs leading-5 text-charcoal/70">
            {[...useCases, diameter].filter(Boolean).join(" · ") || product.usageLabel || "قابل سفارش"}
          </p>
        </Link>
      ) : null}
    </article>
  );
}
