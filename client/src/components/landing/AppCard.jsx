import React from "react";
import { motion } from "framer-motion";

export function AppCard({ item }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35 }}
      className="group text-center"
    >
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
      <p className="mx-auto max-w-[16rem] text-xs leading-6 text-[#7d6e63] sm:text-sm sm:leading-7">{item.desc}</p>
    </motion.div>
  );
}
