import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MonitorPlay,
  Send,
  User,
} from "lucide-react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import logoImage from "./assets/Logo.webp";
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
import customOrderBackgroundFallback from "./assets/section-inspiration/custom-order-fabric-background.png";
import customOrderBackgroundMobile from "./assets/section-inspiration/custom-order-fabric-background-480.webp";
import customOrderBackgroundImage from "./assets/section-inspiration/custom-order-fabric-background.webp";
import usageBlazerImage from "./assets/section-usage/blazer-flower.webp";
import usageDressImage from "./assets/section-usage/dress-flower.webp";
import usageHatImage from "./assets/section-usage/hat-flower.webp";
import usageHairImage from "./assets/section-usage/hair-flower.webp";
import { CoursePreviewCard } from "./components/courses/CoursePreviewCard";
import { CourseSlider } from "./components/courses/CourseSlider";
import { CourseVisual } from "./components/courses/CourseVisual";
import { AppCard } from "./components/landing/AppCard";
import { SiteNavbar } from "./components/layout/SiteNavbar";
import { ProductCard } from "./components/product/ProductCard";
import { ProductFilters } from "./components/product/ProductFilters";
import { ProductGallery } from "./components/product/ProductGallery";
import { MaterialPill } from "./components/ui/Badge";
import { Button, ButtonLink } from "./components/ui/Button";
import { SuccessToast } from "./components/ui/SuccessToast";
import { responsiveSrcSet } from "./components/ui/ResponsiveImage";
import { initAnalytics, trackEvent, trackPageView } from "./lib/analytics";
import {
  EMPTY_PRODUCT_FILTERS,
  formatProductDiameter,
  parseProductFilterHash,
  productLabels,
  productMatchesFilters,
  serializeProductFilterHash,
} from "./lib/productCatalog";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const PanelRoutes = lazy(() => import("./pages/PanelRoutes"));
const BlogsPage = lazy(() => import("./pages/BlogPages").then((module) => ({ default: module.BlogsPage })));
const BlogDetailPage = lazy(() => import("./pages/BlogPages").then((module) => ({ default: module.BlogDetailPage })));

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");
const USER_SESSION_CACHE_KEY = "sh_me";
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 2000;
const CONTACT_SUCCESS_MESSAGE = "اطلاعات شما ثبت شد و به‌زودی پشتیبان‌های سایت با شما ارتباط برقرار می‌کنند.";
const NAV_SCROLL_DURATION = 820;
const CTA_SCROLL_DURATION = 1750;
const LOGO_SCROLL_DURATION = 900;
const SITE_URL = "https://golmelo.com";
const SITE_NAME = "golmelo";
const DEFAULT_SEO = {
  title: "گلملو | خرید گل پارچه‌ای دست‌ساز و آموزش گل‌سازی",
  description:
    "خرید و سفارش اختصاصی گل‌های پارچه‌ای دست‌ساز برای لباس و اکسسوری، همراه با مشاوره تخصصی و دوره‌های آنلاین آموزش گل‌سازی گلملو.",
  image: `${SITE_URL}/og-image.png`,
  url: `${SITE_URL}/`,
};
const COURSE_STATUS_LABELS = {
  in_progress: "در حال برگزاری",
  in_production: "در حال تولید",
  completed: "اتمام دوره",
  published: "در حال برگزاری",
  recording: "در حال ضبط",
  for_sale: "قابل فروش",
  sold_out: "تکمیل ظرفیت",
  archived: "آرشیو",
  draft: "پیش‌نویس",
};
export const ORDER_STATUS_LABELS = {
  draft: "پیش‌نویس",
  pending_review: "در انتظار بررسی",
  need_more_info: "نیازمند اطلاعات بیشتر",
  confirmed: "تایید شده",
  in_progress: "در حال ساخت",
  ready: "آماده تحویل",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};
