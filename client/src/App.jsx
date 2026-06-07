import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Flower2, Send, Sparkles } from "lucide-react";
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";
import logoImage from "./assets/Logo.png";
import flowerImage1 from "./assets/section-two/1.jpeg";
import flowerImage2 from "./assets/section-two/2.jpg";
import flowerImage3 from "./assets/section-two/3.jpg";
import flowerImage4 from "./assets/section-two/4.jpg";
import craftImage1 from "./assets/section-three/1.jpg";
import craftImage2 from "./assets/section-three/2.jpg";
import craftImage3 from "./assets/section-three/3.jpg";
import craftImage4 from "./assets/section-three/4.jpg";
import styleImage1 from "./assets/section-four/1.png";
import styleImage2 from "./assets/section-four/2.png";
import styleImage3 from "./assets/section-four/3.png";
import styleImage4 from "./assets/section-four/4.png";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 2000;
const CONTACT_SUCCESS_MESSAGE = "اطلاعات شما ثبت شد و به‌زودی پشتیبان‌های سایت با شما ارتباط برقرار می‌کنند.";
const COURSE_SUCCESS_MESSAGE = "شماره شما ثبت شد و با شروع دوره‌های آموزشی به شما اطلاع داده می‌شود.";
const NAV_SCROLL_DURATION = 820;
const CTA_SCROLL_DURATION = 1750;
const LOGO_SCROLL_DURATION = 900;
const SITE_URL = "https://golmelo.com";
const SITE_NAME = "golmelo";
const DEFAULT_SEO = {
  title: "گلملو | گل‌های پارچه‌ای دست‌ساز و آموزش گل‌سازی پارچه‌ای",
  description:
    "Golmelo دنیای گل‌های پارچه‌ای دست‌ساز برای لباس، کلاه، سنجاق سینه و اکسسوری است؛ همراه با دوره آموزش گل‌سازی پارچه‌ای از پایه تا ساخت گل‌های ظریف‌تر.",
  image: `${SITE_URL}/og-image.png`,
  url: `${SITE_URL}/`,
};
const COURSE_STATUS_LABELS = {
  in_progress: "در حال برگزاری",
  in_production: "در حال تولید",
  completed: "اتمام دوره",
  published: "در حال برگزاری",
  draft: "پیش‌نویس",
};

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function apiEndpoint(path) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

function usePageSEO({ title, description, url, image = DEFAULT_SEO.image, type = "website" }) {
  useEffect(() => {
    const resolvedTitle = title || DEFAULT_SEO.title;
    const resolvedDescription = description || DEFAULT_SEO.description;
    const resolvedURL = url || DEFAULT_SEO.url;

    document.title = resolvedTitle;
    upsertCanonical(resolvedURL);
    upsertMeta('meta[name="description"]', { name: "description", content: resolvedDescription });
    upsertMeta('meta[name="robots"]', { name: "robots", content: "index, follow" });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: resolvedTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: resolvedDescription });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: resolvedURL });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
    upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: "نشان گلملو" });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: resolvedTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: resolvedDescription });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
  }, [description, image, title, type, url]);
}

function useJsonLd(id, data) {
  useEffect(() => {
    if (!data) return undefined;

    let element = document.getElementById(id);
    if (!element) {
      element = document.createElement("script");
      element.id = id;
      element.type = "application/ld+json";
      document.head.appendChild(element);
    }

    element.textContent = JSON.stringify(data);

    return () => {
      element.remove();
    };
  }, [data, id]);
}

function normalizeDigits(value) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function validateContactForm(form) {
  const fullName = form.fullName.trim();
  const phoneValidation = validatePhoneNumber(form.contact);
  const message = form.message.trim();

  if (!fullName || !form.contact.trim() || !message) {
    return { error: "همه فیلدها الزامی هستند." };
  }

  if (phoneValidation.error) {
    return phoneValidation;
  }

  if (message.length < MESSAGE_MIN_LENGTH) {
    return { error: `متن پیام باید حداقل ${MESSAGE_MIN_LENGTH} کاراکتر باشد.` };
  }

  if (message.length > MESSAGE_MAX_LENGTH) {
    return { error: `متن پیام نباید بیشتر از ${MESSAGE_MAX_LENGTH} کاراکتر باشد.` };
  }

  return {
    payload: {
      fullName,
      contact: phoneValidation.phone,
      message,
    },
  };
}

function validatePhoneNumber(value) {
  const phone = normalizeDigits(value.trim());

  if (!phone) {
    return { error: "شماره تلفن الزامی است." };
  }

  if (!/^[0-9]+$/.test(phone)) {
    return { error: "شماره تلفن باید فقط شامل عدد باشد." };
  }

  return { phone };
}

function resolveApiURL(value) {
  if (!value) return "";

  try {
    return new URL(value, `${API_BASE_URL}/`).toString();
  } catch {
    return value;
  }
}

