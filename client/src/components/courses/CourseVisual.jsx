import React from "react";
import { ResponsiveImage } from "../ui/ResponsiveImage";

export function CourseVisual({ imageUrl, imageSources = [], title, sizes = "100vw", className = "h-full w-full object-cover object-right" }) {
  if (imageUrl) {
    return (
      <ResponsiveImage src={imageUrl} sources={imageSources} sizes={sizes} alt={title} loading="lazy" decoding="async" className={className} />
    );
  }

  return (
    <div className="relative h-full min-h-[220px] overflow-hidden bg-surface-gradient">
      <div className="absolute right-[22%] top-[16%] h-28 w-28 rotate-[14deg] rounded-[44%] border border-alabaster/70 bg-alabaster/45" />
      <div className="absolute left-[24%] top-[34%] h-20 w-20 -rotate-[10deg] rounded-[46%] border border-alabaster/60 bg-alabaster/35" />
      <div className="absolute right-[46%] top-[38%] h-16 w-px bg-rosewood/70" />
      <div className="absolute right-[46%] top-[48%] h-px w-14 rotate-[24deg] bg-rosewood/70" />
    </div>
  );
}
