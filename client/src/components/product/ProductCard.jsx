import React from "react";
import { ChevronLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { trackEvent } from "../../lib/analytics";
import { ResponsiveImage } from "../ui/ResponsiveImage";

export function ProductCard({ product, index, showOverlay = true, sizes = "(min-width: 768px) 33vw, 50vw" }) {
  const productPath = product.slug || product.id;
  const productHref = `/products/${productPath}`;
  const location = useLocation();
  const navigate = useNavigate();

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
      className="group overflow-hidden rounded-[18px] bg-[#f7f0e8] text-right transition-transform duration-500 hover:-translate-y-1"
    >
      {!showOverlay ? <h3 className="sr-only">{product.title}</h3> : null}
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
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-[linear-gradient(180deg,rgba(250,247,243,0)_0%,rgba(250,247,243,0.7)_56%,rgba(250,247,243,0.96)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-4">
              <h3 className="line-clamp-2 max-w-[62%] text-right text-lg leading-7 text-[#4f433b]">{product.title}</h3>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#c08081] px-3 py-1.5 text-xs font-bold text-white shadow-[0_10px_24px_rgba(192,128,129,0.24)]">
                جزئیات
                <ChevronLeft className="h-4 w-4" />
              </span>
            </div>
          </>
        ) : null}
      </Link>
    </article>
  );
}
