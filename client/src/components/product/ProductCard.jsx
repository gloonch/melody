import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function ProductCard({ product, index, showOverlay = true }) {
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
    <motion.article
      initial={{ y: 14 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className="group overflow-hidden rounded-[18px] bg-[#f7f0e8] text-right"
    >
      <Link to={productHref} onClick={handleProductClick} className="relative block aspect-square overflow-hidden">
        <img
          src={product.coverImageUrl}
          alt={product.title}
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
    </motion.article>
  );
}
