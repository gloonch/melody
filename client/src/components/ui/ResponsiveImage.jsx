import React from "react";

export function responsiveSrcSet(sources = []) {
  return sources
    .filter((source) => source?.url && Number(source.width) > 0)
    .sort((a, b) => Number(a.width) - Number(b.width))
    .map((source) => `${source.url} ${source.width}w`)
    .join(", ");
}

export function ResponsiveImage({ src, sources = [], alt, sizes = "100vw", ...props }) {
  const webpSources = sources.filter((source) => source.type === "image/webp");
  const srcSet = responsiveSrcSet(webpSources);

  return (
    <picture>
      {srcSet ? <source type="image/webp" srcSet={srcSet} sizes={sizes} /> : null}
      <img src={src} alt={alt} sizes={sizes} {...props} />
    </picture>
  );
}
