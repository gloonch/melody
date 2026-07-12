import React from "react";

export function CourseVisual({ imageUrl, title, className = "h-full w-full object-cover object-right" }) {
  if (imageUrl) {
    return (
      <img src={imageUrl} alt={title} loading="lazy" decoding="async" className={className} />
    );
  }

  return (
    <div className="relative h-full min-h-[220px] overflow-hidden bg-[linear-gradient(145deg,#f7f2eb_0%,#eee4d8_100%)]">
      <div className="absolute right-[22%] top-[16%] h-28 w-28 rotate-[14deg] rounded-[44%] border border-white/70 bg-white/45" />
      <div className="absolute left-[24%] top-[34%] h-20 w-20 -rotate-[10deg] rounded-[46%] border border-white/60 bg-white/35" />
      <div className="absolute right-[46%] top-[38%] h-16 w-px bg-[#b9a295]/70" />
      <div className="absolute right-[46%] top-[48%] h-px w-14 rotate-[24deg] bg-[#b9a295]/70" />
    </div>
  );
}