const flowerStudies = [
  {
    title: "گل پارچه‌ای دست‌ساز برای لباس مجلسی",
    image: flowerImage1,
  },
  {
    title: "اکسسوری گل پارچه‌ای برای استایل",
    image: flowerImage2,
  },
  {
    title: "گل پارچه‌ای برای کلاه و سنجاق",
    image: flowerImage3,
  },
  {
    title: "جزئیات ظریف گل پارچه‌ای",
    image: flowerImage4,
  },
];

const applications = [
  {
    title: "سنجاق سینه گل پارچه‌ای",
    desc: "گل پارچه‌ای دست‌ساز برای یقه، کت، مانتو و استایل‌های رسمی.",
    image: styleImage1,
  },
  {
    title: "گل پارچه‌ای برای لباس مجلسی",
    desc: "برای کمربند، سرشانه، یقه یا جزئیات لباس مجلسی و لباس عروس.",
    image: styleImage2,
  },
  {
    title: "گل پارچه‌ای برای کلاه",
    desc: "اکسسوری گل پارچه‌ای برای کلاه‌های کلاسیک، مینیمال یا سفارشی.",
    image: styleImage3,
  },
  {
    title: "اکسسوری گل پارچه‌ای مو",
    desc: "برای شینیون، هدبند، گیره مو و جزئیات ظریف استایل عروس.",
    image: styleImage4,
  },
];


const navItems = [
  { id: "hero", label: "خانه" },
  { id: "inspiration", label: "الهام" },
  { id: "craft", label: "فرآیند ساخت" },
  { id: "usage", label: "کاربردها" },
  { id: "contact", label: "سفارش" },
  { id: "courses", label: "دیدن دوره‌های آموزشی" },
  { id: "works", label: "نمونه‌کارها" },
];

function SiteNavbar({ activeSection = "hero", onNavClick, onLogoClick }) {
  const activeNavItem = navItems.find((item) => item.id === activeSection) ?? navItems[0];

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full bg-[#c08081cc] px-5 py-3 text-[#fff8f3] shadow-[0_14px_32px_rgba(192,128,129,0.25)] backdrop-blur-sm">
        {onLogoClick ? (
          <button
            type="button"
            className="flex items-center"
            onClick={onLogoClick}
            aria-label="بازگشت به ابتدای صفحه"
          >
            <img
              src={logoImage}
              alt="نشان گلملو"
              decoding="async"
              className="h-9 w-auto object-contain brightness-110"
            />
          </button>
        ) : (
          <Link to="/" className="flex items-center" aria-label="بازگشت به ابتدای صفحه">
            <img
              src={logoImage}
              alt="نشان گلملو"
              decoding="async"
              className="h-9 w-auto object-contain brightness-110"
            />
          </Link>
        )}

        <div className="md:hidden">
          <motion.div
            key={activeNavItem.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs text-white/95 backdrop-blur-lg"
          >
            {activeNavItem.label}
          </motion.div>
        </div>

        <nav className="hidden items-center gap-1 rounded-full bg-white/[0.06] p-1 text-sm md:flex">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={onNavClick ? `#${item.id}` : `/#${item.id}`}
                onClick={onNavClick ? onNavClick(item.id) : undefined}
                aria-current={isActive ? "page" : undefined}
                className="relative rounded-full px-4 py-2"
              >
                {isActive ? (
                  <motion.span
                    layoutId="active-nav-pill"
                    className="absolute inset-0 rounded-full bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_14px_32px_rgba(192,128,129,0.25)] backdrop-blur-xl"
                    transition={{ type: "spring", stiffness: 430, damping: 38, mass: 0.85 }}
                  />
                ) : null}
                <span
                  className={`relative z-10 transition-colors duration-300 ${isActive ? "text-white" : "text-[#f7eee4]/84 hover:text-white"
                    }`}
                >
                  {item.label}
                </span>
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function AppCard({ item }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.35 }}
      className="group rounded-[28px] border border-[#e5dbd0] bg-white/70 p-6 text-center shadow-[0_10px_35px_rgba(93,74,55,0.06)] backdrop-blur-sm"
    >
      <div className="mx-auto mb-5 aspect-square w-full max-w-[13rem] overflow-hidden rounded-[26px] border border-[#eadfd5] bg-[#f7f0e8] shadow-inner">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <h3 className="mb-2 text-xl text-[#4d4038]">{item.title}</h3>
      <p className="mx-auto max-w-[16rem] text-sm leading-7 text-[#7d6e63]">{item.desc}</p>
    </motion.div>
  );
}