export const CUSTOM_USAGE_OPTIONS = [
  { value: "hat", label: "کلاه" },
  { value: "dress", label: "لباس" },
  { value: "bridal", label: "لباس عروس" },
  { value: "bag", label: "کیف" },
  { value: "brooch", label: "سنجاق سینه" },
  { value: "hair_accessory", label: "اکسسوری مو" },
  { value: "other", label: "سایر" },
];

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function apiEndpoint(path) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(apiEndpoint(path), {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("ارتباط با سرور برقرار نشد. ابتدا backend را اجرا کنید.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(body?.error || "درخواست انجام نشد.");
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
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

function usePageSEO({ title, description, url, image = DEFAULT_SEO.image, type = "website", robots = "index, follow" }) {
  useEffect(() => {
    const resolvedTitle = title || DEFAULT_SEO.title;
    const resolvedDescription = description || DEFAULT_SEO.description;
    const resolvedURL = url || DEFAULT_SEO.url;

    document.title = resolvedTitle;
    upsertCanonical(resolvedURL);
    upsertMeta('meta[name="description"]', { name: "description", content: resolvedDescription });
    upsertMeta('meta[name="robots"]', { name: "robots", content: robots });
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
  }, [description, image, robots, title, type, url]);
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

export function normalizeDigits(value) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function validateContactForm(form) {
  const fullName = form.fullName.trim();
  const phoneValidation = validatePhoneNumber(form.contact);
  const message = form.message.trim();

  if (!form.contact.trim() || !message) {
    return { error: "شماره تماس و پیام الزامی هستند." };
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

export function resolveApiURL(value) {
  if (!value) return "";

  try {
    return new URL(value, `${API_BASE_URL}/`).toString();
  } catch {
    return value;
  }
}

function normalizeImageSources(sources) {
  return (Array.isArray(sources) ? sources : [])
    .map((source) => ({ ...source, url: resolveApiURL(source?.url) }))
    .filter((source) => source.url && Number(source.width) > 0);
}

export function formatTomanPrice(basePriceRial, fallback = "قیمت در حال تکمیل است") {
  const rial = Number(basePriceRial);
  if (!Number.isFinite(rial) || rial <= 0) return fallback;
  return `${new Intl.NumberFormat("fa-IR").format(Math.round(rial / 10))} تومان`;
}

function productPriceLabel(product) {
  return formatTomanPrice(product?.basePriceRial, "قیمت در حال تکمیل است");
}

const PRODUCT_AVAILABILITY_LABELS = {
  in_stock: "موجود و آماده سفارش",
  made_to_order: "ساخت پس از سفارش",
  out_of_stock: "ناموجود",
};

function sortProductsNewestFirst(products) {
  return [...products]
    .map((product, index) => ({ product, index }))
    .sort((first, second) => {
      const firstCreatedAt = Date.parse(first.product?.createdAt || "");
      const secondCreatedAt = Date.parse(second.product?.createdAt || "");
      const firstTimestamp = Number.isFinite(firstCreatedAt) ? firstCreatedAt : 0;
      const secondTimestamp = Number.isFinite(secondCreatedAt) ? secondCreatedAt : 0;

      return secondTimestamp - firstTimestamp || first.index - second.index;
    })
    .map(({ product }) => product);
}

function getProductBackTarget(state) {
  const from = state?.from;
  if (from && typeof from === "object" && from.pathname) return from;

  return { pathname: "/products" };
}

function getProductBackState(state) {
  return typeof state?.scrollY === "number" ? { restoreScrollY: state.scrollY } : undefined;
}

function useRestoreScrollPosition(ready) {
  const location = useLocation();
  const restoreScrollY = location.state?.restoreScrollY;

  useEffect(() => {
    if (!ready || typeof restoreScrollY !== "number") return undefined;

    const frameID = window.requestAnimationFrame(() => {
      window.scrollTo({ top: restoreScrollY, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frameID);
  }, [location.key, ready, restoreScrollY]);
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
    image: usageBlazerImage,
  },
  {
    title: "گل پارچه‌ای برای لباس مجلسی",
    desc: "برای کمربند، سرشانه، یقه یا جزئیات لباس مجلسی و لباس عروس.",
    image: usageDressImage,
  },
  {
    title: "گل پارچه‌ای برای کلاه",
    desc: "اکسسوری گل پارچه‌ای برای کلاه‌های کلاسیک، مینیمال یا سفارشی.",
    image: usageHatImage,
  },
  {
    title: "اکسسوری گل پارچه‌ای مو",
    desc: "برای شینیون، هدبند، گیره مو و جزئیات ظریف استایل عروس.",
    image: usageHairImage,
  },
];

const brandPaths = [
  {
    title: "گل‌های آماده",
    text: "محصولات آماده ارسال برای لباس، کلاه، کیف و اکسسوری با امکان انتخاب سریع و مشاهده جزئیات.",
    target: "products",
    cta: "دیدن گل‌های آماده",
  },
  {
    title: "سفارش اختصاصی",
    text: "تغییر رنگ، اندازه، جنس، ترکیب و نوع اتصال بر اساس لباس، موقعیت استفاده و بودجه شما.",
    target: "custom-order",
    cta: "شروع سفارش اختصاصی",
  },
  {
    title: "آموزش آنلاین",
    text: "یادگیری ساخت گل‌های پارچه‌ای با آموزش‌های مرحله‌به‌مرحله، روان و قابل دنبال‌کردن.",
    target: "courses",
    cta: "دیدن دوره‌های آنلاین",
  },
];

const customOrderOptions = ["رنگ", "اندازه", "جنس پارچه", "نوع گل", "نوع اتصال", "تعداد", "ترکیب چند گل", "کاربرد روی لباس یا اکسسوری"];

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const PANEL_PROGRESS_STORAGE_KEY = "golmelo-panel-progress-v1";

export const panelCourses = [
  {
    id: "fabric-flower-foundation",
    accessIds: ["fabric-flower-foundation", "01"],
    title: "دوره مقدماتی گل‌سازی پارچه‌ای",
    subtitle: "شروع قدم‌به‌قدم از ابزار، آماده‌سازی پارچه و ساخت گل‌های پایه.",
    cover: flowerImage1,
    accent: "rgb(var(--color-rosewood))",
    completedLessonIds: [
      "foundation-intro",
      "foundation-tools",
      "foundation-fabric",
      "foundation-petal",
      "foundation-nastaran",
    ],
    chapters: [
      {
        id: "foundation-start",
        title: "مقدمه",
        lessons: [
          {
            id: "foundation-intro",
            title: "معرفی مسیر دوره",
            duration: "۰۸:۲۰",
            thumbnail: craftImage1,
          },
          {
            id: "foundation-tools",
            title: "ابزار و متریال اولیه",
            duration: "۱۲:۱۰",
            thumbnail: craftImage2,
          },
        ],
      },
      {
        id: "foundation-basics",
        title: "آماده‌سازی و فرم‌دهی",
        lessons: [
          {
            id: "foundation-fabric",
            title: "آماده‌سازی پارچه",
            duration: "۱۰:۴۵",
            thumbnail: craftImage3,
          },
          {
            id: "foundation-petal",
            title: "فرم‌دهی گلبرگ‌ها",
            duration: "۱۵:۳۰",
            thumbnail: craftImage4,
          },
        ],
      },
      {
        id: "foundation-flowers",
        title: "ساخت گل‌های پایه",
        lessons: [
          {
            id: "foundation-nastaran",
            title: "ساخت گل نسترن",
            duration: "۱۸:۴۰",
            thumbnail: flowerImage2,
          },
          {
            id: "foundation-davoodi",
            title: "ساخت گل داوودی",
            duration: "۲۴:۰۰",
            thumbnail: flowerImage3,
          },
          {
            id: "foundation-finish",
            title: "مونتاژ و تمیزکاری نهایی",
            duration: "۱۱:۱۵",
            thumbnail: flowerImage4,
          },
        ],
      },
    ],
  },
  {
    id: "advanced-fabric-flowers",
    accessIds: ["advanced-fabric-flowers"],
    title: "دوره جامع گل‌های پارچه‌ای پیشرفته",
    subtitle: "تمرین مدل‌های حجمی‌تر برای لباس، کلاه و اکسسوری‌های خاص.",
    cover: styleImage2,
    accent: "rgb(var(--color-rosewood))",
    completedLessonIds: ["advanced-intro", "advanced-pattern"],
    chapters: [
      {
        id: "advanced-start",
        title: "شروع دوره",
        lessons: [
          {
            id: "advanced-intro",
            title: "معرفی ساختار دوره",
            duration: "۰۶:۵۵",
            thumbnail: styleImage1,
          },
          {
            id: "advanced-pattern",
            title: "طراحی الگو برای گل‌های حجمی",
            duration: "۱۴:۳۰",
            thumbnail: styleImage2,
          },
        ],
      },
      {
        id: "advanced-roses",
        title: "گل‌های حجمی",
        lessons: [
          {
            id: "advanced-lilium",
            title: "ساخت لیلیوم پارچه‌ای",
            duration: "۲۲:۴۰",
            thumbnail: styleImage3,
          },
          {
            id: "advanced-rose",
            title: "ساخت رز چندلایه",
            duration: "۲۸:۱۵",
            thumbnail: styleImage4,
          },
        ],
      },
      {
        id: "advanced-styling",
        title: "کاربرد در استایل",
        lessons: [
          {
            id: "advanced-hat",
            title: "نصب گل روی کلاه",
            duration: "۱۶:۱۰",
            thumbnail: styleImage1,
          },
          {
            id: "advanced-dress",
            title: "نصب گل روی لباس مجلسی",
            duration: "۲۰:۰۰",
            thumbnail: styleImage2,
          },
        ],
      },
    ],
  },
];

export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function formatPersianDate(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function safeInternalRedirect(value, fallback = "/panel/orders") {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/auth")) return fallback;
  return value;
}

function panelProgressStorageKey(userID) {
  return userID ? `${PANEL_PROGRESS_STORAGE_KEY}:${userID}` : PANEL_PROGRESS_STORAGE_KEY;
}

export function displayUserName(user) {
  return user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "کاربر گلملو";
}

export function defaultAddressId(addresses = []) {
  return addresses.find((address) => address.isDefault)?.id || addresses[0]?.id || "";
}

export function usageLabel(value) {
  return CUSTOM_USAGE_OPTIONS.find((item) => item.value === value)?.label || value || "-";
}

export function orderDisplayTitle(order) {
  if (order?.type === "custom") return "سفارش اختصاصی";
  return order?.productSnapshot?.title || "سفارش گلملو";
}

export function orderCoverImage(order) {
  return order?.productSnapshot?.coverImageUrl || "";
}

export function orderSummaryText(order, fallback = "درخواست شما ثبت شده است.") {
  if (order?.customerNote) return order.customerNote;
  if (order?.usageOtherText) return order.usageOtherText;
  if (order?.usage) return usageLabel(order.usage);
  return fallback;
}

export function getCourseChapters(course) {
  if (!course) return [];
  if (Array.isArray(course.chapters) && course.chapters.length > 0) return course.chapters;

  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  if (lessons.length === 0) return [];

  const chapters = [];
  const chapterById = new Map();
  lessons.forEach((lesson, index) => {
    const chapterTitle = lesson.chapterTitle || "سرفصل‌ها";
    const chapterId = lesson.chapterId || `chapter-${chapterTitle}`;
    if (!chapterById.has(chapterId)) {
      const chapter = {
        id: chapterId,
        title: chapterTitle,
        lessons: [],
      };
      chapterById.set(chapterId, chapter);
      chapters.push(chapter);
    }
    chapterById.get(chapterId).lessons.push({
      ...lesson,
      id: lesson.id || String(index + 1).padStart(2, "0"),
      thumbnail: resolveApiURL(lesson.thumbnail || lesson.imageUrl || lesson.imageURL || course.imageUrl || course.cover),
      videoUrl: resolveApiURL(lesson.videoUrl),
    });
  });

  return chapters;
}

export function getCourseLessons(course) {
  return getCourseChapters(course).flatMap((chapter, chapterIndex) =>
    chapter.lessons.map((lesson, lessonIndex) => ({
      ...lesson,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      chapterNumber: chapterIndex + 1,
      lessonNumber: lessonIndex + 1,
    })),
  );
}

export function normalizeCourseForPanel(course) {
  if (!course) return null;

  return {
    ...course,
    id: course.id,
    accessIds: [course.id, course.slug].filter(Boolean),
    title: course.title || "دوره گلملو",
    subtitle: course.subtitle || course.summary || "",
    cover: resolveApiURL(course.cover || course.imageUrl || course.imageURL || course.image),
    chapters: getCourseChapters(course),
    completedLessonIds: course.completedLessonIds || [],
  };
}

function normalizeCourseAccessIds(value) {
  if (!Array.isArray(value)) return null;

  return new Set(
    value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") return item.id || item.slug || item.courseId;
        return "";
      })
      .filter(Boolean),
  );
}

function getUserCourseAccessIds(user) {
  const fields = [user?.courseAccessIds, user?.courseIds, user?.purchasedCourseIds, user?.courses];

  for (const field of fields) {
    const ids = normalizeCourseAccessIds(field);
    if (ids) return ids;
  }

  return null;
}

function findPanelCourseForPublicCourse(courseOrID) {
  const keys = new Set();
  if (typeof courseOrID === "string") {
    keys.add(courseOrID);
  } else if (courseOrID) {
    [courseOrID.id, courseOrID.slug].filter(Boolean).forEach((key) => keys.add(key));
  }

  return panelCourses.find((course) => [course.id, ...(course.accessIds || [])].some((key) => keys.has(key)));
}

export function userHasPanelCourseAccess(user, course) {
  if (!user || !course) return false;
  if (user.role === "admin") return true;

  const accessIds = getUserCourseAccessIds(user);
  if (!accessIds) return false;

  return [course.id, ...(course.accessIds || [])].some((key) => accessIds.has(key));
}

export function readPanelProgress(userID) {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.localStorage.getItem(panelProgressStorageKey(userID));
    return rawValue ? JSON.parse(rawValue) : {};
  } catch {
    return {};
  }
}

function writePanelProgress(progressByCourse, userID) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(panelProgressStorageKey(userID), JSON.stringify(progressByCourse));
  } catch {
    // Local storage can be unavailable in private contexts; the UI still works in memory.
  }
}

export function normalizePanelProgressRecord(value) {
  if (Array.isArray(value)) {
    return {
      watchedLessonIds: value.filter(Boolean),
      lastLessonId: value[value.length - 1] || "",
      currentTime: 0,
      updatedAt: "",
    };
  }

  if (!value || typeof value !== "object") {
    return {
      watchedLessonIds: [],
      lastLessonId: "",
      currentTime: 0,
      updatedAt: "",
    };
  }

  return {
    watchedLessonIds: Array.isArray(value.watchedLessonIds) ? value.watchedLessonIds.filter(Boolean) : [],
    lastLessonId: value.lastLessonId || "",
    currentTime: Number.isFinite(Number(value.currentTime)) ? Math.max(0, Math.floor(Number(value.currentTime))) : 0,
    updatedAt: value.updatedAt || "",
  };
}

export function getPanelProgressRecord(progressByCourse, courseID) {
  return normalizePanelProgressRecord(progressByCourse?.[courseID]);
}

export function updateStoredPanelProgress(userID, courseID, updater) {
  const current = readPanelProgress(userID);
  const currentRecord = getPanelProgressRecord(current, courseID);
  const nextRecord = updater(currentRecord);
  const next = {
    ...current,
    [courseID]: {
      watchedLessonIds: [...new Set(nextRecord.watchedLessonIds || [])],
      lastLessonId: nextRecord.lastLessonId || "",
      currentTime: Math.max(0, Math.floor(Number(nextRecord.currentTime) || 0)),
      updatedAt: new Date().toISOString(),
    },
  };

  writePanelProgress(next, userID);
  return next;
}

export function getWatchedLessonIds(course, progressByCourse = {}) {
  const record = getPanelProgressRecord(progressByCourse, course.id);

  return new Set([
    ...(course.completedLessonIds || []),
    ...record.watchedLessonIds,
  ]);
}

export function getCourseProgress(course, progressByCourse = {}) {
  const lessons = getCourseLessons(course);
  if (lessons.length === 0) return 0;

  const watchedLessonIds = getWatchedLessonIds(course, progressByCourse);
  const watchedCount = lessons.filter((lesson) => watchedLessonIds.has(lesson.id)).length;
  return Math.round((watchedCount / lessons.length) * 100);
}

export function getCourseStatusLabel(progress) {
  if (progress >= 100) return "تکمیل شده";
  if (progress <= 0) return "شروع دوره";
  return `${toPersianDigits(progress)}٪ دوره را دیده‌اید`;
}

function toLatinDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function durationToSeconds(value, fallback = 600) {
  const normalized = toLatinDigits(value || "").trim();
  const clockMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (clockMatch) {
    const first = Number(clockMatch[1]);
    const second = Number(clockMatch[2]);
    const third = Number(clockMatch[3] || 0);
    return clockMatch[3] ? first * 3600 + second * 60 + third : first * 60 + second;
  }

  const numberMatch = normalized.match(/\d+/);
  if (!numberMatch) return fallback;

  const amount = Number(numberMatch[0]);
  if (normalized.includes("ساعت")) return Math.max(amount * 3600, fallback);
  return Math.max(amount * 60, fallback);
}

export function formatPlaybackTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${toPersianDigits(minutes)}:${toPersianDigits(String(remainingSeconds).padStart(2, "0"))}`;
}

export function usePanelSEO(title) {
  useEffect(() => {
    document.title = `${title} | پنل گلملو`;
    upsertMeta('meta[name="robots"]', { name: "robots", content: "noindex, nofollow" });
  }, [title]);
}


const navItems = [
  { id: "products", label: "گل‌ها" },
  { id: "custom-order", label: "سفارش اختصاصی" },
  { id: "courses", label: "دوره‌های آموزشی" },
  { id: "blogs", label: "مقالات", path: "/blogs" },
  { id: "fabric-flower-guide", label: "راهنمای انتخاب گل", path: "/guides/choose-fabric-flower" },
  { id: "contact", label: "تماس با ما" },
];

function normalizePublicCourse(course) {
  if (!course) return null;

  return {
    ...course,
    imageUrl: resolveApiURL(course.imageUrl || course.imageURL || course.cover),
    imageSources: normalizeImageSources(course.imageSources),
  };
}

function normalizePreparationTimeLabel(value) {
  const normalized = value?.trim();
  if (!normalized) return "پس از بررسی اعلام می‌شود";

  return normalized.replace(/^زمان آماده‌سازی\s*/, "").trim() || normalized;
}

function MelodyLandingPage({ authStatus = "guest", user = null }) {
  usePageSEO(DEFAULT_SEO);
  useJsonLd("golmelo-website-jsonld", {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "گلملو",
        alternateName: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description: DEFAULT_SEO.description,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: "گلملو",
        url: SITE_URL,
        inLanguage: "fa-IR",
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
      },
    ],
  });


  const [heroSlides, setHeroSlides] = useState([]);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [products, setProducts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [contactForm, setContactForm] = useState({
    fullName: "",
    contact: "",
    message: "",
  });
  const [contactStatus, setContactStatus] = useState({ type: "idle", message: "" });
  const scrollRafRef = useRef(null);
  useRestoreScrollPosition(products.length > 0);

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
            sources: normalizeImageSources(item.sources),
          })),
        );
      } catch (error) {
        console.error(error);
      }
    }

    async function loadProducts() {
      try {
        const response = await fetch(apiEndpoint("products"));
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        const nextProducts = Array.isArray(data) ? data : data.products;
        if (!Array.isArray(nextProducts) || cancelled) {
          return;
        }

        const normalizedProducts = nextProducts.map((item) => ({
            ...item,
            coverImageUrl: resolveApiURL(item.coverImageUrl),
            coverImageSources: normalizeImageSources(item.coverImageSources),
          }));
        setProducts([...normalizedProducts]
          .sort((a, b) => {
            const createdAtDifference = (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
            if (createdAtDifference !== 0) return createdAtDifference;
            return Number(b.sortOrder || 0) - Number(a.sortOrder || 0);
          })
          .slice(0, 3));
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
        setCourses((Array.isArray(data.courses) ? data.courses : []).map(normalizePublicCourse).filter(Boolean));
      } catch (error) {
        console.error(error);
      }
    }

    loadHeroSlides();
    loadProducts();
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

    const preload = () => {
      const image = new Image();
      image.decoding = "async";
      const srcSet = responsiveSrcSet(nextSlide.sources);
      if (srcSet) {
        image.srcset = srcSet;
        image.sizes = "100vw";
      }
      image.src = nextSlide.image;
    };
    const idleId = "requestIdleCallback" in window
      ? window.requestIdleCallback(preload, { timeout: 1800 })
      : window.setTimeout(preload, 900);
    return () => {
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
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
      trackEvent("contact_form_submitted", { source: "landing_footer" });
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
  const customOrderPath = "/panel/orders/new?type=custom";
  const customOrderHref = authStatus === "authenticated" && user
    ? customOrderPath
    : `/auth?mode=login&redirect=${encodeURIComponent(customOrderPath)}`;

  return (
    <div dir="rtl" className="min-h-screen bg-alabaster text-charcoal/70">
      <SuccessToast message={successToastMessage} toastKey="contact-success" />

      <SiteNavbar
        navItems={navItems}
        authStatus={authStatus}
        user={user}
        userDisplayName={displayUserName(user)}
        onNavClick={handleNavClick}
        onLogoClick={handleLogoClick}
      />

      <section
        id="hero"
        className="relative isolate scroll-mt-28 overflow-hidden bg-charcoal text-alabaster md:scroll-mt-32"
      >
        <div className="pointer-events-none absolute inset-0">
          {activeHero ? (
            <img
              key={activeHero.id}
              src={activeHero.image}
              srcSet={responsiveSrcSet(activeHero.sources)}
              sizes="100vw"
              alt={activeHero.alt}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="hero-slide-image absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : null}
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 bg-ink-fade" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-vertical-ink-fade" />

        <div className="relative z-20 mx-auto grid min-h-[100svh] max-w-7xl items-end gap-10 px-6 pb-12 pt-32 md:px-8 md:pb-16 lg:px-12">
          <div className="max-w-5xl text-right">
            <p className="mb-5 text-sm font-bold tracking-[0.24em] text-alabaster">GOLMELO ATELIER</p>
            <h1
              className="max-w-3xl text-5xl leading-[1.08] text-alabaster md:text-7xl"
              style={{ textShadow: "0 4px 28px rgb(var(--color-charcoal) / 0.62), 0 1px 2px rgb(var(--color-charcoal) / 0.78)" }}
            >
              گل‌های پارچه‌ای دست‌ساز
              <br />
              برای لباس و اکسسوری
            </h1>
            <p
              className="mt-6 max-w-2xl text-lg leading-9 text-alabaster md:text-xl"
              style={{ textShadow: "0 3px 18px rgb(var(--color-charcoal) / 0.58), 0 1px 2px rgb(var(--color-charcoal) / 0.68)" }}
            >
              گلملو با بیش از یک دهه تجربه، گل‌های پارچه‌ای دست‌ساز را برای لباس و اکسسوری طراحی می‌کند و هنر ساخت آن‌ها را به‌صورت آنلاین آموزش می‌دهد.
            </p>
            <div className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-3 gap-2 sm:gap-3">
              {brandPaths.map((item) => (
                <a
                  key={item.title}
                  href={`#${item.target}`}
                  onClick={handleCtaClick(item.target)}
                  className="group rounded-2xl bg-charcoal/58 px-2 py-3 text-center text-alabaster shadow-soft backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-charcoal/72 sm:px-4 sm:py-4 md:text-right"
                >
                  <span className="block text-xs font-bold leading-6 sm:text-base">{item.title}</span>
                  <span className="mt-1 hidden text-sm leading-7 text-alabaster/82 sm:block">{item.text}</span>
                  <span className="mt-2 inline-flex items-center justify-center gap-1 text-xs font-bold text-alabaster sm:mt-3 sm:gap-2 sm:text-sm">
                    {item.cta}
                    <ChevronLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-1 sm:h-4 sm:w-4" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 -mt-1">
        <section id="products" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24 text-center md:scroll-mt-28 md:px-8 lg:px-12">
          <p className="mb-4 text-sm font-bold tracking-[0.18em] text-charcoal/70">READY TO ORDER</p>
          <h2 className="text-4xl leading-tight text-charcoal md:text-5xl">جدیدترین گل‌های گلملو</h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-charcoal/70">
            محصولاتی آماده ارسال که می‌توانند متناسب با لباس، رنگ و سلیقه شما شخصی‌سازی شوند.
          </p>

          <div className="mt-14 grid grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
            {products.slice(0, 3).map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} showOverlay={false} sizes="33vw" />
            ))}
          </div>
          {products.length === 0 ? (
            <div className="mt-10 text-center text-charcoal/70">
              هنوز محصولی برای سفارش ثبت نشده است.
            </div>
          ) : null}
          {products.length > 0 ? (
            <div className="mt-10">
              <ButtonLink
                to="/products"
                variant="primary"
                size="md"
              >
                مشاهده همه گل‌ها
              </ButtonLink>
            </div>
          ) : null}
        </section>

        <section id="custom-order" className="relative isolate flex min-h-[500px] scroll-mt-24 items-center overflow-hidden md:scroll-mt-28">
          <picture>
            <source media="(max-width: 640px)" srcSet={customOrderBackgroundMobile} type="image/webp" />
            <source srcSet={customOrderBackgroundImage} type="image/webp" />
            <img
              src={customOrderBackgroundFallback}
              alt="پارچه لطیف برای سفارش گل پارچه‌ای اختصاصی"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </picture>
          <div className="absolute inset-0 bg-surface-fade" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20 text-center md:px-8 lg:px-12">
            <p className="mb-4 text-sm font-bold tracking-[0.18em] text-charcoal/70">CUSTOM ORDER</p>
            <h2 className="text-4xl leading-tight text-charcoal md:text-5xl">گلی متناسب با لباس شما</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-9 text-charcoal/70">
              رنگ، اندازه، جنس، نوع اتصال و ترکیب گل‌ها می‌تواند بر اساس لباس، موقعیت استفاده و بودجه شما تغییر کند. پیش از ثبت سفارش، گلملو برای رسیدن به انتخاب مناسب‌تر به شما مشاوره می‌دهد.
            </p>
            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold text-charcoal/70">
              {customOrderOptions.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <ButtonLink
              to={customOrderHref}
              onClick={() => trackEvent("custom_order_started", { order_type: "custom", source: "landing" })}
              variant="primary"
              size="md"
              className="mt-8"
            >
              شروع سفارش اختصاصی
            </ButtonLink>
            <p className="mt-4 text-sm text-charcoal/70">مشاوره پیش از سفارش · تصاویر کاتالوگ از سفارش‌های واقعی</p>
          </div>
        </section>

        <section id="courses" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24 text-center md:scroll-mt-28 md:px-8 lg:px-12">
          <p className="mb-4 text-sm font-bold tracking-[0.18em] text-charcoal/70">ONLINE COURSE</p>
          <h2 className="text-4xl leading-tight text-charcoal md:text-5xl">هنر ساخت گل را یاد بگیرید</h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-charcoal/70">
            دوره‌های آنلاین گلملو، تجربه سال‌ها طراحی و ساخت گل‌های دست‌ساز را در قالب آموزش‌هایی روان، فشرده و مرحله‌به‌مرحله ارائه می‌کنند؛ از اولین گل تا خلق آثاری که می‌توانند فضای اطراف و استایل شما را زیباتر کنند.
          </p>

          {courses.length > 0 ? (
            <CourseSlider courses={courses} statusLabels={COURSE_STATUS_LABELS} />
          ) : (
            <div className="mt-12 text-center text-charcoal/70">
              هنوز دوره‌ای منتشر نشده است.
            </div>
          )}
        </section>

        <section id="usage" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24 text-center md:scroll-mt-28 md:px-8 lg:px-12">
          <p className="mb-4 text-sm font-bold tracking-[0.18em] text-charcoal/70">REAL ORDERS</p>
          <h2 className="text-4xl leading-tight text-charcoal md:text-5xl">از کارگاه گلملو تا لباس مشتریان</h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-charcoal/70">
            تصاویر این مجموعه مربوط به گل‌هایی است که برای سفارش‌های واقعی ساخته شده‌اند و روی لباس مشتریان مورد استفاده قرار گرفته‌اند.
          </p>

          <div className="mx-auto mt-14 grid max-w-6xl grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
            {applications.map((item) => (
              <AppCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="scroll-mt-24 bg-charcoal px-6 py-20 text-center text-alabaster md:scroll-mt-28 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <div>
            <img src={logoImage} alt="نشان گلملو" width="128" height="128" className="mx-auto mb-8 h-10 w-auto object-contain brightness-125" />
            <h2 className="text-4xl leading-tight text-alabaster md:text-5xl">تماس با گلملو</h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-alabaster">
              اگر برای انتخاب گل، سفارش اختصاصی یا دوره آموزشی سؤال دارید، پیام بگذارید تا تیم گلملو برای راهنمایی با شما تماس بگیرد.
            </p>
          </div>
          <form onSubmit={handleContactSubmit} className="mx-auto mt-10 grid max-w-2xl gap-4 text-right">
            <label className="grid gap-2 text-sm font-bold text-alabaster">
              نام و نام خانوادگی (اختیاری)
              <input
                value={contactForm.fullName}
                onChange={handleContactChange("fullName")}
                className="h-12 rounded-2xl border border-alabaster/18 bg-alabaster/10 px-4 text-right text-sm text-alabaster outline-none transition placeholder:text-alabaster/45 focus:border-alabaster/45"
                placeholder="نام شما"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-alabaster">
              شماره تماس
              <input
                value={contactForm.contact}
                onChange={handleContactChange("contact")}
                className="h-12 rounded-2xl border border-alabaster/18 bg-alabaster/10 px-4 text-right text-sm text-alabaster outline-none transition placeholder:text-alabaster/45 focus:border-alabaster/45"
                placeholder="09123456789"
                inputMode="numeric"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-alabaster">
              پیام
              <textarea
                value={contactForm.message}
                onChange={handleContactChange("message")}
                className="min-h-32 rounded-2xl border border-alabaster/18 bg-alabaster/10 px-4 py-3 text-right text-sm leading-7 text-alabaster outline-none transition placeholder:text-alabaster/45 focus:border-alabaster/45"
                placeholder="درباره سفارش، دوره یا مشاوره موردنیازتان بنویسید."
                required
              />
            </label>
            <Button
              type="submit"
              disabled={isSendingContactRequest}
              variant="light"
              size="md"
            >
              {isSendingContactRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSendingContactRequest ? "در حال ارسال" : "ارسال پیام"}
            </Button>
            {contactStatus.type !== "success" ? (
              <p aria-live="polite" className="min-h-6 text-sm text-alabaster" >
                {contactStatus.message}
              </p>
            ) : null}
          </form>
          <nav aria-label="راهنماهای گلملو" className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-alabaster/10 pt-8 text-sm text-alabaster">
            <Link to="/custom-order" className="transition hover:text-alabaster">راهنمای سفارش اختصاصی</Link>
            <Link to="/guides/choose-fabric-flower" className="transition hover:text-alabaster">انتخاب گل مناسب لباس</Link>
            <Link to="/guides/fabric-flower-making-beginners" className="transition hover:text-alabaster">شروع گل‌سازی</Link>
            <Link to="/privacy" className="transition hover:text-alabaster">حریم خصوصی</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function GuideLayout({ title, intro, sections, faqs = [], cta = null, seo, schemaType = "Article", authStatus = "guest", user = null }) {
  usePageSEO(seo);
  useJsonLd("golmelo-article-jsonld", {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${seo.url}#${schemaType.toLowerCase()}`,
    headline: schemaType === "Article" ? title : undefined,
    name: title,
    description: seo.description,
    url: seo.url,
    inLanguage: "fa-IR",
    publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "گلملو" },
  });
  useJsonLd("golmelo-breadcrumb-jsonld", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "گلملو", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: seo.url },
    ],
  });
  useJsonLd("golmelo-faq-jsonld", faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  } : null);

  return (
    <div dir="rtl" className="min-h-screen bg-alabaster text-charcoal/70">
      <SiteNavbar navItems={navItems} authStatus={authStatus} user={user} userDisplayName={displayUserName(user)} />
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-32 text-right md:px-8">
        <article>
          <h1 className="text-4xl leading-tight text-charcoal md:text-6xl">{title}</h1>
          <p className="mt-6 text-lg leading-9 text-charcoal/70 md:text-xl">{intro}</p>
          {sections.map((section) => (
            <section key={section.title} className="mt-12 border-t border-greige pt-10">
              <h2 className="text-3xl text-charcoal">{section.title}</h2>
              {section.body ? <p className="mt-4 text-base leading-8 text-charcoal/70">{section.body}</p> : null}
              {section.items ? (
                <ul className="mt-5 grid gap-3 text-base leading-8 text-charcoal/70">
                  {section.items.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
          {faqs.length > 0 ? (
            <section className="mt-12 border-t border-greige pt-10">
              <h2 className="text-3xl text-charcoal">پرسش‌های متداول</h2>
              <div className="mt-6 grid gap-7">
                {faqs.map((item) => (
                  <div key={item.question}>
                    <h3 className="text-xl text-charcoal">{item.question}</h3>
                    <p className="mt-2 leading-8 text-charcoal/70">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {cta ? <div className="mt-12">{cta}</div> : null}
        </article>
      </main>
      <footer className="bg-charcoal px-6 py-10 text-center text-sm text-alabaster">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          <Link to="/products">گل‌های آماده</Link>
          <Link to="/custom-order">سفارش اختصاصی</Link>
          <Link to="/courses">دوره‌ها</Link>
          <Link to="/privacy">حریم خصوصی</Link>
        </div>
      </footer>
    </div>
  );
}

function CustomOrderGuidePage({ authStatus, user }) {
  const orderPath = "/panel/orders/new?type=custom";
  const target = authStatus === "authenticated" && user
    ? orderPath
    : `/auth?mode=login&redirect=${encodeURIComponent(orderPath)}`;
  return (
    <GuideLayout
      authStatus={authStatus}
      user={user}
      title="سفارش گل پارچه‌ای اختصاصی"
      intro="برای سفارش اختصاصی، کاربرد گل، رنگ و فرم لباس، اندازه، جنس پارچه، نوع اتصال و بودجه را مشخص می‌کنید. گلملو پیش از ثبت نهایی سفارش، جزئیات و قیمت متناسب با انتخاب شما را بررسی می‌کند."
      seo={{ title: "سفارش گل پارچه‌ای اختصاصی | گلملو", description: "راهنمای سفارش گل پارچه‌ای اختصاصی متناسب با لباس، رنگ، اندازه، کاربرد و بودجه همراه با مشاوره پیش از سفارش گلملو.", url: `${SITE_URL}/custom-order` }}
      sections={[
        { title: "چه چیزهایی قابل شخصی‌سازی است؟", items: ["رنگ و ترکیب رنگ متناسب با لباس", "اندازه، تعداد و ترکیب چند گل", "جنس پارچه و نوع گل", "نوع اتصال برای یقه، سرشانه، کلاه، مو یا اکسسوری", "جزئیات نهایی متناسب با کاربرد و بودجه"] },
        { title: "فرایند سفارش", items: ["ایجاد حساب یا ورود به پنل", "انتخاب کاربرد، رنگ، تعداد و آدرس تحویل", "افزودن توضیحات و حداکثر پنج تصویر مرجع", "بررسی درخواست و مشاوره گلملو", "تایید جزئیات، ساخت و پیگیری وضعیت تا تحویل"] },
      ]}
      faqs={[
        { question: "آیا قیمت نهایی با قیمت پایه فرق می‌کند؟", answer: "بله. تغییر اندازه، جنس، تعداد و جزئیات شخصی‌سازی می‌تواند قیمت نهایی را تغییر دهد و مبلغ پس از بررسی اعلام می‌شود." },
        { question: "آیا می‌توانم عکس لباس را ارسال کنم؟", answer: "بله. در فرم سفارش می‌توانید تصاویر مرجع لباس، رنگ یا مدل مشابه را اضافه کنید." },
      ]}
      cta={<ButtonLink to={target} onClick={() => trackEvent("custom_order_started", { order_type: "custom", source: "custom_order_guide" })} variant="primary" size="lg">شروع سفارش اختصاصی</ButtonLink>}
    />
  );
}

function ChooseFabricFlowerGuidePage({ authStatus, user }) {
  return (
    <GuideLayout
      authStatus={authStatus}
      user={user}
      title="انتخاب گل پارچه‌ای مناسب لباس"
      intro="گل مناسب باید با مقیاس لباس، محل نصب، جنس پارچه و موقعیت استفاده هماهنگ باشد. برای لباس‌های مینیمال می‌توان از یک گل شاخص استفاده کرد و برای لباس‌های پرجزئیات، فرم ظریف‌تر معمولاً انتخاب متعادل‌تری است."
      seo={{ title: "راهنمای انتخاب گل پارچه‌ای برای لباس | گلملو", description: "انتخاب گل پارچه‌ای مناسب مانتو، کت و لباس مجلسی بر اساس رنگ، اندازه، محل اتصال و فرم لباس.", url: `${SITE_URL}/guides/choose-fabric-flower` }}
      sections={[
        { title: "رنگ و کنتراست", body: "گل می‌تواند همرنگ لباس و بافت‌محور باشد یا به‌عنوان نقطه تمرکز، کنتراست کنترل‌شده ایجاد کند. رنگ عکس لباس را در نور طبیعی بررسی کنید." },
        { title: "اندازه و محل اتصال", items: ["یقه و کت: گل متوسط با اتصال محکم", "سرشانه و لباس مجلسی: فرم متناسب با خط برش لباس", "کلاه و مو: وزن کم و اتصال مناسب حرکت", "کیف و اکسسوری: مقاومت بیشتر در برابر تماس"] },
      ]}
      faqs={[
        { question: "برای لباس طرح‌دار چه گلی مناسب است؟", answer: "معمولاً فرم ساده‌تر و رنگی برگرفته از یکی از رنگ‌های فرعی لباس، ظاهر منسجم‌تری ایجاد می‌کند." },
        { question: "اگر مدل مناسب را ندانم چه کنم؟", answer: "از کاتالوگ برای ایده‌گرفتن استفاده کنید و سپس عکس لباس و کاربرد را در سفارش اختصاصی بفرستید تا پیش از ثبت نهایی مشاوره بگیرید." },
      ]}
      cta={<ButtonLink to="/products" variant="primary" size="lg">دیدن گل‌های آماده</ButtonLink>}
    />
  );
}

function BeginnerGuidePage({ authStatus, user }) {
  return (
    <GuideLayout
      authStatus={authStatus}
      user={user}
      title="شروع گل‌سازی پارچه‌ای برای مبتدیان"
      intro="برای شروع به ابزار زیاد نیاز ندارید. شناخت پارچه، برش دقیق، فرم‌دهی، اتصال لایه‌ها و اجرای یک مدل ساده، پایه‌ای است که می‌توانید مرحله‌به‌مرحله روی آن مهارت بسازید."
      seo={{ title: "شروع گل‌سازی پارچه‌ای برای مبتدیان | گلملو", description: "راهنمای ابزار، پارچه و مسیر شروع یادگیری گل‌سازی پارچه‌ای برای هنرجویان مبتدی.", url: `${SITE_URL}/guides/fabric-flower-making-beginners` }}
      sections={[
        { title: "ابزار و متریال پایه", items: ["قیچی دقیق و الگوی اولیه", "نخ، سوزن، چسب مناسب و سیم گل‌سازی", "پارچه متناسب با مدل مانند ساتن، حریر یا مخمل", "جزئیات تزئینی بر اساس طرح"] },
        { title: "مسیر یادگیری", body: "از یک فرم ساده شروع کنید، کنترل برش و لایه‌سازی را تمرین کنید و سپس به مدل‌هایی بروید که حجم‌دهی و جزئیات بیشتری دارند. دوره‌های گلملو همین مسیر را از آسان به پیچیده سازمان می‌دهند." },
      ]}
      faqs={[
        { question: "آیا برای شروع باید خیاطی بلد باشم؟", answer: "خیر. آشنایی پایه با نخ و سوزن کمک‌کننده است اما مسیر مقدماتی می‌تواند از سطح مبتدی آغاز شود." },
        { question: "از کدام دوره شروع کنم؟", answer: "سطح، پیش‌نیاز و سرفصل هر دوره در صفحه جزئیات آن نوشته شده است؛ دوره مقدماتی برای شروع مرحله‌به‌مرحله مناسب‌تر است." },
      ]}
      cta={<ButtonLink to="/courses" variant="primary" size="lg">دیدن دوره‌های آنلاین</ButtonLink>}
    />
  );
}

function PrivacyPage({ authStatus, user }) {
  return (
    <GuideLayout
      authStatus={authStatus}
      user={user}
      title="حریم خصوصی"
      schemaType="WebPage"
      intro="گلملو فقط اطلاعات لازم برای حساب کاربری، پاسخ‌گویی به پیام‌ها، مدیریت سفارش و بهبود عملکرد سایت را پردازش می‌کند."
      seo={{ title: "حریم خصوصی | گلملو", description: "نحوه استفاده از اطلاعات فرم‌ها، حساب کاربری و داده‌های آماری در گلملو.", url: `${SITE_URL}/privacy` }}
      sections={[
        { title: "اطلاعات حساب و سفارش", body: "شماره تلفن، اطلاعات پروفایل، آدرس‌های ثبت‌شده و جزئیات سفارش برای ارائه خدمات پنل، پیگیری و تحویل استفاده می‌شوند و در Analytics ارسال نمی‌شوند." },
        { title: "فرم تماس", body: "شماره تماس و متن پیام برای پاسخ‌گویی ذخیره می‌شوند. نام در فرم تماس اختیاری است." },
        { title: "آمار ناشناس سایت", body: "در صورت فعال‌بودن Google Analytics، pageview و رویدادهای ازپیش‌تعریف‌شده بدون نام، تلفن، آدرس یا متن آزاد ثبت می‌شوند." },
      ]}
    />
  );
}

function NotFoundPage({ authStatus, user }) {
  usePageSEO({ title: "صفحه پیدا نشد | گلملو", description: "صفحه موردنظر در گلملو پیدا نشد.", url: `${SITE_URL}/not-found`, robots: "noindex, nofollow" });
  return (
    <div dir="rtl" className="min-h-screen bg-alabaster text-charcoal/70">
      <SiteNavbar navItems={navItems} authStatus={authStatus} user={user} userDisplayName={displayUserName(user)} />
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-sm font-bold text-charcoal/70">404</p>
          <h1 className="mt-3 text-4xl text-charcoal md:text-5xl">صفحه پیدا نشد</h1>
          <p className="mt-4 text-charcoal/70">آدرس واردشده وجود ندارد یا دیگر در دسترس نیست.</p>
          <ButtonLink to="/" variant="primary" size="md" className="mt-7">بازگشت به گلملو</ButtonLink>
        </div>
      </main>
    </div>
  );
}

function ProductsPage({ authStatus = "guest", user = null }) {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const location = useLocation();
  const navigate = useNavigate();
  const filters = useMemo(() => parseProductFilterHash(location.hash), [location.hash]);
  const filteredProducts = useMemo(
    () => products.filter((product) => productMatchesFilters(product, filters)),
    [filters, products],
  );
  useRestoreScrollPosition(status.type !== "loading");

  usePageSEO({
    title: "گل پارچه‌ای دست‌ساز | گل لباس، گل فشن و سفارش اختصاصی",
    description: "خرید و سفارش گل پارچه‌ای دست‌ساز برای لباس مجلسی، کت، مانتو، لباس عروس، کلاه و اکسسوری مو؛ با فیلتر کاربرد، تکنیک، جنس، اندازه، ویژگی و نوع اتصال.",
    url: `${SITE_URL}/products`,
  });
  useJsonLd("golmelo-breadcrumb-jsonld", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "گلملو", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "محصولات", item: `${SITE_URL}/products` },
    ],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setStatus({ type: "loading", message: "" });
      try {
        const data = await apiRequest("products");
        if (cancelled) return;
        setProducts(
          sortProductsNewestFirst((data.products || []).map((product) => ({
            ...product,
            coverImageUrl: resolveApiURL(product.coverImageUrl),
            coverImageSources: normalizeImageSources(product.coverImageSources),
          }))),
        );
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filters.query.trim() || status.type !== "idle") return undefined;
    const timeout = window.setTimeout(() => {
      trackEvent("product_search_used", {
        query_length: filters.query.trim().length,
        result_count: filteredProducts.length,
        source: "catalog",
      });
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [filteredProducts.length, filters.query, status.type]);

  const setFilters = useCallback((nextFilters, replace = false) => {
    navigate(
      { pathname: "/products", hash: serializeProductFilterHash(nextFilters) },
      { replace, state: location.state },
    );
  }, [location.state, navigate]);

  const handleQueryChange = useCallback((query) => {
    setFilters({ ...filters, query }, true);
  }, [filters, setFilters]);

  const handleFilterToggle = useCallback((field, value) => {
    const selected = filters[field] || [];
    const nextValues = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    setFilters({ ...filters, [field]: nextValues });
    trackEvent("product_filter_applied", {
      filter_type: field,
      filter_value: value,
      source: "catalog",
    });
  }, [filters, setFilters]);

  const handleFilterReset = useCallback(() => {
    setFilters({ ...EMPTY_PRODUCT_FILTERS });
    trackEvent("product_filters_cleared", { source: "catalog" });
  }, [setFilters]);

  return (
    <div dir="rtl" className="min-h-screen bg-alabaster text-charcoal/70">
      <SiteNavbar navItems={navItems} authStatus={authStatus} user={user} userDisplayName={displayUserName(user)} />
      <main className="mx-auto max-w-7xl px-6 pb-20 pt-32 md:px-8 lg:px-12">
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <h1 className="text-4xl leading-tight text-charcoal md:text-5xl">گل پارچه‌ای دست‌ساز | گل لباس، گل فشن و سفارش اختصاصی</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-charcoal/70">
            گل‌های پارچه‌ای گلملو را برای لباس مجلسی، کت، مانتو، لباس عروس، کلاه و اکسسوری مو ببینید و بر اساس کاربرد، تکنیک، جنس، اندازه، ویژگی و نوع اتصال انتخاب کنید.
          </p>
        </div>

        {status.type === "loading" ? (
          <div className="rounded-[28px] bg-alabaster/70 p-8 text-center text-charcoal/70">در حال بارگذاری محصولات...</div>
        ) : null}
        {status.type === "error" ? (
          <div className="rounded-[28px] border border-rosewood/40 bg-alabaster p-8 text-center text-charcoal/70">{status.message}</div>
        ) : null}
        {status.type !== "loading" && products.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-greige bg-alabaster/60 p-8 text-center text-charcoal/70">
            هنوز محصولی ثبت نشده است.
          </div>
        ) : null}

        {status.type === "idle" && products.length > 0 ? (
          <ProductFilters
            products={products}
            filters={filters}
            resultCount={filteredProducts.length}
            onQueryChange={handleQueryChange}
            onToggle={handleFilterToggle}
            onReset={handleFilterReset}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {filteredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} showOverlay={false} />
          ))}
        </div>
        {status.type === "idle" && products.length > 0 && filteredProducts.length === 0 ? (
          <div className="py-14 text-center text-charcoal/70">
            <p className="text-lg font-bold text-charcoal/70">محصولی با این مشخصات پیدا نشد.</p>
            <button type="button" onClick={handleFilterReset} className="mt-4 text-sm font-bold text-charcoal/70">نمایش همه محصولات</button>
          </div>
        ) : null}

        <section className="mx-auto mt-20 max-w-3xl border-t border-greige pt-10 text-center">
          <h2 className="text-2xl text-charcoal md:text-3xl">انتخاب گل پارچه‌ای مناسب لباس</h2>
          <p className="mt-4 text-sm leading-8 text-charcoal/70 md:text-base">
            گل لباس می‌تواند بر اساس فرم لباس، محل نصب و جنس پارچه به‌صورت آماده یا اختصاصی انتخاب شود. مدل‌های کریشه، فشن، استامپ‌ورک و گل‌های سه‌بعدی هرکدام ظاهر متفاوتی ایجاد می‌کنند و امکان شخصی‌سازی رنگ، اندازه و متریال برای محصولات مشخص‌شده وجود دارد.
          </p>
          <ButtonLink to="/custom-order" variant="primary" size="md" className="mt-6">شروع سفارش اختصاصی</ButtonLink>
        </section>
      </main>
    </div>
  );
}

function CoursesPage({ authStatus = "guest", user = null }) {
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "" });

  usePageSEO({
    title: "دوره‌های آموزش گلملو | آموزش گل‌سازی پارچه‌ای",
    description: "دوره‌های آموزش گل‌سازی پارچه‌ای گلملو با جزئیات سرفصل‌ها، وضعیت انتشار و مسیر درخواست متناسب با هر دوره.",
    url: `${SITE_URL}/courses`,
  });
  useJsonLd("golmelo-breadcrumb-jsonld", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "گلملو", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "دوره‌ها", item: `${SITE_URL}/courses` },
    ],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setStatus({ type: "loading", message: "" });
      try {
        const data = await apiRequest("courses");
        if (cancelled) return;

        setCourses((Array.isArray(data?.courses) ? data.courses : []).map(normalizePublicCourse).filter(Boolean));
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-alabaster text-charcoal/70">
      <SiteNavbar navItems={navItems} authStatus={authStatus} user={user} userDisplayName={displayUserName(user)} />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-8 lg:px-12">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h1 className="text-4xl leading-tight text-charcoal md:text-5xl">دوره‌های گلملو</h1>
          <p className="mt-4 text-base leading-8 text-charcoal/70 md:text-lg">
            هر دوره را جداگانه ببینید، جزئیات آموزش‌ها را بررسی کنید و وضعیت انتشار یا ثبت‌نام را از صفحه همان دوره دنبال کنید.
          </p>
        </div>

        {status.type === "loading" ? (
          <div className="rounded-[28px] bg-alabaster/70 p-8 text-center text-charcoal/70">در حال بارگذاری دوره‌ها...</div>
        ) : null}
        {status.type === "error" ? (
          <div className="rounded-[28px] border border-rosewood/40 bg-alabaster p-8 text-center text-charcoal/70">{status.message}</div>
        ) : null}
        {status.type !== "loading" && courses.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-greige bg-alabaster/60 p-8 text-center text-charcoal/70">
            هنوز دوره‌ای منتشر نشده است.
          </div>
        ) : null}

        {courses.length > 0 ? (
          <div className="grid gap-6">
            {courses.map((course) => (
              <CoursePreviewCard key={course.id} course={course} statusLabels={COURSE_STATUS_LABELS} />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ProductDetailPage({ authStatus = "guest", user = null }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const isAuthenticated = authStatus === "authenticated" && user;
  const orderPath = product ? `/panel/orders/new?productId=${encodeURIComponent(product.id)}` : "/panel/orders/new";
  const authPath = `/auth?mode=login&redirect=${encodeURIComponent(orderPath)}`;
  const productBackTarget = getProductBackTarget(location.state);
  const productBackState = getProductBackState(location.state);
  const detailUseCases = productLabels(product, "useCases");
  const detailTechniques = productLabels(product, "techniques");
  const detailMaterials = productLabels(product, "materials");
  const detailColors = productLabels(product, "colors");
  const detailFeatures = productLabels(product, "features");
  const detailAttachmentTypes = productLabels(product, "attachmentTypes");
  const detailDiameter = formatProductDiameter(product?.diameterCm);
  const customizationLabels = product ? [
    product.customizableColor ? "رنگ" : "",
    product.customizableSize ? "اندازه" : "",
    product.customizableMaterial ? "جنس" : "",
  ].filter(Boolean) : [];
  const productImages = product?.images?.length
    ? product.images
    : product?.coverImageUrl
      ? [{ id: product.coverImageId || "cover", url: product.coverImageUrl, sources: product.coverImageSources, alt: product.title }]
      : [];

  usePageSEO({
    title: product ? product.seoTitle || `${product.title} | محصول قابل سفارش گلملو` : "محصول قابل سفارش گلملو",
    description: product?.seoDescription || product?.shortDescription || "جزئیات محصول قابل سفارش گلملو و ثبت درخواست سفارش از پنل مشتری.",
    url: `${SITE_URL}/products/${product?.slug || id}`,
    image: product?.coverImageUrl || DEFAULT_SEO.image,
    type: "product",
  });
  const productOffer = product?.basePriceRial > 0 ? {
    "@type": "Offer",
    "@id": `${SITE_URL}/products/${product.slug || id}#offer`,
    price: product.basePriceRial,
    priceCurrency: product.priceCurrency || "IRR",
    availability: product.availability === "out_of_stock"
      ? "https://schema.org/OutOfStock"
      : product.availability === "made_to_order"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    url: `${SITE_URL}/products/${product.slug || id}`,
  } : undefined;
  useJsonLd(product ? "golmelo-product-jsonld" : "golmelo-product-jsonld-empty", product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/products/${product.slug || id}#product`,
    name: product.title,
    description: product.description || product.shortDescription,
    image: productImages.length ? productImages.map((image) => image.url) : [DEFAULT_SEO.image],
    url: `${SITE_URL}/products/${product.slug || id}`,
    sku: product.id,
    material: detailMaterials.length ? detailMaterials.join("، ") : undefined,
    color: detailColors.length ? detailColors.join("، ") : undefined,
    size: detailDiameter || undefined,
    brand: {
      "@type": "Brand",
      name: "گلملو",
    },
    offers: productOffer,
    additionalProperty: [
      !detailUseCases.length && product.usageLabel ? { "@type": "PropertyValue", name: "کاربرد", value: product.usageLabel } : null,
      detailUseCases.length ? { "@type": "PropertyValue", name: "کاربردهای پیشنهادی", value: detailUseCases.join("، ") } : null,
      detailTechniques.length ? { "@type": "PropertyValue", name: "تکنیک", value: detailTechniques.join("، ") } : null,
      detailFeatures.length ? { "@type": "PropertyValue", name: "ویژگی", value: detailFeatures.join("، ") } : null,
      detailAttachmentTypes.length ? { "@type": "PropertyValue", name: "نوع اتصال", value: detailAttachmentTypes.join("، ") } : null,
      detailDiameter ? { "@type": "PropertyValue", name: "قطر", value: detailDiameter, unitCode: "CMT" } : null,
      { "@type": "PropertyValue", name: "جواهردوزی", value: product.hasJewelryEmbroidery ? "دارد" : "ندارد" },
      product.preparationTime ? { "@type": "PropertyValue", name: "زمان آماده‌سازی", value: normalizePreparationTimeLabel(product.preparationTime) } : null,
      { "@type": "PropertyValue", name: "سفارشی‌سازی", value: customizationLabels.length ? customizationLabels.join("، ") : product.isCustomizable ? "قابل سفارش اختصاصی" : "ثابت" },
    ].filter(Boolean),
  } : null);
  useJsonLd(product ? "golmelo-breadcrumb-jsonld" : "golmelo-breadcrumb-jsonld-empty", product ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "گلملو", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "محصولات", item: `${SITE_URL}/products` },
      { "@type": "ListItem", position: 3, name: product.title, item: `${SITE_URL}/products/${product.slug || id}` },
    ],
  } : null);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setStatus({ type: "loading", message: "" });
      try {
        const [data, listData] = await Promise.all([
          apiRequest(`products/${id}`),
          apiRequest("products"),
        ]);
        if (cancelled) return;
        const nextProduct = {
          ...data.product,
          coverImageUrl: resolveApiURL(data.product?.coverImageUrl),
          coverImageSources: normalizeImageSources(data.product?.coverImageSources),
          images: (data.product?.images || []).map((image) => ({
            ...image,
            url: resolveApiURL(image.url),
            sources: normalizeImageSources(image.sources),
          })),
        };
        setProduct(nextProduct);
        setRelatedProducts((listData.products || [])
          .filter((item) => item.id !== nextProduct.id)
          .sort((a, b) => Number(b.category === nextProduct.category) - Number(a.category === nextProduct.category))
          .slice(0, 3)
          .map((item) => ({
            ...item,
            coverImageUrl: resolveApiURL(item.coverImageUrl),
            coverImageSources: normalizeImageSources(item.coverImageSources),
          })));
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled && error.status === 404) {
          navigate("/not-found", { replace: true });
          return;
        }
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!product?.id) return;
    trackEvent("product_viewed", { product_id: product.id, content_type: "product" });
  }, [product?.id]);

  if (status.type === "loading") {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-alabaster text-charcoal/70">
        در حال بارگذاری محصول...
      </div>
    );
  }

  if (!product) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-alabaster px-6 text-center text-charcoal/70">
        <div>
          <p>{status.message || "محصول پیدا نشد."}</p>
          <ButtonLink to={productBackTarget} state={productBackState} variant="primary" size="md" className="mt-4">بازگشت به محصولات</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-alabaster text-charcoal/70">
      <SiteNavbar navItems={navItems} authStatus={authStatus} user={user} userDisplayName={displayUserName(user)} />
      <main className="mx-auto max-w-7xl px-6 pb-20 pt-32 md:px-8 lg:px-12">
        <nav aria-label="مسیر صفحه" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-charcoal/70">
          <Link to="/">گلملو</Link>
          <ChevronLeft className="h-4 w-4" />
          <Link to="/products">محصولات</Link>
          <ChevronLeft className="h-4 w-4" />
          <span aria-current="page">{product.title}</span>
        </nav>
        <section className="grid gap-8 rounded-[34px] border border-greige bg-alabaster p-5 shadow-soft md:grid-cols-[0.95fr_1.05fr] md:p-8">
          <ProductGallery images={productImages} title={product.title} />
          <div className="flex flex-col justify-center text-right">
            <p className="text-sm font-bold text-charcoal/70">{product.category || "محصول قابل سفارش"}</p>
            <h1 className="mt-3 text-4xl leading-tight text-charcoal md:text-5xl">{product.title}</h1>
            <p className="mt-5 text-lg leading-9 text-charcoal/70">{product.description || product.shortDescription}</p>

            <dl className="mt-5 grid gap-x-5 gap-y-3 rounded-2xl border border-greige bg-alabaster/80 p-4 text-sm text-charcoal/70 sm:grid-cols-2">
              {[
                ["قیمت پایه", productPriceLabel(product)],
                ["موجودی", PRODUCT_AVAILABILITY_LABELS[product.availability] || "در حال بررسی"],
                ["زمان آماده‌سازی", product.preparationDays > 0 ? `${toPersianDigits(product.preparationDays)} روز کاری` : normalizePreparationTimeLabel(product.preparationTime)],
                ["کاربرد", detailUseCases.join("، ") || product.usageLabel || "سفارشی"],
                ["تکنیک", detailTechniques.join("، ") || "در حال تکمیل"],
                ["جنس", detailMaterials.join("، ") || "در حال تکمیل"],
                ["ویژگی", detailFeatures.join("، ") || "در حال تکمیل"],
                ["نوع اتصال", detailAttachmentTypes.join("، ") || "در حال تکمیل"],
                ["جواهردوزی", product.hasJewelryEmbroidery ? "دارد" : "ندارد"],
                ["رنگ", detailColors.join("، ") || "در حال تکمیل"],
                ["اندازه", detailDiameter || "در حال تکمیل"],
                ["سفارشی‌سازی", customizationLabels.length ? customizationLabels.join("، ") : product.isCustomizable ? "قابل سفارش اختصاصی" : "ثابت"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-greige pb-2 last:border-b-0 last:pb-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-last-child(-n+2)]:pb-0">
                  <dt className="shrink-0 text-xs text-charcoal/70">{label}</dt>
                  <dd className="text-left text-sm font-bold leading-6 text-charcoal/70">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              {product.availability !== "out_of_stock" ? (
                <ButtonLink
                  to={isAuthenticated ? orderPath : authPath}
                  variant="primary"
                  size="md"
                >
                  ثبت سفارش
                </ButtonLink>
              ) : null}
              <Link
                to={productBackTarget}
                state={productBackState}
                className="inline-flex h-12 items-center justify-center rounded-full border border-greige bg-alabaster px-6 text-sm font-bold text-charcoal/70 transition hover:border-rosewood/50 hover:text-rosewood"
              >
                بازگشت به محصولات
              </Link>
            </div>
            <p className="mt-4 text-sm leading-7 text-charcoal/70">
              قیمت نمایش‌داده‌شده پایه است و پس از انتخاب رنگ، اندازه، جنس و جزئیات شخصی‌سازی ممکن است تغییر کند. مشاوره پیش از ثبت نهایی سفارش انجام می‌شود.
            </p>
          </div>
        </section>
        {relatedProducts.length > 0 ? (
          <section className="py-16 text-center">
            <h2 className="text-3xl text-charcoal md:text-4xl">گل‌های مشابه</h2>
            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
              {relatedProducts.map((item, index) => (
                <ProductCard key={item.id} product={item} index={index} showOverlay={false} sizes="33vw" />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function CourseAccessPanel({ course, coursePath, authStatus = "guest", user = null }) {
  const panelCourse = findPanelCourseForPublicCourse(course) || normalizeCourseForPanel(course);
  const hasAccess = authStatus === "authenticated" && userHasPanelCourseAccess(user, panelCourse);
  const [courseStatus, setCourseStatus] = useState({ type: "idle", message: "" });
  const [hasRequested, setHasRequested] = useState(false);
  const isSubmitting = courseStatus.type === "loading";
  const successToastMessage = courseStatus.type === "success" ? courseStatus.message : "";
  const loginPath = `/auth?mode=login&redirect=${encodeURIComponent(`/courses/${coursePath}`)}`;
  const panelPath = panelCourse ? `/panel/courses/${panelCourse.id}` : "/panel/courses";
  const requestType = ["recording", "in_production"].includes(course?.status)
    ? "notification"
    : course?.status === "sold_out"
      ? "waitlist"
      : course?.status === "for_sale" ? "purchase" : "";
  const requestCopy = requestType === "notification"
    ? {
      title: "اطلاع از زمان انتشار",
      description: "درخواست اطلاع‌رسانی را ثبت کنید تا پس از آماده‌شدن دوره با شما تماس بگیریم.",
      button: "اطلاع از زمان انتشار",
      success: "درخواست اطلاع‌رسانی ثبت شد.",
    }
    : requestType === "waitlist"
      ? {
        title: "عضویت در فهرست انتظار",
        description: "ظرفیت فعلی تکمیل است. برای اطلاع از ظرفیت بعدی در فهرست انتظار عضو شوید.",
        button: "عضویت در فهرست انتظار",
        success: "عضویت شما در فهرست انتظار ثبت شد.",
      }
      : {
        title: "درخواست خرید این دوره",
        description: "درخواست خرید را ثبت کنید تا تیم گلملو برای هماهنگی و فعال‌سازی دوره با شما تماس بگیرد.",
        button: "ثبت درخواست خرید دوره",
        success: "درخواست خرید دوره ثبت شد.",
      };

  useEffect(() => {
    if (authStatus !== "authenticated" || !course?.id || !requestType) {
      setHasRequested(false);
      return undefined;
    }
    let cancelled = false;
    apiRequest("me/course-signups")
      .then((data) => {
        if (cancelled) return;
        setHasRequested((data.courseSignups || []).some((item) => item.courseId === course.id && item.requestType === requestType));
      })
      .catch(() => {
        if (!cancelled) setHasRequested(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, course?.id, requestType]);

  useEffect(() => {
    if (courseStatus.type !== "success") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCourseStatus({ type: "idle", message: "" });
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [courseStatus.type]);

  const handleCourseRequest = async () => {
    if (!requestType) return;
    setCourseStatus({ type: "loading", message: "در حال ثبت درخواست..." });

    try {
      await apiRequest("course-signups", {
        method: "POST",
        body: JSON.stringify({ courseId: course?.id }),
      });
      setHasRequested(true);
      trackEvent("course_request_submitted", { course_id: course.id, course_status: course.status, request_type: requestType });
      setCourseStatus({ type: "success", message: requestCopy.success });
    } catch (error) {
      console.error(error);
      setCourseStatus({ type: "error", message: "ثبت درخواست انجام نشد. دوباره تلاش کنید." });
    }
  };

  let content;

  if (authStatus === "checking") {
    content = (
      <>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-charcoal/70" />
        <h3 className="mt-4 text-2xl text-charcoal">در حال بررسی حساب کاربری</h3>
      </>
    );
  } else if (hasAccess) {
    const progressRecord = getPanelProgressRecord(readPanelProgress(user?.id), panelCourse.id);
    const hasResumePoint = progressRecord.lastLessonId && progressRecord.currentTime > 0;
    content = (
      <>
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-alabaster text-charcoal/70">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl text-charcoal">این دوره در پنل شما فعال است</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-charcoal/70">
          {hasResumePoint
            ? `ادامه دوره از آخرین محل تماشا، حدود ${formatPlaybackTime(progressRecord.currentTime)}، باز می‌شود.`
            : "از پنل کاربری وارد دوره شوید و آموزش‌ها را از همان‌جا دنبال کنید."}
        </p>
        <ButtonLink
          to={panelPath}
          variant="primary"
          size="lg"
          className="mt-6"
        >
          <MonitorPlay className="h-4 w-4" />
          مشاهده دوره در پنل کاربری
        </ButtonLink>
      </>
    );
  } else if (!requestType) {
    content = (
      <>
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-alabaster text-charcoal/70">
          <BookOpen className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl text-charcoal">ثبت درخواست این دوره فعلاً فعال نیست</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-charcoal/70">
          وضعیت انتشار و امکان ثبت درخواست از همین صفحه اعلام می‌شود.
        </p>
      </>
    );
  } else if (authStatus === "authenticated" && user) {
    content = (
      <>
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-alabaster text-charcoal/70">
          <BookOpen className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl text-charcoal">{requestCopy.title}</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-charcoal/70">
          {requestCopy.description}
        </p>
        <Button
          onClick={handleCourseRequest}
          disabled={isSubmitting || hasRequested}
          variant="primary"
          size="lg"
          className="mt-6"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {hasRequested ? "درخواست شما ثبت شده است" : isSubmitting ? "در حال ثبت" : requestCopy.button}
        </Button>
      </>
    );
  } else {
    content = (
      <>
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-alabaster text-charcoal/70">
          <User className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl text-charcoal">برای ادامه وارد شوید</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-charcoal/70">
          بعد از ورود یا ساخت حساب، به همین صفحه برمی‌گردید و می‌توانید {requestCopy.title} را ثبت کنید.
        </p>
        <ButtonLink
          to={loginPath}
          variant="primary"
          size="lg"
          className="mt-6"
        >
          <User className="h-4 w-4" />
          ورود | ثبت‌نام
        </ButtonLink>
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-greige bg-alabaster/70 p-6 text-center shadow-soft">
      <SuccessToast message={successToastMessage} toastKey="course-signup-success" />
      {content}

      {courseStatus.type !== "success" ? (
        <p
          aria-live="polite"
          className={`mx-auto mt-4 max-w-xl text-sm ${courseStatus.type === "error" ? "text-rosewood" : "text-charcoal/70"
            }`}
        >
          {courseStatus.message || (hasRequested ? "این درخواست قبلاً برای حساب شما ثبت شده است." : "")}
        </p>
      ) : null}
    </div>
  );
}

function LessonCard({ lesson }) {
  return (
    <article
      className="relative overflow-hidden rounded-[32px] border border-greige bg-alabaster shadow-soft md:min-h-[420px]"
    >
      <div className="relative h-64 overflow-hidden bg-alabaster md:hidden">
        <CourseVisual
          imageUrl={lesson.imageUrl}
          imageSources={lesson.imageSources}
          sizes="100vw"
          title={lesson.title}
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 hidden md:block">
        <CourseVisual imageUrl={lesson.imageUrl} imageSources={lesson.imageSources} sizes="(min-width: 1024px) 980px, 86vw" title={lesson.title} />
      </div>
      <div className="absolute inset-0 hidden bg-surface-fade md:block" />
      <div className="absolute inset-y-0 left-0 hidden bg-surface-fade md:block md:w-[72%]" />

      <div className="relative z-10 p-5 md:flex md:min-h-[420px] md:items-center md:py-8 md:pl-5 md:pr-8 lg:py-10 lg:pl-6 lg:pr-10">
        <div className="mr-auto w-full max-w-xl text-right md:w-[46%]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-charcoal/70">
              <span className="rounded-full bg-alabaster px-3 py-1 text-xs tracking-[0.16em] text-charcoal/70">{lesson.id}</span>
              {lesson.level ? (
                <span className="rounded-full bg-alabaster px-3 py-1 text-xs text-charcoal/70">{lesson.level}</span>
              ) : null}
              {lesson.type ? (
                <span className="rounded-full bg-alabaster px-3 py-1 text-xs text-charcoal/70">{lesson.type}</span>
              ) : null}
              {lesson.duration ? (
                <span className="rounded-full bg-alabaster px-3 py-1 text-xs text-charcoal/70">{lesson.duration}</span>
              ) : null}
            </div>
          </div>

          <h3 className="mt-5 text-3xl leading-tight text-charcoal">گل {lesson.title}</h3>
          <p className="mt-4 max-w-lg text-base leading-8 text-charcoal/70">{lesson.summary}</p>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {(lesson.materials || []).map((item) => (
              <MaterialPill key={item}>{item}</MaterialPill>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function CourseDetailPage({ authStatus = "guest", user = null }) {
  const { id } = useParams();
  const navigate = useNavigate();
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
    "@id": `${SITE_URL}/courses/${coursePath}#course`,
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
    offers: course.basePriceRial > 0 && course.status === "for_sale" ? {
      "@type": "Offer",
      price: course.basePriceRial,
      priceCurrency: course.priceCurrency || "IRR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/courses/${coursePath}`,
    } : undefined,
  } : null);
  useJsonLd(course ? "golmelo-breadcrumb-jsonld" : "golmelo-breadcrumb-jsonld-empty", course ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "گلملو", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "دوره‌ها", item: `${SITE_URL}/courses` },
      { "@type": "ListItem", position: 3, name: course.title, item: `${SITE_URL}/courses/${coursePath}` },
    ],
  } : null);

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      setStatus({ type: "loading", message: "" });
      try {
        const data = await apiRequest(`courses/${id}`);
        if (cancelled) return;
        setPayload({
          course: normalizePublicCourse({
            ...data.course,
            lessons: (data.course?.lessons || []).map((lesson) => ({
              ...lesson,
              imageUrl: resolveApiURL(lesson.imageUrl),
              imageSources: normalizeImageSources(lesson.imageSources),
            })),
          }),
          images: data.images || [],
        });
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled && error.status === 404) {
          navigate("/not-found", { replace: true });
          return;
        }
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!course?.id) return;
    trackEvent("course_viewed", { course_id: course.id, course_status: course.status, content_type: "course" });
  }, [course?.id, course?.status]);

  if (status.type === "loading") {
    return <div dir="rtl" className="grid min-h-screen place-items-center bg-alabaster text-charcoal/70">در حال بارگذاری دوره...</div>;
  }

  if (!course) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-alabaster px-6 text-center text-charcoal/70">
        <div>
          <p>{status.message || "دوره پیدا نشد."}</p>
          <ButtonLink to="/" variant="primary" size="md" className="mt-4">بازگشت به خانه</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-alabaster text-charcoal/70">
      <SiteNavbar navItems={navItems} authStatus={authStatus} user={user} userDisplayName={displayUserName(user)} />
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-28 md:px-8 lg:px-12">
        <section className="overflow-hidden rounded-[40px] border border-greige bg-alabaster shadow-soft">
          <div className="border-b border-greige px-6 py-14 md:px-10 lg:px-14">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mt-5 text-5xl leading-[1.18] text-charcoal md:text-6xl">{course.title}</h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-charcoal/70 md:text-xl">{course.description}</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm text-charcoal/70">
                <span className="rounded-full bg-alabaster px-4 py-2 shadow-soft">
                  {COURSE_STATUS_LABELS[course.status] || course.status}
                </span>
                {course.basePriceRial > 0 ? (
                  <span className="rounded-full bg-alabaster px-4 py-2 font-bold text-charcoal/70 shadow-soft">
                    {formatTomanPrice(course.basePriceRial)}
                  </span>
                ) : null}
                {course.accessDuration ? <span className="rounded-full bg-alabaster px-4 py-2">دسترسی: {course.accessDuration}</span> : null}
                {course.supportType ? <span className="rounded-full bg-alabaster px-4 py-2">پشتیبانی: {course.supportType}</span> : null}
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-greige bg-alabaster p-4 text-right shadow-soft md:p-5">
                <h3 className="mb-2 text-lg text-charcoal">آنچه در این دوره یاد می‌گیرید</h3>
                <ul className="space-y-1.5 text-sm leading-6 text-charcoal/70">
                  {(course.outcomes || []).slice(0, 5).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[22px] border border-greige bg-alabaster p-4 text-right shadow-soft md:p-5">
                <h3 className="mb-2 text-lg text-charcoal">مناسب چه کسانی است؟</h3>
                <ul className="space-y-1.5 text-sm leading-6 text-charcoal/70">
                  {(course.audience || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              {(course.prerequisites || []).length > 0 ? (
                <div className="rounded-[22px] border border-greige bg-alabaster p-4 text-right shadow-soft md:col-span-2 md:p-5">
                  <h3 className="mb-2 text-lg text-charcoal">پیش‌نیازها</h3>
                  <ul className="space-y-1.5 text-sm leading-6 text-charcoal/70">
                    {course.prerequisites.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="px-6 py-12 md:px-10 lg:px-14">
            <div className="mb-8 flex flex-col items-start gap-3 text-right md:flex-row md:items-end md:justify-between">
              <div className="order-2 text-sm text-charcoal/70 md:order-1">{(course.lessons || []).length} آموزش ویدیویی</div>
              <div className="order-1 md:order-2">
                <h2 className="text-2xl text-charcoal">سرفصل‌های دوره</h2>
                <p className="mt-2 text-sm text-charcoal/70">هر درس با متریال موردنیاز و سطح سختی مشخص شده است.</p>
              </div>
            </div>

            <div className="space-y-6">
              {(course.lessons || []).map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                />
              ))}
              <CourseAccessPanel course={course} coursePath={coursePath} authStatus={authStatus} user={user} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function readCachedUser() {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.sessionStorage.getItem(USER_SESSION_CACHE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function cacheUser(user) {
  if (typeof window === "undefined") return;

  if (!user) {
    window.sessionStorage.removeItem(USER_SESSION_CACHE_KEY);
    return;
  }

  window.sessionStorage.setItem(USER_SESSION_CACHE_KEY, JSON.stringify(user));
}

async function hydrateUserCourseAccess(user) {
  if (!user) return null;

  try {
    const data = await apiRequest("me/course-accesses");
    return {
      ...user,
      courseAccessIds: Array.isArray(data.courseAccessIds) ? data.courseAccessIds : [],
    };
  } catch {
    return {
      ...user,
      courseAccessIds: [],
    };
  }
}

function AnalyticsRouteTracker() {
  const location = useLocation();
  const hasMounted = useRef(false);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => trackPageView(location.pathname), 0);
    return () => window.clearTimeout(timeoutId);
  }, [location.pathname]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      document.head.querySelectorAll('script[data-seo-shell="true"]').forEach((element) => element.remove());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [location.pathname]);

  return null;
}

function AppRoutes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => readCachedUser());
  const [authStatus, setAuthStatus] = useState("checking");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const session = await apiRequest("session");
        if (cancelled) return;

        if (session.authenticated && session.user) {
          const hydratedUser = await hydrateUserCourseAccess(session.user);
          if (cancelled) return;
          setUser(hydratedUser);
          cacheUser(hydratedUser);
          setAuthStatus("authenticated");
        } else {
          setUser(null);
          cacheUser(null);
          setAuthStatus("guest");
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          cacheUser(null);
          setAuthStatus("guest");
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const authenticate = async (mode, payload) => {
    await apiRequest(mode === "signup" ? "auth/signup" : "auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await apiRequest("me");
    const hydratedUser = await hydrateUserCourseAccess(data.user);
    setUser(hydratedUser);
    cacheUser(hydratedUser);
    setAuthStatus("authenticated");
    return hydratedUser;
  };

  const handleProfileUpdate = async (nextUser) => {
    const hydratedUser = {
      ...nextUser,
      courseAccessIds: user?.courseAccessIds || nextUser?.courseAccessIds || [],
    };
    setUser(hydratedUser);
    cacheUser(hydratedUser);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiRequest("auth/logout", { method: "POST" });
    } catch {
      // The local UI should still leave the protected area if the server session is already gone.
    } finally {
      setUser(null);
      cacheUser(null);
      setAuthStatus("guest");
      setIsLoggingOut(false);
      navigate("/auth", { replace: true });
    }
  };

  return (
    <>
      <AnalyticsRouteTracker />
      <Routes>
      <Route path="/" element={<MelodyLandingPage authStatus={authStatus} user={user} />} />
      <Route path="/products" element={<ProductsPage authStatus={authStatus} user={user} />} />
      <Route path="/products/:id" element={<ProductDetailPage authStatus={authStatus} user={user} />} />
      <Route path="/custom-order" element={<CustomOrderGuidePage authStatus={authStatus} user={user} />} />
      <Route path="/courses" element={<CoursesPage authStatus={authStatus} user={user} />} />
      <Route path="/courses/:id" element={<CourseDetailPage authStatus={authStatus} user={user} />} />
      <Route path="/blogs" element={<Suspense fallback={<PublicPageLoader />}><BlogsPage authStatus={authStatus} user={user} navItems={navItems} /></Suspense>} />
      <Route path="/blogs/page/:page" element={<Suspense fallback={<PublicPageLoader />}><BlogsPage authStatus={authStatus} user={user} navItems={navItems} /></Suspense>} />
      <Route path="/blogs/:slug" element={<Suspense fallback={<PublicPageLoader />}><BlogDetailPage authStatus={authStatus} user={user} navItems={navItems} /></Suspense>} />
      <Route path="/guides/choose-fabric-flower" element={<ChooseFabricFlowerGuidePage authStatus={authStatus} user={user} />} />
      <Route path="/guides/fabric-flower-making-beginners" element={<BeginnerGuidePage authStatus={authStatus} user={user} />} />
      <Route path="/privacy" element={<PrivacyPage authStatus={authStatus} user={user} />} />
      <Route path="/not-found" element={<NotFoundPage authStatus={authStatus} user={user} />} />
      <Route
        path="/auth"
        element={(
          <Suspense fallback={<div dir="rtl" className="grid min-h-screen place-items-center bg-alabaster text-charcoal/70">در حال بارگذاری...</div>}>
            <AuthPage authStatus={authStatus} user={user} onAuthenticate={authenticate} />
          </Suspense>
        )}
      />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route
        path="/panel/*"
        element={(
          <Suspense fallback={<div dir="rtl" className="grid min-h-screen place-items-center bg-alabaster text-charcoal/70">در حال بارگذاری پنل...</div>}>
            <PanelRoutes
              authStatus={authStatus}
              user={user}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              onProfileUpdate={handleProfileUpdate}
            />
          </Suspense>
        )}
      />
      <Route path="*" element={<NotFoundPage authStatus={authStatus} user={user} />} />
      </Routes>
    </>
  );
}

function PublicPageLoader() {
  return <div dir="rtl" className="grid min-h-screen place-items-center bg-alabaster text-charcoal/70">در حال بارگذاری...</div>;
}

class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Panel rendering failed", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-alabaster px-5 text-center text-charcoal">
        <div className="w-full max-w-md rounded-[28px] bg-alabaster p-7 shadow-soft">
          <h1 className="text-xl font-black text-charcoal">پنل به‌درستی بارگذاری نشد</h1>
          <p className="mt-3 text-sm leading-7 text-charcoal/70">صفحه را دوباره بارگذاری کنید. اگر مشکل ادامه داشت، از حساب خارج شوید و دوباره وارد شوید.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="h-11 rounded-xl bg-rosewood px-5 text-sm font-bold text-alabaster">
              بارگذاری دوباره
            </button>
            <a href="/" className="inline-flex h-11 items-center justify-center rounded-xl border border-greige px-5 text-sm font-bold text-charcoal/70">
              بازگشت به سایت
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <PanelErrorBoundary>
        <AppRoutes />
      </PanelErrorBoundary>
    </BrowserRouter>
  );
}
