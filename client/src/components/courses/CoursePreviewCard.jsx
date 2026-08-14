import React from "react";
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
      <article
        className="group relative cursor-pointer overflow-hidden rounded-[32px] border border-greige bg-alabaster shadow-soft transition-transform duration-300 hover:-translate-y-1.5 md:min-h-[390px]"
      >
        <div className="relative h-64 overflow-hidden bg-alabaster md:hidden">
          <CourseVisual
            imageUrl={course.imageUrl}
            imageSources={course.imageSources}
            sizes="100vw"
            title={course.title}
            className="h-full w-full object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 hidden md:block">
          <CourseVisual imageUrl={course.imageUrl} imageSources={course.imageSources} sizes="(min-width: 1024px) 980px, 86vw" title={course.title} />
        </div>
        <div className="absolute inset-0 hidden bg-surface-fade md:block" />
        <div className="absolute inset-y-0 left-0 hidden bg-surface-fade md:block md:w-[72%]" />

        <div className="relative z-10 p-5 md:flex md:min-h-[390px] md:items-center md:py-8 md:pl-5 md:pr-8 lg:py-10 lg:pl-6 lg:pr-10">
          <div className="mr-auto w-full max-w-xl text-right md:w-[46%]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-charcoal/70">
                {course.term ? (
                  <span className="rounded-full bg-alabaster px-3 py-1 text-xs tracking-[0.16em] text-charcoal/70">{course.term}</span>
                ) : null}
                {course.level ? (
                  <span className="rounded-full bg-alabaster px-3 py-1 text-xs text-charcoal/70">{course.level}</span>
                ) : null}
                {course.format ? (
                  <span className="rounded-full bg-alabaster px-3 py-1 text-xs text-charcoal/70">{course.format}</span>
                ) : null}
                <span className="rounded-full bg-alabaster px-3 py-1 text-xs text-charcoal/70">
                  {statusLabels[course.status] || course.status}
                </span>
              </div>
            </div>

            <h3 className="mt-5 text-3xl leading-tight text-charcoal md:text-[2.05rem]">{course.title}</h3>
            <p className="mt-4 max-w-lg text-base leading-8 text-charcoal/70">{course.summary || course.subtitle}</p>
          </div>
        </div>
      </article>
    </Link>
  );
}
