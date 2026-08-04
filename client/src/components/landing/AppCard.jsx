import React from "react";

export function AppCard({ item }) {
  return (
    <div className="group text-center transition-transform duration-300 hover:-translate-y-1">
      <div className="mx-auto mb-5 flex aspect-square w-full max-w-[10.5rem] items-center justify-center sm:max-w-[13rem] lg:max-w-[14rem]">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <h3 className="mb-2 text-base leading-7 text-[#4d4038] sm:text-xl">{item.title}</h3>
      <p className="mx-auto max-w-[16rem] text-xs leading-6 text-[#6f6057] sm:text-sm sm:leading-7">{item.desc}</p>
    </div>
  );
}
