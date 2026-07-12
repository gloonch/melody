import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonLink } from "../ui/Button";
import { CoursePreviewCard } from "./CoursePreviewCard";

export function CourseSlider({ courses, statusLabels = {} }) {
  const sliderRef = useRef(null);
  const canSlide = courses.length > 1;

  const scrollCourses = (direction) => {
    const slider = sliderRef.current;
    if (!slider) return;

    const scrollAmount = slider.clientWidth * 0.86;
    slider.scrollBy({
      left: direction === "right" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  if (!canSlide) {
    return (
      <div className="mt-12">
        <div className="mx-auto w-full max-w-[980px]">
          <CoursePreviewCard course={courses[0]} statusLabels={statusLabels} />
        </div>

        <div className="mt-5 flex justify-center">
          <ButtonLink to="/courses" variant="primary" size="md">
            مشاهده دوره‌ها
          </ButtonLink>
        </div>
      </div>
    );
  }

  const controlClassName = "absolute top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center text-[#c08081] transition hover:scale-110 hover:text-[#ad7274]";

  return (
    <div className="relative mt-12">
      <button
        type="button"
        onClick={() => scrollCourses("left")}
        className={`${controlClassName} left-0`}
        aria-label="اسلاید به چپ"
      >
        <ChevronLeft className="h-8 w-8" />
      </button>
      <button
        type="button"
        onClick={() => scrollCourses("right")}
        className={`${controlClassName} right-0`}
        aria-label="اسلاید به راست"
      >
        <ChevronRight className="h-8 w-8" />
      </button>
      <div
        ref={sliderRef}
        dir="ltr"
        className="-mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-5 [scrollbar-width:none] md:-mx-8 md:gap-6 md:px-8 lg:-mx-12 lg:px-12 [&::-webkit-scrollbar]:hidden"
      >
        {courses.map((course) => (
          <div
            key={course.id}
            dir="rtl"
            className="w-[min(86vw,760px)] flex-none snap-center md:w-[760px] lg:w-[900px] xl:w-[980px]"
          >
            <CoursePreviewCard course={course} statusLabels={statusLabels} />
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <ButtonLink to="/courses" variant="primary" size="md">
          مشاهده دوره‌ها
        </ButtonLink>
      </div>
    </div>
  );
}