function WorkCard({ item, index, onSelect }) {
  return (
    <motion.button
      type="button"
      initial={{ y: 14 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      onClick={() => onSelect(item)}
      className="group relative block aspect-square w-full overflow-hidden rounded-[26px] border border-[#e5dbd0] text-right shadow-[0_12px_30px_rgba(83,63,47,0.12)]"
    >
      <img
        src={item.image}
        alt={item.alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
    </motion.button>
  );
}

function SuccessToast({ message, toastKey = "success" }) {
  return (
    <AnimatePresence>
      {message ? (
        <>
          <motion.div
            key={`${toastKey}-overlay`}
            className="pointer-events-none fixed inset-0 z-[60] bg-[linear-gradient(180deg,rgba(47,59,51,0.08)_0%,rgba(47,59,51,0.18)_52%,rgba(47,59,51,0.08)_100%)] backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
          />
          <motion.div
            key={`${toastKey}-toast`}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
            className="fixed inset-x-4 bottom-5 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#d7ddd4] bg-[#fbfff9] px-5 py-4 text-right text-sm leading-7 text-[#3f5248] shadow-[0_18px_45px_rgba(47,59,51,0.2)] md:text-base"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e3ece3] text-[#51645a]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <span>{message}</span>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function MaterialPill({ children }) {
  return (
    <span className="rounded-full border border-[#e8ded4] bg-[#fbf8f4] px-3 py-1.5 text-sm text-[#74645a]">
      {children}
    </span>
  );
}

function CourseVisual({ imageUrl, title, className = "h-full w-full object-cover object-right" }) {
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

function CoursePreviewCard({ course }) {
  const href = `/courses/${course.slug || course.id}`;

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="group relative overflow-hidden rounded-[32px] border border-[#e9e1d7] bg-white shadow-[0_18px_40px_rgba(85,63,45,0.05)] md:min-h-[390px]"
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
                {COURSE_STATUS_LABELS[course.status] || course.status}
              </span>
            </div>
          </div>

          <h3 className="mt-5 text-3xl leading-tight text-[#4f433b] md:text-[2.05rem]">{course.title}</h3>
          <p className="mt-4 max-w-lg text-base leading-8 text-[#73645a]">{course.summary || course.subtitle}</p>

          <div className="mt-6 flex items-center justify-start">
            <Link
              to={href}
              className="inline-flex items-center gap-2 rounded-full bg-[#c08081] px-5 py-3 text-sm text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5"
            >
              مشاهده جزئیات دوره
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function MelodyLandingPage() {
  usePageSEO(DEFAULT_SEO);
  useJsonLd("golmelo-website-jsonld", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "گلملو",
    url: SITE_URL,
    inLanguage: "fa-IR",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: `${SITE_URL}/logo.png`,
    },
  });


  const [activeSection, setActiveSection] = useState("hero");
  const [heroSlides, setHeroSlides] = useState([]);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [works, setWorks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedWork, setSelectedWork] = useState(null);
  const [contactForm, setContactForm] = useState({
    fullName: "",
    contact: "",
    message: "",
  });
  const [contactStatus, setContactStatus] = useState({ type: "idle", message: "" });
  const scrollRafRef = useRef(null);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    const updateActiveSection = () => {
      const activationPoint = window.innerHeight * 0.22;
      let current = "hero";

      for (const section of sections) {
        const rect = section.getBoundingClientRect();

        if (rect.top <= activationPoint && rect.bottom > activationPoint) {
          current = section.id;
          break;
        }

        if (rect.top <= activationPoint) {
          current = section.id;
        }
      }

      setActiveSection((previous) => (previous === current ? previous : current));
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHeroSlides() {
      try {
        const response = await fetch(apiEndpoint("hero-slides"));
        if (!response.ok) {
          throw new Error("Failed to fetch hero slides");
        }

        const data = await response.json();
        const images = Array.isArray(data) ? data : data.images;
        if (!Array.isArray(images) || images.length === 0 || cancelled) {
          return;
        }

        setHeroSlides(
          images.map((item, index) => ({
            id: item.id || `hero-slide-${index + 1}`,
            alt: item.alt || `تصویر معرفی ${index + 1}`,
            image: resolveApiURL(item.url),
          })),
        );
      } catch (error) {
        console.error(error);
      }
    }

    async function loadProjectImages() {
      try {
        const response = await fetch(apiEndpoint("images"));
        if (!response.ok) {
          throw new Error("Failed to fetch project images");
        }

        const data = await response.json();
        const images = Array.isArray(data) ? data : data.images;
        if (!Array.isArray(images) || images.length === 0 || cancelled) {
          return;
        }

        setWorks(
          images.map((item, index) => ({
            id: item.id || `work-${index + 1}`,
            alt: item.alt || `نمونه‌کار ${index + 1}`,
            image: resolveApiURL(item.url),
          })),
        );
      } catch (error) {
        console.error(error);
      }
    }

    async function loadCourses() {
      try {
        const response = await fetch(apiEndpoint("courses"));
        if (!response.ok) {
          throw new Error("Failed to fetch courses");
        }

        const data = await response.json();
        if (cancelled) return;
        setCourses(Array.isArray(data.courses) ? data.courses : []);
      } catch (error) {
        console.error(error);
      }
    }

    loadHeroSlides();
    loadProjectImages();
    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      setActiveHeroSlide(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;

    const nextSlide = heroSlides[(activeHeroSlide + 1) % heroSlides.length];
    if (!nextSlide?.image) return;

    const image = new Image();
    image.decoding = "async";
    image.src = nextSlide.image;
  }, [activeHeroSlide, heroSlides]);

  useEffect(() => {
    if (contactStatus.type !== "success") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (contactStatus.type === "success") {
        setContactStatus({ type: "idle", message: "" });
      }
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [contactStatus.type]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedWork) {
      return undefined;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedWork(null);
      }
    };

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedWork]);

  const animateWindowScrollTo = useCallback((targetY, duration) => {
    if (scrollRafRef.current) {
      window.cancelAnimationFrame(scrollRafRef.current);
    }

    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    if (Math.abs(distance) < 1) {
      window.scrollTo(0, targetY);
      return;
    }

    const tick = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * easedProgress);

      if (progress < 1) {
        scrollRafRef.current = window.requestAnimationFrame(tick);
      } else {
        scrollRafRef.current = null;
      }
    };

    scrollRafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const scrollToSection = useCallback((sectionId, duration) => {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    setActiveSection(sectionId);
    animateWindowScrollTo(window.scrollY + targetSection.getBoundingClientRect().top, duration);
  }, [animateWindowScrollTo]);

  const handleNavClick = (sectionId) => (event) => {
    event.preventDefault();
    scrollToSection(sectionId, NAV_SCROLL_DURATION);
  };

  const handleCtaClick = (sectionId) => (event) => {
    event.preventDefault();
    scrollToSection(sectionId, CTA_SCROLL_DURATION);
  };

  const handleLogoClick = () => {
    setActiveSection("hero");
    animateWindowScrollTo(0, LOGO_SCROLL_DURATION);
  };

  const handleContactChange = (field) => (event) => {
    setContactForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();

    const validation = validateContactForm(contactForm);
    if (validation.error) {
      setContactStatus({ type: "error", message: validation.error });
      return;
    }

    setContactStatus({ type: "loading", message: "در حال ارسال پیام..." });

    try {
      const response = await fetch(apiEndpoint("contact-requests"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to submit contact request");
      }

      setContactForm({ fullName: "", contact: "", message: "" });
      setContactStatus({ type: "success", message: CONTACT_SUCCESS_MESSAGE });
    } catch (error) {
      console.error(error);
      setContactStatus({ type: "error", message: "ارسال پیام انجام نشد. دوباره تلاش کنید." });
    }
  };

  const isSendingContactRequest = contactStatus.type === "loading";
  const successToastMessage = contactStatus.type === "success" ? contactStatus.message : "";
  const activeHero = heroSlides.length
    ? heroSlides[activeHeroSlide % heroSlides.length]
    : null;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f1eb] text-[#493d37]">
      <SuccessToast message={successToastMessage} toastKey="contact-success" />

      <AnimatePresence>
        {selectedWork ? (
          <motion.div
            key="work-full-preview"
            className="fixed inset-0 z-[75] overflow-hidden overscroll-none bg-[linear-gradient(180deg,rgba(47,59,51,0.08)_0%,rgba(47,59,51,0.18)_52%,rgba(47,59,51,0.08)_100%)] backdrop-blur-[1px] touch-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            onClick={() => setSelectedWork(null)}
          >
            <div className="flex h-dvh w-dvw items-center justify-center p-5 md:p-10">
              <motion.img
                src={selectedWork.image}
                alt={selectedWork.alt}
                decoding="async"
                initial={{ opacity: 0.25 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="h-auto w-auto max-h-[72dvh] max-w-[86vw] cursor-zoom-out select-none object-contain sm:max-h-[78dvh] sm:max-w-[82vw] md:max-h-none md:max-w-none"
                onClick={() => setSelectedWork(null)}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SiteNavbar
        activeSection={activeSection}
        onNavClick={handleNavClick}
        onLogoClick={handleLogoClick}
      />

      <section
        id="hero"
        className="relative isolate scroll-mt-28 overflow-hidden bg-[#2f3b33] text-[#fbf5ee] md:scroll-mt-32"
      >
        <div className="pointer-events-none absolute inset-0">
          <AnimatePresence initial={false}>
            {activeHero ? (
              <motion.img
                key={activeHero.id}
                src={activeHero.image}
                alt={activeHero.alt}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.55, ease: [0.45, 0, 0.2, 1] }}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : null}
          </AnimatePresence>
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(25,34,29,0.82)_0%,rgba(47,59,51,0.54)_34%,rgba(65,55,45,0.3)_64%,rgba(47,59,51,0.12)_100%)]" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(25,34,29,0.62)_0%,rgba(47,59,51,0.34)_38%,rgba(47,59,51,0.1)_68%,rgba(47,59,51,0)_100%)]" />

        <div className="relative z-20 mx-auto grid min-h-[88vh] max-w-7xl items-center gap-10 px-6 pb-24 pt-16 md:grid-cols-[1.05fr_0.95fr] md:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl text-right"
          >
            <h1
              className="mb-6 text-5xl leading-[1.1] md:text-7xl"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.62), 0 1px 2px rgba(0,0,0,0.72)" }}
            >
              گلملو؛ آموزش و گل‌های پارچه‌ای دست‌ساز
            </h1>
            <p
              className="max-w-lg text-lg leading-9 text-[#f7eadf]/92 md:text-xl"
              style={{ textShadow: "0 3px 18px rgba(0,0,0,0.58), 0 1px 2px rgba(0,0,0,0.68)" }}
            >
              دنیایی از گل‌های پارچه‌ای دست‌ساز؛ برای لباس، کلاه،
              سنجاق سینه و اکسسوری، همراه با مسیری آموزشی برای گل‌سازی
              از پایه تا مدل‌های ظریف‌تر و حرفه‌ای‌تر.
            </p>
            <div className="mt-8 flex flex-wrap justify-start gap-4 md:mt-10">
              <a
                href="#works"
                onClick={handleCtaClick("works")}
                className="rounded-full bg-[#c08081] px-7 py-3.5 text-base text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
              >
                دیدن نمونه‌کارها
              </a>
              <a
                href="#courses"
                onClick={handleCtaClick("courses")}
                className="rounded-full bg-[#c08081] px-7 py-3.5 text-base text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
              >
                مشاهده دوره ها
              </a>
              <a
                href="#contact"
                onClick={handleCtaClick("contact")}
                className="rounded-full border border-[#f0c7c8]/50 bg-[#c08081]/20 px-7 py-3.5 text-base text-white shadow-[0_14px_32px_rgba(192,128,129,0.18)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-[#c08081]/32"
              >
                ثبت سفارش
              </a>
            </div>
          </motion.div>

          <div className="hidden md:block" />
        </div>
      </section>

      <main className="relative z-10 -mt-1">
        <section id="inspiration" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">الهام‌گرفته از زیبایی زنده</h2>
            <p className="text-lg leading-9 text-[#75655a]">
              هر گل نیروی آرام خود را دارد؛ لطافتی درونی، حرکتی نرم، و نظمی پنهان در دل طبیعت.
              این مجموعه از همین زیبایی زنده الهام می‌گیرد و آن را به زبانی تازه و لمس‌پذیر بازمی‌گوید.
            </p>
          </div>


          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {flowerStudies.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className="aspect-square overflow-hidden rounded-[24px] border border-[#e7ddd2] shadow-[0_14px_35px_rgba(84,64,47,0.08)]"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </motion.div>
            ))}
          </div>
        </section>

        <section id="craft" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">
              سفارش گل پارچه‌ای اختصاصی
            </h2>
            <p className="text-lg leading-9 text-[#75655a]">
              از انتخاب بافت‌های لطیف تا برش دقیق، فرم‌دهی آرام و ترکیب لایه‌ها، هر قطعه
              با صبر و توجه ساخته می‌شود. اگر برای لباس، کلاه، کیف، سنجاق سینه یا لباس
              عروس به یک گل پارچه‌ای اختصاصی نیاز دارید، می‌توانید سفارش خود را بر اساس
              رنگ، سبک، کاربرد و نوع استایل ثبت کنید.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {[craftImage1, craftImage2, craftImage3, craftImage4].map((image, index) => (
              <motion.div
                key={`craft-mobile-${index + 1}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className="aspect-square overflow-hidden rounded-[24px] border border-[#e7ddd2] shadow-[0_14px_35px_rgba(84,64,47,0.08)]"
              >
                <img
                  src={image}
                  alt={`بافت پارچه ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </motion.div>
            ))}
          </div>
        </section>

        <section id="usage" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">
              کاربرد گل‌های پارچه‌ای در استایل و لباس
            </h2>
            <p className="text-lg leading-9 text-[#75655a]">
              گل‌های پارچه‌ای فراتر از تزئین طراحی شده‌اند؛ می‌توانند روی لباس مجلسی،
              لباس عروس، کلاه، کیف، سنجاق سینه یا اکسسوری مو قرار بگیرند و جزئیاتی
              شخصی، ظریف و ماندگار به استایل اضافه کنند.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {applications.map((item) => (
              <AppCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="overflow-hidden rounded-[34px] border border-[#e6dbcf] bg-[linear-gradient(135deg,#fbf7f1_0%,#f3ece4_100%)] shadow-[0_20px_50px_rgba(84,64,47,0.06)]">
            <div className="grid gap-8 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8 lg:p-10">
              <div className="relative text-right">
                <h2 className="mb-4 text-4xl leading-tight text-[#54463d]">برای سفارش یا همکاری</h2>
                <p className="max-w-md text-lg leading-9 text-[#73645a]">
                  ایده‌ی شما می‌تواند از همین‌جا آغاز شود. برای سفارش، همکاری یا پرسش درباره‌ی
                  قطعات سفارشی، پیام خود را بفرستید.
                </p>
              </div>

              <form className="grid gap-4 text-right" onSubmit={handleContactSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="fullName"
                    value={contactForm.fullName}
                    onChange={handleContactChange("fullName")}
                    required
                    autoComplete="name"
                    className="h-14 rounded-2xl border border-[#e5d8cd] bg-white/70 px-4 text-[#54463d] outline-none placeholder:text-[#a39286] focus:border-[#51645a]"
                    placeholder="نام و نام خانوادگی"
                  />
                  <input
                    name="contact"
                    value={contactForm.contact}
                    onChange={handleContactChange("contact")}
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9۰-۹٠-٩]+"
                    autoComplete="tel"
                    dir="rtl"
                    className="rtl-input h-14 rounded-2xl border border-[#e5d8cd] bg-white/70 px-4 text-[#54463d] outline-none placeholder:text-[#a39286] focus:border-[#51645a]"
                    placeholder="شماره تلفن"
                  />
                </div>
                <textarea
                  name="message"
                  value={contactForm.message}
                  onChange={handleContactChange("message")}
                  required
                  minLength={MESSAGE_MIN_LENGTH}
                  maxLength={MESSAGE_MAX_LENGTH}
                  rows={5}
                  className="rounded-[22px] border border-[#e5d8cd] bg-white/70 px-4 py-4 text-[#54463d] outline-none placeholder:text-[#a39286] focus:border-[#51645a]"
                  placeholder="پیام شما"
                />
                <p className="text-xs text-[#9b867d]">
                  متن پیام باید بین {MESSAGE_MIN_LENGTH} تا {MESSAGE_MAX_LENGTH} کاراکتر باشد.
                </p>
                <div className="flex flex-col items-start justify-between gap-4 pt-2 md:flex-row md:items-center">
                  <button
                    type="submit"
                    disabled={isSendingContactRequest}
                    className="inline-flex items-center gap-2 rounded-full bg-[#c08081] px-7 py-3.5 text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
                  >
                    <Send className="h-4 w-4" />
                    {isSendingContactRequest ? "در حال ارسال" : "ارسال پیام"}
                  </button>
                  <p
                    aria-live="polite"
                    className={`text-sm ${contactStatus.type === "error"
                      ? "text-[#b85d60]"
                      : "text-[#9b867d]"
                      }`}
                  >
                    {contactStatus.type === "success"
                      ? "اطلاعات شما امن و محرمانه خواهد ماند."
                      : contactStatus.message || "اطلاعات شما امن و محرمانه خواهد ماند."}
                  </p>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section id="courses" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">
              دوره های آموزش گل‌سازی پارچه‌ای
            </h2>
            <p className="text-lg leading-9 text-[#75655a]">
              در دوره آموزش گل‌سازی پارچه‌ای ترم اول، هنرجو ساخت ۵ گل را به‌صورت ویدیویی
              و مرحله‌به‌مرحله یاد می‌گیرد. مسیر دوره از گل‌های ساده‌تر شروع می‌شود و
              به‌تدریج به مدل‌های پیچیده‌تر می‌رسد؛ از نسترن و داوودی تا لیلیوم، رز و رز حلزونی.
            </p>
          </div>

          <div className="mt-12 grid gap-6">
            {courses.map((course) => (
              <CoursePreviewCard key={course.id} course={course} />
            ))}
            {courses.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#d9cfc5] bg-white/60 p-8 text-center text-[#807269]">
                هنوز دوره‌ای منتشر نشده است.
              </div>
            ) : null}
          </div>

        </section>
        <section id="works" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">نمونه‌کارهای منتخب</h2>
            <p className="text-lg leading-9 text-[#75655a]">
              مجموعه‌ای از قطعات منتخب که هرکدام روایتی متفاوت از لطافت، بافت، فرم و حضور گل در
              استایل را به نمایش می‌گذارند.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {works.map((item, index) => (
              <WorkCard key={item.id} item={item} index={index} onSelect={setSelectedWork} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function CourseSignupForm() {
  const [coursePhone, setCoursePhone] = useState("");
  const [courseStatus, setCourseStatus] = useState({ type: "idle", message: "" });
  const isSubmitting = courseStatus.type === "loading";
  const successToastMessage = courseStatus.type === "success" ? courseStatus.message : "";

  useEffect(() => {
    if (courseStatus.type !== "success") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCourseStatus({ type: "idle", message: "" });
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [courseStatus.type]);

  const handleCourseSignupSubmit = async (event) => {
    event.preventDefault();

    const validation = validatePhoneNumber(coursePhone);
    if (validation.error) {
      setCourseStatus({ type: "error", message: validation.error });
      return;
    }

    setCourseStatus({ type: "loading", message: "در حال ثبت شماره..." });

    try {
      const response = await fetch(apiEndpoint("course-signups"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: validation.phone }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to submit course signup");
      }

      setCoursePhone("");
      setCourseStatus({ type: "success", message: COURSE_SUCCESS_MESSAGE });
    } catch (error) {
      console.error(error);
      setCourseStatus({ type: "error", message: "ثبت شماره انجام نشد. دوباره تلاش کنید." });
    }
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#e6dbcf] bg-white/70 p-6 shadow-[0_18px_40px_rgba(85,63,45,0.05)]">
      <SuccessToast message={successToastMessage} toastKey="course-signup-success" />

      <div className="mx-auto max-w-2xl text-center">
        <h3 className="text-2xl text-[#4f433b]">برای اطلاع از زمان برگزاری و ثبت‌نام</h3>
        <p className="mt-3 text-sm leading-7 text-[#807269]">
          اگر این دوره برایتان مناسب بود، شماره خود را بگذارید تا درباره زمان برگزاری، ظرفیت و نحوه ثبت‌نام اطلاع‌رسانی شود.
        </p>
      </div>

      <form className="mx-auto mt-5 grid max-w-xl gap-3 text-right" onSubmit={handleCourseSignupSubmit}>
        <input
          value={coursePhone}
          onChange={(event) => setCoursePhone(event.target.value)}
          required
          type="tel"
          inputMode="numeric"
          pattern="[0-9۰-۹٠-٩]+"
          autoComplete="tel"
          dir="rtl"
          className="rtl-input h-14 rounded-2xl border border-[#e0d2c4] bg-white/80 px-4 text-[#54463d] outline-none placeholder:text-[#a39286] focus:border-[#c08081]"
          placeholder="شماره تلفن"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-14 items-center justify-center gap-2 justify-self-center rounded-full bg-[#c08081] px-6 text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? "در حال ثبت" : "می‌خواهم از ثبت‌نام این دوره باخبر شوم"}
        </button>
      </form>

      {courseStatus.type !== "success" ? (
        <p
          aria-live="polite"
          className={`mx-auto mt-3 max-w-xl text-right text-sm ${courseStatus.type === "error" ? "text-[#b85d60]" : "text-[#9b867d]"
            }`}
        >
          {courseStatus.message || "فقط شماره تلفن خود را وارد کنید."}
        </p>
      ) : null}
    </div>
  );
}

function LessonCard({ lesson }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-[32px] border border-[#e9e1d7] bg-white shadow-[0_18px_40px_rgba(85,63,45,0.05)] md:min-h-[420px]"
    >
      <div className="relative h-64 overflow-hidden bg-[#f7f0e8] md:hidden">
        <CourseVisual
          imageUrl={lesson.imageUrl}
          title={lesson.title}
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 hidden md:block">
        <CourseVisual imageUrl={lesson.imageUrl} title={lesson.title} />
      </div>
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#fffaf6_0%,rgba(255,250,246,0.96)_40%,rgba(255,250,246,0.72)_12%,rgba(255,250,246,0.18)_48%,rgba(255,250,246,0)_100%)] md:block" />
      <div className="absolute inset-y-0 left-0 hidden bg-[linear-gradient(90deg,#fffaf6_0%,rgba(255,250,246,0.98)_36%,rgba(255,250,246,0.8)_52%,rgba(255,250,246,0)_74%)] md:block md:w-[72%]" />

      <div className="relative z-10 p-5 md:flex md:min-h-[420px] md:items-center md:py-8 md:pl-5 md:pr-8 lg:py-10 lg:pl-6 lg:pr-10">
        <div className="mr-auto w-full max-w-xl text-right md:w-[46%]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#a49084]">
              <span className="rounded-full bg-[#f6efea] px-3 py-1 text-xs tracking-[0.16em]">{lesson.id}</span>
              {lesson.level ? (
                <span className="rounded-full bg-[#edf2ec] px-3 py-1 text-xs text-[#6d7e6b]">{lesson.level}</span>
              ) : null}
              {lesson.type ? (
                <span className="rounded-full bg-[#f4eeea] px-3 py-1 text-xs text-[#8d786d]">{lesson.type}</span>
              ) : null}
              {lesson.duration ? (
                <span className="rounded-full bg-[#f8f3ed] px-3 py-1 text-xs text-[#8b7a70]">{lesson.duration}</span>
              ) : null}
            </div>
          </div>

          <h3 className="mt-5 text-3xl leading-tight text-[#4f433b]">گل {lesson.title}</h3>
          <p className="mt-4 max-w-lg text-base leading-8 text-[#73645a]">{lesson.summary}</p>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {(lesson.materials || []).map((item) => (
              <MaterialPill key={item}>{item}</MaterialPill>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function CourseDetailPage() {
  const { id } = useParams();
  const [payload, setPayload] = useState({ course: null, images: [] });
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const course = payload.course;
  const coursePath = course?.slug || id;

  usePageSEO({
    title: course?.title
      ? `${course.title} | آموزش گل‌سازی پارچه‌ای ترم اول | گلملو`
      : "دوره آموزش گل‌سازی پارچه‌ای ترم اول | آموزش ۵ گل پارچه‌ای | گلملو",
    description:
      course?.summary ||
      course?.description ||
      "در دوره آموزش گل‌سازی پارچه‌ای ترم اول، ساخت ۵ گل نسترن، داوودی، لیلیوم، رز و رز حلزونی را به‌صورت ویدیویی و مرحله‌به‌مرحله یاد بگیرید.",
    url: `${SITE_URL}/courses/${coursePath}`,
    image: course?.imageUrl || DEFAULT_SEO.image,
    type: "article",
  });
  useJsonLd(course ? "golmelo-course-jsonld" : "golmelo-course-jsonld-empty", course ? {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.summary || course.description,
    url: `${SITE_URL}/courses/${coursePath}`,
    image: course.imageUrl || DEFAULT_SEO.image,
    inLanguage: "fa-IR",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: course.format || "online",
      courseWorkload: course.duration || undefined,
    },
  } : null);

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      setStatus({ type: "loading", message: "" });
      try {
        const response = await fetch(apiEndpoint(`courses/${id}`));
        if (!response.ok) {
          throw new Error("دوره پیدا نشد.");
        }
        const data = await response.json();
        if (cancelled) return;
        setPayload({ course: data.course, images: data.images || [] });
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status.type === "loading") {
    return <div dir="rtl" className="grid min-h-screen place-items-center bg-[#f5f1eb] text-[#75655a]">در حال بارگذاری دوره...</div>;
  }

  if (!course) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-[#f5f1eb] px-6 text-center text-[#75655a]">
        <div>
          <p>{status.message || "دوره پیدا نشد."}</p>
          <Link to="/" className="mt-4 inline-flex rounded-full bg-[#c08081] px-5 py-3 text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]">بازگشت به خانه</Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f1eb] text-[#493d37]">
      <SiteNavbar activeSection="courses" />
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-28 md:px-8 lg:px-12">
        <section className="overflow-hidden rounded-[40px] border border-[#e8dfd5] bg-[#faf7f3] shadow-[0_24px_60px_rgba(85,63,45,0.06)]">
          <div className="border-b border-[#eee5db] px-6 py-14 md:px-10 lg:px-14">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mt-5 text-5xl leading-[1.18] text-[#4f433b] md:text-6xl">{course.title}</h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-[#75655a] md:text-xl">{course.description}</p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-[#ece4db] bg-white p-4 text-right shadow-[0_10px_28px_rgba(85,63,45,0.04)] md:p-5">
                <h3 className="mb-2 text-lg text-[#4f433b]">آنچه در این دوره یاد می‌گیرید</h3>
                <ul className="space-y-1.5 text-sm leading-6 text-[#726359]">
                  {(course.outcomes || []).slice(0, 5).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[22px] border border-[#ece4db] bg-white p-4 text-right shadow-[0_10px_28px_rgba(85,63,45,0.04)] md:p-5">
                <h3 className="mb-2 text-lg text-[#4f433b]">مناسب چه کسانی است؟</h3>
                <ul className="space-y-1.5 text-sm leading-6 text-[#726359]">
                  {(course.audience || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="px-6 py-12 md:px-10 lg:px-14">
            <div className="mb-8 flex flex-col items-start gap-3 text-right md:flex-row md:items-end md:justify-between">
              <div className="order-2 text-sm text-[#9c8a7f] md:order-1">{(course.lessons || []).length} آموزش ویدیویی</div>
              <div className="order-1 md:order-2">
                <h2 className="text-2xl text-[#4f433b]">سرفصل‌های دوره</h2>
                <p className="mt-2 text-sm text-[#8f7f73]">هر درس با متریال موردنیاز و سطح سختی مشخص شده است.</p>
              </div>
            </div>

            <div className="space-y-6">
              {(course.lessons || []).map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                />
              ))}
              <CourseSignupForm />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MelodyLandingPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
