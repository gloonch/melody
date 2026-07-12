import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CourseVisual } from "./CourseVisual";

export function CoursePreviewCard({ course, statusLabels = {} }) {
  const href = `/courses/${course.slug || course.id}`;

  return (
    <Link
      to={href}
      className="block"
      aria-label={`مشاهده جزئیات دوره ${course.title}`}
    >
      <motion.article
        whileHover={{ y: -6 }}
        transition={{ duration: 0.3 }}
        className="group relative cursor-pointer overflow-hidden rounded-[32px] border border-[#e9e1d7] bg-white shadow-[0_18px_40px_rgba(85,63,45,0.05)] md:min-h-[390px]"
      >
        <div className="relative h-64 overflow-hidden bg-[#f7f0e8] md:hidden">
          <CourseVisual
            imageUrl={course.imageUrl}
            title={course.title}
            className="h-full w-full object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 hidden md:block">
          <CourseVisual imageUrl={course.imageUrl} title={course.title} />
        </div>
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#fffaf6_0%,rgba(255,250,246,0.96)_40%,rgba(255,250,246,0.72)_12%,rgba(255,250,246,0.18)_48%,rgba(255,250,246,0)_100%)] md:block" />
        <div className="absolute inset-y-0 left-0 hidden bg-[linear-gradient(90deg,#fffaf6_0%,rgba(255,250,246,0.98)_36%,rgba(255,250,246,0.8)_52%,rgba(255,250,246,0)_74%)] md:block md:w-[72%]" />

        <div className="relative z-10 p-5 md:flex md:min-h-[390px] md:items-center md:py-8 md:pl-5 md:pr-8 lg:py-10 lg:pl-6 lg:pr-10">
          <div className="mr-auto w-full max-w-xl text-right md:w-[46%]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[#a49084]">
                {course.term ? (
                  <span className="rounded-full bg-[#f6efea] px-3 py-1 text-xs tracking-[0.16em]">{course.term}</span>
                ) : null}
                {course.level ? (
                  <span className="rounded-full bg-[#edf2ec] px-3 py-1 text-xs text-[#6d7e6b]">{course.level}</span>
                ) : null}
                {course.format ? (
                  <span className="rounded-full bg-[#f4eeea] px-3 py-1 text-xs text-[#8d786d]">{course.format}</span>
                ) : null}
                <span className="rounded-full bg-[#fff2f2] px-3 py-1 text-xs text-[#b06d6f]">
                  {statusLabels[course.status] || course.status}
                </span>
              </div>
            </div>

            <h3 className="mt-5 text-3xl leading-tight text-[#4f433b] md:text-[2.05rem]">{course.title}</h3>
            <p className="mt-4 max-w-lg text-base leading-8 text-[#73645a]">{course.summary || course.subtitle}</p>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
