import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ResponsiveImage } from "../ui/ResponsiveImage";

export function ProductGallery({ images = [], title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);
  const hasMultipleImages = images.length > 1;
  const activeImage = images[activeIndex] || images[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  if (!activeImage?.url) {
    return <div className="aspect-square rounded-[28px] bg-[#f2e9df]" aria-label="تصویر محصول موجود نیست" />;
  }

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % images.length);
  };

  const handleKeyDown = (event) => {
    if (!hasMultipleImages) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showNext();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showPrevious();
    }
  };

  const handleTouchEnd = (event) => {
    if (!hasMultipleImages || touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 45) return;
    if (distance < 0) showNext();
    else showPrevious();
  };

  return (
    <div className="min-w-0" aria-label={`گالری تصاویر ${title}`}>
      <div
        className="group relative aspect-square overflow-hidden rounded-[28px] bg-[#f2e9df] outline-none focus-visible:ring-2 focus-visible:ring-[#a05f62] focus-visible:ring-offset-2"
        tabIndex={hasMultipleImages ? 0 : -1}
        onKeyDown={handleKeyDown}
        onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStartX.current = null; }}
      >
        <ResponsiveImage
          key={activeImage.id || activeImage.url}
          src={activeImage.url}
          sources={activeImage.sources}
          sizes="(min-width: 1280px) 540px, (min-width: 768px) 48vw, 100vw"
          alt={activeImage.alt || `${title} - تصویر ${activeIndex + 1}`}
          width="1200"
          height="1200"
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />

        {hasMultipleImages ? (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#4f433b] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a05f62]"
              aria-label="تصویر قبلی"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#4f433b] shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a05f62]"
              aria-label="تصویر بعدی"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#493d37]/75 px-3 py-1 text-xs text-white" aria-live="polite">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="انتخاب تصویر محصول">
          {images.map((image, index) => (
            <button
              key={image.id || image.url}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-[#f2e9df] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a05f62] ${index === activeIndex ? "border-[#a05f62]" : "border-transparent opacity-70 hover:opacity-100"}`}
              aria-label={`نمایش تصویر ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <ResponsiveImage
                src={image.url}
                sources={image.sources}
                sizes="64px"
                alt=""
                width="64"
                height="64"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
