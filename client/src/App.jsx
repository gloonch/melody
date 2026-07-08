import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AtSign,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Globe2,
  Home,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MonitorPlay,
  Phone,
  Plus,
  Play,
  Save,
  Send,
  Smartphone,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
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
import inspirationBackgroundImage from "./assets/section-inspiration/abstract-flower-background.png";
import customOrderBackgroundImage from "./assets/section-inspiration/custom-order-fabric-background.png";
import petalsOverlayImage from "./assets/section-inspiration/petals-overlay-transparent.png";
import usageBlazerImage from "./assets/section-usage/blazer-flower.png";
import usageDressImage from "./assets/section-usage/dress-flower.png";
import usageHatImage from "./assets/section-usage/hat-flower.png";
import usageHairImage from "./assets/section-usage/hair-flower.png";

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
  recording: "در حال ضبط",
  for_sale: "قابل فروش",
  sold_out: "تکمیل ظرفیت",
  archived: "آرشیو",
  draft: "پیش‌نویس",
};
const ORDER_STATUS_LABELS = {
  draft: "پیش‌نویس",
  pending_review: "در انتظار بررسی",
  need_more_info: "نیازمند اطلاعات بیشتر",
  confirmed: "تایید شده",
  in_progress: "در حال ساخت",
  ready: "آماده تحویل",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};
const CUSTOM_USAGE_OPTIONS = [
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

async function apiRequest(path, options = {}) {
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
    throw new Error(body?.error || "درخواست انجام نشد.");
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

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const PANEL_PROGRESS_STORAGE_KEY = "golmelo-panel-progress-v1";
const COURSE_REQUEST_STORAGE_KEY = "golmelo-course-requests-v1";

const panelCourses = [
  {
    id: "fabric-flower-foundation",
    accessIds: ["fabric-flower-foundation", "01"],
    title: "دوره مقدماتی گل‌سازی پارچه‌ای",
    subtitle: "شروع قدم‌به‌قدم از ابزار، آماده‌سازی پارچه و ساخت گل‌های پایه.",
    cover: flowerImage1,
    accent: "#c08081",
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
    accent: "#51645a",
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

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

function formatPersianDate(value) {
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

function courseRequestStorageKey(userID) {
  return userID ? `${COURSE_REQUEST_STORAGE_KEY}:${userID}` : COURSE_REQUEST_STORAGE_KEY;
}

function displayUserName(user) {
  return user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "کاربر گلملو";
}

function defaultAddressId(addresses = []) {
  return addresses.find((address) => address.isDefault)?.id || addresses[0]?.id || "";
}

function usageLabel(value) {
  return CUSTOM_USAGE_OPTIONS.find((item) => item.value === value)?.label || value || "-";
}

function orderDisplayTitle(order) {
  if (order?.type === "custom") return "سفارش اختصاصی";
  return order?.productSnapshot?.title || "سفارش گلملو";
}

function orderCoverImage(order) {
  return order?.productSnapshot?.coverImageUrl || "";
}

function orderSummaryText(order, fallback = "درخواست شما ثبت شده است.") {
  if (order?.customerNote) return order.customerNote;
  if (order?.usageOtherText) return order.usageOtherText;
  if (order?.usage) return usageLabel(order.usage);
  return fallback;
}

function getCourseChapters(course) {
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

function getCourseLessons(course) {
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

function normalizeCourseForPanel(course) {
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

function userHasPanelCourseAccess(user, course) {
  if (!user || !course) return false;
  if (user.role === "admin") return true;

  const accessIds = getUserCourseAccessIds(user);
  if (!accessIds) return false;

  return [course.id, ...(course.accessIds || [])].some((key) => accessIds.has(key));
}

function readCourseRequests(userID) {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.localStorage.getItem(courseRequestStorageKey(userID));
    return rawValue ? JSON.parse(rawValue) : {};
  } catch {
    return {};
  }
}

function writeCourseRequests(requests, userID) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(courseRequestStorageKey(userID), JSON.stringify(requests));
  } catch {
    // Course request state is a local UI hint; the server request still remains the source of truth.
  }
}

function readPanelProgress(userID) {
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

function normalizePanelProgressRecord(value) {
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

function getPanelProgressRecord(progressByCourse, courseID) {
  return normalizePanelProgressRecord(progressByCourse?.[courseID]);
}

function updateStoredPanelProgress(userID, courseID, updater) {
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

function getWatchedLessonIds(course, progressByCourse = {}) {
  const record = getPanelProgressRecord(progressByCourse, course.id);

  return new Set([
    ...(course.completedLessonIds || []),
    ...record.watchedLessonIds,
  ]);
}

function getCourseProgress(course, progressByCourse = {}) {
  const lessons = getCourseLessons(course);
  if (lessons.length === 0) return 0;

  const watchedLessonIds = getWatchedLessonIds(course, progressByCourse);
  const watchedCount = lessons.filter((lesson) => watchedLessonIds.has(lesson.id)).length;
  return Math.round((watchedCount / lessons.length) * 100);
}

function getCourseStatusLabel(progress) {
  if (progress >= 100) return "تکمیل شده";
  if (progress <= 0) return "شروع دوره";
  return `${toPersianDigits(progress)}٪ دوره را دیده‌اید`;
}

function toLatinDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function durationToSeconds(value, fallback = 600) {
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

function formatPlaybackTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${toPersianDigits(minutes)}:${toPersianDigits(String(remainingSeconds).padStart(2, "0"))}`;
}

function usePanelSEO(title) {
  useEffect(() => {
    document.title = `${title} | پنل گلملو`;
    upsertMeta('meta[name="robots"]', { name: "robots", content: "noindex, nofollow" });
  }, [title]);
}


const navItems = [
  { id: "products", label: "محصولات" },
  { id: "courses", label: "دوره‌ها" },
];

function SiteNavbar({ authStatus = "guest", user = null, onNavClick, onLogoClick }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAuthenticated = authStatus === "authenticated" && user;

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [isMenuOpen]);

  const handleNavItemClick = (item) => (event) => {
    setIsMenuOpen(false);
    if (onNavClick) {
      onNavClick(item.id)(event);
    }
  };

  const renderNavLink = (item, className = "") => {
    if (item.path) {
      return (
        <Link key={item.id} to={item.path} onClick={() => setIsMenuOpen(false)} className={className}>
          {item.label}
        </Link>
      );
    }

    return (
      <a
        key={item.id}
        href={onNavClick ? `#${item.id}` : `/#${item.id}`}
        onClick={handleNavItemClick(item)}
        className={className}
      >
        {item.label}
      </a>
    );
  };

  const authAction = isAuthenticated ? (
    <Link
      to="/panel/profile"
      onClick={() => setIsMenuOpen(false)}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/20 text-white backdrop-blur transition hover:bg-white/28"
      aria-label="پنل کاربری"
      title={displayUserName(user)}
    >
      <User className="h-5 w-5" />
    </Link>
  ) : (
    <Link
      to="/auth?mode=login"
      onClick={() => setIsMenuOpen(false)}
      className="inline-flex h-10 items-center justify-center rounded-full border border-white/70 bg-white/40 px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(75,55,45,0.12)] backdrop-blur transition hover:bg-white/50"
    >
      ورود | ثبت‌نام
    </Link>
  );

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full bg-[#c08081] px-5 py-3 text-[#fff8f3] shadow-[0_14px_32px_rgba(192,128,129,0.25)]">
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

        <nav className="hidden items-center gap-1 rounded-full bg-white/[0.06] p-1 text-sm md:flex">
          {navItems.map((item) =>
            renderNavLink(
              item,
              "rounded-full px-4 py-2 text-[#f7eee4]/88 transition hover:bg-white/14 hover:text-white",
            ),
          )}
        </nav>

        <div className="hidden md:block">{authAction}</div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/14 text-white backdrop-blur md:hidden"
          aria-label="باز کردن منو"
        >
          <Menu className="h-5 w-5" />
        </button>

        <AnimatePresence>
          {isMenuOpen ? (
            <motion.div
              className="fixed inset-0 z-[90] flex min-h-dvh items-center justify-center bg-[#1f2a24]/60 p-6 text-center backdrop-blur-[6px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
            >
              <motion.aside
                className="relative flex h-full w-full flex-col items-center justify-center px-2 py-16 text-center text-white"
                initial={{ y: 12, opacity: 0.7, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 12, opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 340, damping: 32 }}
              >
                <div className="flex w-full max-w-xs flex-col items-center">
                  <Link to="/" className="mb-8 inline-flex items-center justify-center gap-3" onClick={() => setIsMenuOpen(false)}>
                    <img src={logoImage} alt="نشان گلملو" className="h-9 w-auto object-contain brightness-110" />
                    <span className="text-sm font-bold">Golmelo</span>
                  </Link>
                  <nav className="flex w-full flex-col items-center gap-3">
                    {navItems.map((item) =>
                      renderNavLink(
                        item,
                        "flex w-full items-center justify-center rounded-2xl bg-[#c08081] px-4 py-3 text-center text-sm font-bold text-white shadow-[0_14px_34px_rgba(73,55,48,0.16)] transition hover:bg-[#ad7274]",
                      ),
                    )}
                  </nav>
                  <div className="mt-8 flex justify-center">{authAction}</div>
                </div>
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AppCard({ item }) {
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

function ProductCard({ product, index, showOverlay = true }) {
  const productPath = product.slug || product.id;
  const productHref = `/products/${productPath}`;
  const location = useLocation();
  const navigate = useNavigate();

  const handleProductClick = (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    navigate(productHref, {
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        scrollY: window.scrollY,
      },
    });
  };

  return (
    <motion.article
      initial={{ y: 14 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className="group overflow-hidden rounded-[26px] border border-[#e5dbd0] bg-[#f7f0e8] text-right shadow-[0_12px_30px_rgba(83,63,47,0.12)]"
    >
      <Link to={productHref} onClick={handleProductClick} className="relative block aspect-square overflow-hidden">
        <img
          src={product.coverImageUrl}
          alt={product.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {showOverlay ? (
          <>
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-[linear-gradient(180deg,rgba(250,247,243,0)_0%,rgba(250,247,243,0.7)_56%,rgba(250,247,243,0.96)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-4">
              <h3 className="line-clamp-2 max-w-[62%] text-right text-lg leading-7 text-[#4f433b]">{product.title}</h3>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#c08081] px-3 py-1.5 text-xs font-bold text-white shadow-[0_10px_24px_rgba(192,128,129,0.24)]">
                جزئیات
                <ChevronLeft className="h-4 w-4" />
              </span>
            </div>
          </>
        ) : null}
      </Link>
    </motion.article>
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

function normalizePublicCourse(course) {
  if (!course) return null;

  return {
    ...course,
    imageUrl: resolveApiURL(course.imageUrl || course.imageURL || course.cover),
  };
}

function normalizePreparationTimeLabel(value) {
  const normalized = value?.trim();
  if (!normalized) return "پس از بررسی اعلام می‌شود";

  return normalized.replace(/^زمان آماده‌سازی\s*/, "").trim() || normalized;
}

function CoursePreviewCard({ course }) {
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
                  {COURSE_STATUS_LABELS[course.status] || course.status}
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

function CourseSlider({ courses }) {
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
          <CoursePreviewCard course={courses[0]} />
        </div>

        <div className="mt-5 flex justify-center">
          <Link
            to="/courses"
            className="inline-flex items-center justify-center rounded-full bg-[#c08081] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
          >
            مشاهده دوره‌ها
          </Link>
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
            <CoursePreviewCard course={course} />
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <Link
          to="/courses"
          className="inline-flex items-center justify-center rounded-full bg-[#c08081] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
        >
          مشاهده دوره‌ها
        </Link>
      </div>
    </div>
  );
}

function MelodyLandingPage({ authStatus = "guest", user = null }) {
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

        setProducts(
          sortProductsNewestFirst(nextProducts.map((item) => ({
            ...item,
            coverImageUrl: resolveApiURL(item.coverImageUrl),
          }))).slice(0, 3),
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

      <SiteNavbar
        authStatus={authStatus}
        user={user}
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
                href="#products"
                onClick={handleCtaClick("products")}
                className="rounded-full bg-[#c08081] px-7 py-3.5 text-base text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
              >
                دیدن محصولات
              </a>
              <a
                href="#courses"
                onClick={handleCtaClick("courses")}
                className="rounded-full bg-[#c08081] px-7 py-3.5 text-base text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
              >
                مشاهده دوره ها
              </a>
            </div>
          </motion.div>

          <div className="hidden md:block" />
        </div>
      </section>

      <main className="relative z-10 -mt-1">
        <section id="inspiration" className="relative flex h-[360px] scroll-mt-24 items-center overflow-hidden md:h-[460px] md:scroll-mt-28 lg:h-[540px]">
          <img
            src={inspirationBackgroundImage}
            alt="الهام گلملو از حرکت نرم گل‌های زنده"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(55,32,21,0.34)_0%,rgba(55,32,21,0.16)_44%,rgba(55,32,21,0.38)_100%)]" />
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 mx-auto max-w-3xl px-6 text-center text-white md:px-8 lg:px-12"
          >
            <h2 className="mb-5 text-4xl leading-tight text-white md:text-5xl" style={{ textShadow: "0 4px 22px rgba(52,31,20,0.42)" }}>
              الهام‌گرفته از زیبایی زنده
            </h2>
            <p className="text-lg leading-9 text-white/92" style={{ textShadow: "0 3px 18px rgba(52,31,20,0.36)" }}>
              هر گل نیروی آرام خود را دارد؛ لطافتی درونی، حرکتی نرم، و نظمی پنهان در دل طبیعت.
              این مجموعه از همین زیبایی زنده الهام می‌گیرد و آن را به زبانی تازه و لمس‌پذیر بازمی‌گوید.
            </p>
          </motion.div>
        </section>

        <div
          aria-hidden="true"
          className="pointer-events-none relative z-30 -my-14 flex h-28 items-center justify-center overflow-visible px-4 md:-my-20 md:h-40 lg:-my-24 lg:h-48"
        >
          <img
            src={petalsOverlayImage}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-[min(112vw,1180px)] max-w-none object-contain opacity-90"
          />
        </div>

        <section id="craft" className="relative flex h-[380px] scroll-mt-24 items-center overflow-hidden md:h-[500px] md:scroll-mt-28 lg:h-[620px]">
          <img
            src={customOrderBackgroundImage}
            alt="پارچه لطیف برای سفارش گل پارچه‌ای اختصاصی"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(250,244,235,0.9)_0%,rgba(250,244,235,0.72)_42%,rgba(250,244,235,0.34)_100%)]" />
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 mx-auto max-w-3xl px-6 text-center md:px-8 lg:px-12"
          >
            <h2 className="mb-5 text-4xl leading-tight text-[#3f342d] md:text-5xl">
              سفارش گل پارچه‌ای اختصاصی
            </h2>
            <p className="text-lg leading-9 text-[#58483f]">
              از انتخاب بافت‌های لطیف تا برش دقیق، فرم‌دهی آرام و ترکیب لایه‌ها، هر قطعه
              با صبر و توجه ساخته می‌شود. اگر برای لباس، کلاه، کیف، سنجاق سینه یا لباس
              عروس به یک گل پارچه‌ای اختصاصی نیاز دارید، می‌توانید سفارش خود را بر اساس
              رنگ، سبک، کاربرد و نوع استایل ثبت کنید.
            </p>
          </motion.div>
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

          <div className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
            {applications.map((item) => (
              <AppCard key={item.title} item={item} />
            ))}
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

          {courses.length > 0 ? (
            <CourseSlider courses={courses} />
          ) : (
            <div className="mt-12 rounded-[28px] border border-dashed border-[#d9cfc5] bg-white/60 p-8 text-center text-[#807269]">
              هنوز دوره‌ای منتشر نشده است.
            </div>
          )}

        </section>
        <section id="products" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">محصولات قابل سفارش</h2>
            <p className="text-lg leading-9 text-[#75655a]">
              هر محصول می‌تواند بر اساس رنگ، کاربرد و جزئیات موردنیاز شما بررسی و سفارش‌گذاری شود.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} showOverlay={false} />
            ))}
          </div>
          {products.length === 0 ? (
            <div className="mt-10 rounded-[28px] border border-dashed border-[#d9cfc5] bg-white/60 p-8 text-center text-[#807269]">
              هنوز محصولی برای سفارش ثبت نشده است.
            </div>
          ) : null}
          {products.length > 0 ? (
            <div className="mt-10 flex justify-center">
              <Link
                to="/products"
                className="inline-flex items-center justify-center rounded-full bg-[#c08081] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
              >
                مشاهده محصولات
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function ProductsPage({ authStatus = "guest", user = null }) {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  useRestoreScrollPosition(status.type !== "loading");

  usePageSEO({
    title: "محصولات قابل سفارش گلملو | گل‌های پارچه‌ای دست‌ساز",
    description: "محصولات قابل سفارش گلملو برای لباس، کلاه، سنجاق سینه و اکسسوری با امکان ثبت درخواست از پنل مشتری.",
    url: `${SITE_URL}/products`,
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

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f1eb] text-[#493d37]">
      <SiteNavbar authStatus={authStatus} user={user} />
      <main className="mx-auto max-w-7xl px-6 pb-20 pt-32 md:px-8 lg:px-12">
        <div className="mb-10 text-right">
          <h1 className="text-4xl leading-tight text-[#51645a] md:text-5xl">محصولات قابل سفارش</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#75655a]">
            جزئیات هر محصول را ببینید و درخواست سفارش را از پنل مشتری ثبت کنید.
          </p>
        </div>

        {status.type === "loading" ? (
          <div className="rounded-[28px] bg-white/70 p-8 text-center text-[#807269]">در حال بارگذاری محصولات...</div>
        ) : null}
        {status.type === "error" ? (
          <div className="rounded-[28px] border border-[#efb8ba] bg-[#fff6f6] p-8 text-center text-[#b85d60]">{status.message}</div>
        ) : null}
        {status.type !== "loading" && products.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#d9cfc5] bg-white/60 p-8 text-center text-[#807269]">
            هنوز محصولی ثبت نشده است.
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </main>
    </div>
  );
}

function CoursesPage({ authStatus = "guest", user = null }) {
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "" });

  usePageSEO({
    title: "دوره‌های آموزش گلملو | آموزش گل‌سازی پارچه‌ای",
    description: "دوره‌های آموزش گل‌سازی پارچه‌ای گلملو با امکان مشاهده جزئیات هر دوره و ثبت درخواست خرید.",
    url: `${SITE_URL}/courses`,
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
    <div dir="rtl" className="min-h-screen bg-[#f5f1eb] text-[#493d37]">
      <SiteNavbar authStatus={authStatus} user={user} />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-8 lg:px-12">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h1 className="text-4xl leading-tight text-[#51645a] md:text-5xl">دوره‌های گلملو</h1>
          <p className="mt-4 text-base leading-8 text-[#75655a] md:text-lg">
            هر دوره را جداگانه ببینید، جزئیات آموزش‌ها را بررسی کنید و از صفحه همان دوره درخواست خرید را ثبت کنید.
          </p>
        </div>

        {status.type === "loading" ? (
          <div className="rounded-[28px] bg-white/70 p-8 text-center text-[#807269]">در حال بارگذاری دوره‌ها...</div>
        ) : null}
        {status.type === "error" ? (
          <div className="rounded-[28px] border border-[#efb8ba] bg-[#fff6f6] p-8 text-center text-[#b85d60]">{status.message}</div>
        ) : null}
        {status.type !== "loading" && courses.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#d9cfc5] bg-white/60 p-8 text-center text-[#807269]">
            هنوز دوره‌ای منتشر نشده است.
          </div>
        ) : null}

        {courses.length > 0 ? (
          <div className="grid gap-6">
            {courses.map((course) => (
              <CoursePreviewCard key={course.id} course={course} />
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
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const isAuthenticated = authStatus === "authenticated" && user;
  const orderPath = product ? `/panel/orders/new?productId=${encodeURIComponent(product.id)}` : "/panel/orders/new";
  const authPath = `/auth?mode=login&redirect=${encodeURIComponent(orderPath)}`;
  const productBackTarget = getProductBackTarget(location.state);
  const productBackState = getProductBackState(location.state);

  usePageSEO({
    title: product ? `${product.title} | محصول قابل سفارش گلملو` : "محصول قابل سفارش گلملو",
    description: product?.shortDescription || "جزئیات محصول قابل سفارش گلملو و ثبت درخواست سفارش از پنل مشتری.",
    url: `${SITE_URL}/products/${product?.slug || id}`,
    image: product?.coverImageUrl || DEFAULT_SEO.image,
    type: "product",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setStatus({ type: "loading", message: "" });
      try {
        const data = await apiRequest(`products/${id}`);
        if (cancelled) return;
        setProduct({
          ...data.product,
          coverImageUrl: resolveApiURL(data.product?.coverImageUrl),
        });
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status.type === "loading") {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-[#f5f1eb] text-[#75655a]">
        در حال بارگذاری محصول...
      </div>
    );
  }

  if (!product) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-[#f5f1eb] px-6 text-center text-[#75655a]">
        <div>
          <p>{status.message || "محصول پیدا نشد."}</p>
          <Link to={productBackTarget} state={productBackState} className="mt-4 inline-flex rounded-full bg-[#c08081] px-5 py-3 text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]">بازگشت به محصولات</Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f1eb] text-[#493d37]">
      <SiteNavbar authStatus={authStatus} user={user} />
      <main className="mx-auto max-w-7xl px-6 pb-20 pt-32 md:px-8 lg:px-12">
        <section className="grid gap-8 rounded-[34px] border border-[#e8dfd5] bg-[#faf7f3] p-5 shadow-[0_24px_60px_rgba(85,63,45,0.06)] md:grid-cols-[0.95fr_1.05fr] md:p-8">
          <div className="overflow-hidden rounded-[28px] bg-[#f2e9df]">
            <img src={product.coverImageUrl} alt={product.title} className="aspect-square h-full w-full object-cover" />
          </div>
          <div className="flex flex-col justify-center text-right">
            <p className="text-sm font-bold text-[#c08081]">{product.category || "محصول قابل سفارش"}</p>
            <h1 className="mt-3 text-4xl leading-tight text-[#4f433b] md:text-5xl">{product.title}</h1>
            <p className="mt-5 text-lg leading-9 text-[#75655a]">{product.description || product.shortDescription}</p>

            <dl className="mt-5 grid gap-x-5 gap-y-3 rounded-2xl border border-[#ece4db] bg-white/80 p-4 text-sm text-[#6f6259] sm:grid-cols-2">
              {[
                ["قیمت", product.priceLabel || "پس از بررسی اعلام می‌شود"],
                ["زمان آماده‌سازی", normalizePreparationTimeLabel(product.preparationTime)],
                ["کاربرد", product.usageLabel || "سفارشی"],
                ["سفارشی‌سازی", product.isCustomizable ? "قابل سفارش اختصاصی" : "ثابت"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-[#f0e7de] pb-2 last:border-b-0 last:pb-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-last-child(-n+2)]:pb-0">
                  <dt className="shrink-0 text-xs text-[#a18f83]">{label}</dt>
                  <dd className="text-left text-sm font-bold leading-6 text-[#4f433b]">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? orderPath : authPath}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#c08081] px-6 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
              >
                ثبت سفارش
              </Link>
              <Link
                to={productBackTarget}
                state={productBackState}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#d8cabd] bg-white px-6 text-sm font-bold text-[#6d5d53] transition hover:border-[#c08081]/50 hover:text-[#c08081]"
              >
                بازگشت به محصولات
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function CourseAccessPanel({ course, coursePath, authStatus = "guest", user = null }) {
  const panelCourse = findPanelCourseForPublicCourse(course) || normalizeCourseForPanel(course);
  const hasAccess = authStatus === "authenticated" && userHasPanelCourseAccess(user, panelCourse);
  const [courseStatus, setCourseStatus] = useState({ type: "idle", message: "" });
  const [requestedCourses, setRequestedCourses] = useState(() => readCourseRequests(user?.id));
  const isSubmitting = courseStatus.type === "loading";
  const successToastMessage = courseStatus.type === "success" ? courseStatus.message : "";
  const loginPath = `/auth?mode=login&redirect=${encodeURIComponent(`/courses/${coursePath}`)}`;
  const panelPath = panelCourse ? `/panel/courses/${panelCourse.id}` : "/panel/courses";
  const courseRequestKey = course?.id || course?.slug || coursePath;
  const hasRequested = Boolean(requestedCourses[courseRequestKey]);

  useEffect(() => {
    setRequestedCourses(readCourseRequests(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (courseStatus.type !== "success") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCourseStatus({ type: "idle", message: "" });
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [courseStatus.type]);

  const handleCoursePurchaseRequest = async () => {
    if (!user?.phone) {
      setCourseStatus({ type: "error", message: "برای ثبت درخواست، شماره تلفن حساب کاربری لازم است." });
      return;
    }

    setCourseStatus({ type: "loading", message: "در حال ثبت درخواست خرید دوره..." });

    try {
      const response = await fetch(apiEndpoint("course-signups"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: user.phone,
          courseId: course?.id,
          courseSlug: course?.slug,
          courseTitle: course?.title,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to submit course signup");
      }

      const nextRequests = {
        ...readCourseRequests(user?.id),
        [courseRequestKey]: new Date().toISOString(),
      };
      writeCourseRequests(nextRequests, user?.id);
      setRequestedCourses(nextRequests);
      setCourseStatus({ type: "success", message: "درخواست خرید دوره ثبت شد. تیم گلملو برای هماهنگی با شما تماس می‌گیرد." });
    } catch (error) {
      console.error(error);
      setCourseStatus({ type: "error", message: "ثبت درخواست انجام نشد. دوباره تلاش کنید." });
    }
  };

  let content;

  if (authStatus === "checking") {
    content = (
      <>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#c08081]" />
        <h3 className="mt-4 text-2xl text-[#4f433b]">در حال بررسی حساب کاربری</h3>
      </>
    );
  } else if (hasAccess) {
    const progressRecord = getPanelProgressRecord(readPanelProgress(user?.id), panelCourse.id);
    const hasResumePoint = progressRecord.lastLessonId && progressRecord.currentTime > 0;
    content = (
      <>
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf7f0] text-[#4d9a61]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl text-[#4f433b]">این دوره در پنل شما فعال است</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#807269]">
          {hasResumePoint
            ? `ادامه دوره از آخرین محل تماشا، حدود ${formatPlaybackTime(progressRecord.currentTime)}، باز می‌شود.`
            : "از پنل کاربری وارد دوره شوید و آموزش‌ها را از همان‌جا دنبال کنید."}
        </p>
        <Link
          to={panelPath}
          className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#c08081] px-7 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
        >
          <MonitorPlay className="h-4 w-4" />
          مشاهده دوره در پنل کاربری
        </Link>
      </>
    );
  } else if (authStatus === "authenticated" && user) {
    content = (
      <>
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff2f2] text-[#c08081]">
          <BookOpen className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl text-[#4f433b]">درخواست خرید این دوره</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#807269]">
          با حساب کاربری وارد شده‌اید. درخواست خرید را ثبت کنید تا تیم گلملو برای ظرفیت، قیمت و فعال‌سازی دوره با شما هماهنگ کند.
        </p>
        <button
          type="button"
          onClick={handleCoursePurchaseRequest}
          disabled={isSubmitting || hasRequested}
          className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#c08081] px-7 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {hasRequested ? "درخواست خرید ثبت شده است" : isSubmitting ? "در حال ثبت" : "ثبت درخواست خرید دوره"}
        </button>
      </>
    );
  } else {
    content = (
      <>
        <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7efea] text-[#c08081]">
          <User className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-2xl text-[#4f433b]">برای درخواست خرید دوره وارد شوید</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#807269]">
          بعد از ورود یا ساخت حساب، به همین صفحه برمی‌گردید و می‌توانید درخواست خرید دوره را ثبت کنید.
        </p>
        <Link
          to={loginPath}
          className="mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#c08081] px-7 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]"
        >
          <User className="h-4 w-4" />
          ورود | ثبت‌نام
        </Link>
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#e6dbcf] bg-white/70 p-6 text-center shadow-[0_18px_40px_rgba(85,63,45,0.05)]">
      <SuccessToast message={successToastMessage} toastKey="course-signup-success" />
      {content}

      {courseStatus.type !== "success" ? (
        <p
          aria-live="polite"
          className={`mx-auto mt-4 max-w-xl text-sm ${courseStatus.type === "error" ? "text-[#b85d60]" : "text-[#9b867d]"
            }`}
        >
          {courseStatus.message || (hasRequested ? "درخواست این دوره قبلاً از همین مرورگر ثبت شده است." : "")}
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

function CourseDetailPage({ authStatus = "guest", user = null }) {
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
      <SiteNavbar authStatus={authStatus} user={user} />
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-28 md:px-8 lg:px-12">
        <section className="overflow-hidden rounded-[40px] border border-[#e8dfd5] bg-[#faf7f3] shadow-[0_24px_60px_rgba(85,63,45,0.06)]">
          <div className="border-b border-[#eee5db] px-6 py-14 md:px-10 lg:px-14">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mt-5 text-5xl leading-[1.18] text-[#4f433b] md:text-6xl">{course.title}</h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-[#75655a] md:text-xl">{course.description}</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm text-[#75655a]">
                <span className="rounded-full bg-white px-4 py-2 shadow-[0_10px_24px_rgba(85,63,45,0.05)]">
                  {COURSE_STATUS_LABELS[course.status] || course.status}
                </span>
                {course.priceLabel ? (
                  <span className="rounded-full bg-white px-4 py-2 font-bold text-[#4f433b] shadow-[0_10px_24px_rgba(85,63,45,0.05)]">
                    {course.priceLabel}
                  </span>
                ) : null}
              </div>
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
              <CourseAccessPanel course={course} coursePath={coursePath} authStatus={authStatus} user={user} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AuthPage({ authStatus, user, onAuthenticate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryRedirect = searchParams.get("redirect");
  const stateFrom = location.state?.from
    ? `${location.state.from.pathname || ""}${location.state.from.search || ""}`
    : "";
  const redirectPath = safeInternalRedirect(queryRedirect || stateFrom, "/panel/orders");
  const [mode, setMode] = useState(() => (searchParams.get("mode") === "signup" ? "signup" : "login"));
  const [form, setForm] = useState({ phone: "", password: "", repeatPassword: "" });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const isSignup = mode === "signup";
  const isLoading = status.type === "loading";

  usePanelSEO(isSignup ? "ثبت‌نام" : "ورود");

  useEffect(() => {
    if (authStatus === "authenticated" && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [authStatus, navigate, redirectPath, user]);

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setStatus({ type: "idle", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const phone = form.phone.trim();
    const password = form.password.trim();

    if (!phone || !password) {
      setStatus({ type: "error", message: "شماره تلفن و رمز عبور الزامی است." });
      return;
    }
    if (password.length < 6) {
      setStatus({ type: "error", message: "رمز عبور باید حداقل ۶ کاراکتر باشد." });
      return;
    }
    if (isSignup && password !== form.repeatPassword.trim()) {
      setStatus({ type: "error", message: "تکرار رمز عبور با رمز عبور یکسان نیست." });
      return;
    }

    setStatus({ type: "loading", message: "" });
    try {
      await onAuthenticate(mode, { phone, password });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f3f7fb] px-4 py-10 text-[#27364d]">
      <section className="w-full max-w-md overflow-hidden rounded-[30px] bg-white shadow-[0_26px_70px_rgba(70,88,116,0.12)]">
        <div className="bg-[#f8fbff] px-6 py-6">
          <Link to="/" className="inline-flex items-center gap-3 text-right" aria-label="بازگشت به گلملو">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#51645a] shadow-[0_14px_30px_rgba(81,100,90,0.22)]">
              <img src={logoImage} alt="نشان گلملو" className="h-8 w-8 object-contain" />
            </span>
            <span>
              <span className="block text-lg font-black text-[#26364c]">Golmelo</span>
              <span className="block text-xs text-[#8a98ad]">پنل مشتری</span>
            </span>
          </Link>

          <h1 className="mt-8 text-3xl text-[#2f3f55]">{isSignup ? "ساخت حساب کاربری" : "ورود به حساب کاربری"}</h1>
          <p className="mt-2 text-sm leading-7 text-[#74839a]">
            {isSignup ? "با شماره تلفن و رمز عبور، حساب پنل خود را بسازید." : "برای ورود به دوره‌ها و پروفایل خود وارد شوید."}
          </p>
        </div>

        <form className="grid gap-4 px-6 py-6" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold text-[#607089]">
            شماره تلفن
            <div className="relative">
              <input
                value={form.phone}
                onChange={updateForm("phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="h-[52px] w-full rounded-2xl border border-transparent bg-[#f8fafc] px-4 pl-12 text-[#2e3d54] outline-none transition placeholder:text-[#a8b4c5] focus:border-[#c08081]/60 focus:bg-white"
                placeholder="09121234567"
                required
              />
              <Smartphone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa8ba]" />
            </div>
          </label>

          <label className="grid gap-2 text-sm font-bold text-[#607089]">
            رمز عبور
            <div className="relative">
              <input
                value={form.password}
                onChange={updateForm("password")}
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="h-[52px] w-full rounded-2xl border border-transparent bg-[#f8fafc] px-4 pl-12 text-[#2e3d54] outline-none transition placeholder:text-[#a8b4c5] focus:border-[#c08081]/60 focus:bg-white"
                placeholder="حداقل ۶ کاراکتر"
                required
              />
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa8ba]" />
            </div>
          </label>

          {isSignup ? (
            <label className="grid gap-2 text-sm font-bold text-[#607089]">
              تکرار رمز عبور
              <div className="relative">
                <input
                  value={form.repeatPassword}
                  onChange={updateForm("repeatPassword")}
                  type="password"
                  autoComplete="new-password"
                  className="h-[52px] w-full rounded-2xl border border-transparent bg-[#f8fafc] px-4 pl-12 text-[#2e3d54] outline-none transition placeholder:text-[#a8b4c5] focus:border-[#c08081]/60 focus:bg-white"
                  placeholder="تکرار رمز عبور"
                  required
                />
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa8ba]" />
              </div>
            </label>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#c08081] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSignup ? "ثبت‌نام و ورود" : "ورود به پنل"}
          </button>

          <p className={`min-h-6 text-sm ${status.type === "error" ? "text-[#b85d60]" : "text-[#708097]"}`} aria-live="polite">
            {status.message}
          </p>
        </form>

        <div className="border-t border-dashed border-[#dfe7f1] px-6 py-5 text-center text-sm text-[#708097]">
          {isSignup ? "قبلاً حساب دارید؟" : "حساب ندارید؟"}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setStatus({ type: "idle", message: "" });
            }}
            className="mr-2 font-bold text-[#c08081]"
          >
            {isSignup ? "ورود" : "ثبت‌نام"}
          </button>
        </div>
      </section>
    </main>
  );
}

function PanelRoute({ authStatus, user, children }) {
  const location = useLocation();

  if (authStatus === "checking") {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-[#f3f7fb] text-[#708097]">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-[0_18px_44px_rgba(70,88,116,0.08)]">
          <Loader2 className="h-5 w-5 animate-spin text-[#c08081]" />
          در حال بررسی نشست کاربری...
        </div>
      </div>
    );
  }

  if (authStatus !== "authenticated" || !user) {
    const redirectPath = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?mode=login&redirect=${encodeURIComponent(redirectPath)}`} replace state={{ from: location }} />;
  }

  return children;
}

const panelNavItems = [
  { to: "/panel/orders", label: "سفارش‌ها", icon: Send },
  { to: "/panel/courses", label: "دوره‌ها", icon: MonitorPlay },
  { to: "/panel/profile", label: "پروفایل من", icon: User },
];

function PanelSidebar({ user, onNavigate, onLogout, isLoggingOut }) {
  const userName = displayUserName(user);
  const userPhone = user?.phone || "";

  return (
    <div className="flex h-full flex-col bg-white px-7 py-8 text-[#35445b]">
      <Link to="/" className="mb-12 inline-flex items-center gap-3 text-right" onClick={onNavigate} aria-label="بازگشت به گلملو">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#51645a] shadow-[0_14px_30px_rgba(81,100,90,0.22)]">
          <img src={logoImage} alt="نشان گلملو" className="h-8 w-8 object-contain" />
        </span>
        <span>
          <span className="block text-lg font-black text-[#26364c]">Golmelo</span>
          <span className="block text-xs text-[#8a98ad]">پنل مشتری</span>
        </span>
      </Link>

      <nav className="grid gap-2">
        {panelNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `relative flex h-14 items-center gap-3 rounded-2xl px-4 text-sm transition ${isActive
                  ? "bg-[#f7f9fc] font-bold text-[#1e2b3d]"
                  : "text-[#6f7e96] hover:bg-[#f8fafc] hover:text-[#2d3b52]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full transition ${isActive ? "bg-[#c08081]" : "bg-transparent"
                      }`}
                  />
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-[22px] border border-[#eef2f7] bg-[#f8fafc] p-4 text-right">
          <p className="text-sm font-bold text-[#2f3f55]">{userName}</p>
          <p className="mt-1 text-xs text-[#7c8aa1]">{userPhone ? toPersianDigits(userPhone) : "شماره ثبت نشده"}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#f0d7d8] bg-white text-sm font-bold text-[#b85d60] transition hover:bg-[#fff7f7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          خروج
        </button>
      </div>
    </div>
  );
}

function PanelLayout({ user, onLogout, isLoggingOut, children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const userPhone = user?.phone || "";

  useEffect(() => {
    if (!isDrawerOpen) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [isDrawerOpen]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f3f7fb] text-[#27364d]">
      <aside className="fixed bottom-0 right-0 top-0 z-40 hidden w-[300px] rounded-l-[34px] border-l border-[#edf1f6] bg-white shadow-[0_24px_70px_rgba(70,88,116,0.08)] lg:block">
        <PanelSidebar user={user} onLogout={onLogout} isLoggingOut={isLoggingOut} />
      </aside>

      <AnimatePresence>
        {isDrawerOpen ? (
          <motion.div
            className="fixed inset-0 z-[80] bg-[#142033]/35 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDrawerOpen(false)}
          >
            <motion.aside
              className="absolute bottom-0 right-0 top-0 w-[82vw] max-w-[320px] rounded-l-[30px] bg-white shadow-[0_24px_80px_rgba(26,39,59,0.2)]"
              initial={{ x: 80, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 330, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="absolute left-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e7edf5] text-[#65748c]"
                aria-label="بستن منو"
              >
                <X className="h-5 w-5" />
              </button>
              <PanelSidebar
                user={user}
                onNavigate={() => setIsDrawerOpen(false)}
                onLogout={onLogout}
                isLoggingOut={isLoggingOut}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="lg:pr-[300px]">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pb-4 pt-5 sm:px-6 lg:px-10 lg:pt-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e5ecf5] bg-white text-[#40516a] shadow-[0_12px_28px_rgba(70,88,116,0.08)] lg:hidden"
              aria-label="باز کردن منو"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="inline-flex items-center gap-2 lg:hidden" aria-label="بازگشت به گلملو">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#51645a] shadow-[0_12px_26px_rgba(81,100,90,0.2)]">
                <img src={logoImage} alt="نشان گلملو" className="h-7 w-7 object-contain" />
              </span>
              <span className="text-sm font-black text-[#26364c]">Golmelo</span>
            </Link>
          </div>

          <div className="hidden items-center gap-3 rounded-full border border-[#e5ecf5] bg-white px-4 py-2 text-sm text-[#708097] shadow-[0_12px_28px_rgba(70,88,116,0.06)] sm:flex">
            <Phone className="h-4 w-4 text-[#c08081]" />
            <span dir="ltr">{userPhone ? toPersianDigits(userPhone) : "بدون شماره"}</span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

function PanelField({ label, icon: Icon, children }) {
  return (
    <label className="grid gap-2 text-right text-sm text-[#7f8ea5]">
      <span className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-[#9aa8ba]" /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

function PanelInput(props) {
  return (
    <input
      {...props}
      className={`h-[52px] rounded-2xl border border-transparent bg-[#f8fafc] px-4 text-sm text-[#2e3d54] outline-none transition placeholder:text-[#a8b4c5] focus:border-[#c08081]/60 focus:bg-white ${props.className || ""
        }`}
    />
  );
}

function PanelSection({ title, children }) {
  return (
    <section className="border-t border-dashed border-[#dfe7f1] px-5 py-8 sm:px-7 lg:px-9">
      <h2 className="mb-6 text-xl text-[#2f3f55]">{title}</h2>
      {children}
    </section>
  );
}

function PanelSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl bg-[#f8fafc] px-4 py-4 text-right text-sm text-[#64748b] transition hover:bg-[#f3f6fa]"
    >
      <span>{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#c08081]" : "bg-[#d9e1ec]"}`}>
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "right-6" : "right-1"
            }`}
        />
      </span>
    </button>
  );
}

function PasswordInput({ value, onChange, placeholder, visible, onToggleVisibility }) {
  const VisibilityIcon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <PanelInput
        value={value}
        onChange={onChange}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        className="w-full pl-12"
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#91a0b5] transition hover:bg-white hover:text-[#c08081]"
        aria-label={visible ? "مخفی کردن رمز" : "نمایش رمز"}
      >
        <VisibilityIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

const emptyAddressForm = {
  title: "",
  fullAddress: "",
  receiverName: "",
  receiverPhone: "",
  isDefault: false,
};

function AddressEditor({ initialValue, onCancel, onSave, isSaving }) {
  const [form, setForm] = useState(() => ({
    ...emptyAddressForm,
    ...(initialValue || {}),
  }));

  useEffect(() => {
    setForm({
      ...emptyAddressForm,
      ...(initialValue || {}),
    });
  }, [initialValue]);

  const updateField = (field) => (event) => {
    const value = field === "isDefault" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      title: form.title.trim(),
      fullAddress: form.fullAddress.trim(),
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim(),
      isDefault: Boolean(form.isDefault),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-[22px] border border-[#dfe7f1] bg-[#f8fafc] p-4 text-right">
      <div className="grid gap-4 md:grid-cols-2">
        <PanelField label="عنوان آدرس">
          <PanelInput value={form.title} onChange={updateField("title")} placeholder="خانه، محل کار..." required />
        </PanelField>
        <PanelField label="شماره تماس تحویل‌گیرنده">
          <PanelInput value={form.receiverPhone} onChange={updateField("receiverPhone")} placeholder="اختیاری" type="tel" />
        </PanelField>
        <PanelField label="نام تحویل‌گیرنده">
          <PanelInput value={form.receiverName} onChange={updateField("receiverName")} placeholder="اختیاری" />
        </PanelField>
      </div>

      <label className="grid gap-2 text-right text-sm text-[#7f8ea5]">
        متن آدرس
        <textarea
          value={form.fullAddress}
          onChange={updateField("fullAddress")}
          required
          rows={4}
          className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm leading-7 text-[#2e3d54] outline-none transition placeholder:text-[#a8b4c5] focus:border-[#c08081]/60"
          placeholder="آدرس کامل را وارد کنید"
        />
      </label>

      <label className="flex items-center gap-3 text-sm font-bold text-[#607089]">
        <input type="checkbox" checked={form.isDefault} onChange={updateField("isDefault")} className="h-4 w-4 accent-[#c08081]" />
        این آدرس پیش‌فرض باشد
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.2)] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره آدرس
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe7f1] bg-white px-5 text-sm font-bold text-[#617088]"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}

function AddressCard({ address, selected, selectable = false, onSelect, onEdit, onDelete, onSetDefault, busy }) {
  return (
    <article
      className={`rounded-[20px] border bg-white p-4 text-right transition ${selected ? "border-[#c08081] shadow-[0_14px_34px_rgba(192,128,129,0.14)]" : "border-[#edf1f6]"
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[#2f3f55]">{address.title}</h3>
            {address.isDefault ? <span className="rounded-full bg-[#edf7f0] px-2.5 py-1 text-xs font-bold text-[#4d9a61]">پیش‌فرض</span> : null}
          </div>
          <p className="mt-2 text-sm leading-7 text-[#617088]">{address.fullAddress}</p>
          {(address.receiverName || address.receiverPhone) ? (
            <p className="mt-2 text-xs text-[#9aa8ba]">
              {[address.receiverName, address.receiverPhone].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {selectable ? (
          <button
            type="button"
            onClick={() => onSelect(address.id)}
            className={`h-5 w-5 shrink-0 rounded-full border ${selected ? "border-[#c08081] bg-[#c08081]" : "border-[#ccd6e4]"}`}
            aria-label="انتخاب آدرس"
          />
        ) : null}
      </div>

      {(onEdit || onDelete || onSetDefault) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onEdit ? (
            <button type="button" onClick={() => onEdit(address)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe7f1] bg-white px-3 text-xs font-bold text-[#617088]">
              ویرایش
            </button>
          ) : null}
          {onSetDefault && !address.isDefault ? (
            <button type="button" onClick={() => onSetDefault(address.id)} disabled={busy === `default-${address.id}`} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe7f1] bg-white px-3 text-xs font-bold text-[#617088] disabled:opacity-60">
              {busy === `default-${address.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              پیش‌فرض
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" onClick={() => onDelete(address.id)} disabled={busy === `delete-${address.id}`} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#f0d7d8] bg-white px-3 text-xs font-bold text-[#b85d60] disabled:opacity-60">
              {busy === `delete-${address.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              حذف
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function AddressManager({ selectable = false, selectedId = "", onSelect, compact = false, onAddressesChange }) {
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const [busy, setBusy] = useState("");
  const isSaving = busy === "save";

  const notifyAddresses = useCallback((nextAddresses) => {
    onAddressesChange?.(nextAddresses);
    if (selectable && !selectedId && nextAddresses.length > 0) {
      onSelect?.(defaultAddressId(nextAddresses));
    }
  }, [onAddressesChange, onSelect, selectable, selectedId]);

  const loadAddresses = useCallback(async () => {
    setStatus({ type: "loading", message: "" });
    try {
      const data = await apiRequest("me/addresses");
      const nextAddresses = data.addresses || [];
      setAddresses(nextAddresses);
      notifyAddresses(nextAddresses);
      setStatus({ type: "idle", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }, [notifyAddresses]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openNew = () => {
    setEditingAddress(null);
    setIsEditorOpen(true);
    setStatus({ type: "idle", message: "" });
  };

  const openEdit = (address) => {
    setEditingAddress(address);
    setIsEditorOpen(true);
    setStatus({ type: "idle", message: "" });
  };

  const closeEditor = () => {
    setEditingAddress(null);
    setIsEditorOpen(false);
  };

  const saveAddress = async (payload) => {
    if (!payload.title || !payload.fullAddress) {
      setStatus({ type: "error", message: "عنوان و متن آدرس الزامی است." });
      return;
    }

    setBusy("save");
    try {
      const path = editingAddress ? `me/addresses/${editingAddress.id}` : "me/addresses";
      const data = await apiRequest(path, {
        method: editingAddress ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      closeEditor();
      await loadAddresses();
      if (selectable) {
        onSelect?.(data.address.id);
      }
      setStatus({ type: "success", message: "آدرس ذخیره شد." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const deleteAddress = async (addressId) => {
    if (!window.confirm("آیا از حذف این آدرس مطمئن هستید؟")) return;
    setBusy(`delete-${addressId}`);
    try {
      await apiRequest(`me/addresses/${addressId}`, { method: "DELETE" });
      if (selectedId === addressId) {
        onSelect?.("");
      }
      await loadAddresses();
      setStatus({ type: "success", message: "آدرس حذف شد." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const setDefaultAddress = async (addressId) => {
    setBusy(`default-${addressId}`);
    try {
      await apiRequest(`me/addresses/${addressId}/default`, { method: "PATCH" });
      await loadAddresses();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  return (
    <section className={`${compact ? "" : "border-t border-dashed border-[#dfe7f1] px-5 py-8 sm:px-7 lg:px-9"}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-right">
          <h2 className="text-xl text-[#2f3f55]">آدرس‌های من</h2>
          <p className="mt-1 text-sm text-[#7d8ca3]">فعلاً آدرس‌ها به صورت متن ذخیره می‌شوند و برای نقشه آینده آماده‌اند.</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#c08081] px-4 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.2)]"
        >
          <Plus className="h-4 w-4" />
          افزودن آدرس
        </button>
      </div>

      {status.type === "loading" ? <p className="text-sm text-[#7d8ca3]">در حال بارگذاری آدرس‌ها...</p> : null}
      {status.type !== "loading" && addresses.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#dfe7f1] bg-[#f8fafc] p-6 text-center text-sm text-[#7d8ca3]">
          هنوز آدرسی ثبت نکرده‌اید.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            selected={selectedId === address.id}
            selectable={selectable}
            onSelect={onSelect}
            onEdit={openEdit}
            onDelete={deleteAddress}
            onSetDefault={setDefaultAddress}
            busy={busy}
          />
        ))}
      </div>

      {isEditorOpen ? (
        <div className="mt-5">
          <AddressEditor
            initialValue={editingAddress}
            onCancel={closeEditor}
            onSave={saveAddress}
            isSaving={isSaving}
          />
        </div>
      ) : null}

      {status.message ? (
        <p className={`mt-3 text-sm ${status.type === "error" ? "text-[#b85d60]" : "text-[#5b8c67]"}`}>{status.message}</p>
      ) : null}
    </section>
  );
}

function PanelProfilePage({ user, onProfileUpdate }) {
  usePanelSEO("پروفایل من");

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    birthDate: user?.birthDate || "",
    instagram: user?.instagram || "",
    website: user?.website || "",
    newPassword: "",
    repeatPassword: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({ newPassword: false, repeatPassword: false });
  const [notifications, setNotifications] = useState({ email: true, sms: false });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const isSaving = status.type === "loading";

  useEffect(() => {
    setForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      birthDate: user?.birthDate || "",
      instagram: user?.instagram || "",
      website: user?.website || "",
      newPassword: "",
      repeatPassword: "",
    });
  }, [user]);

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setStatus({ type: "idle", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.newPassword.trim() || form.repeatPassword.trim()) {
      if (form.newPassword.trim().length < 6) {
        setStatus({ type: "error", message: "رمز جدید باید حداقل ۶ کاراکتر باشد." });
        return;
      }
      if (form.newPassword.trim() !== form.repeatPassword.trim()) {
        setStatus({ type: "error", message: "تکرار رمز جدید با رمز جدید یکسان نیست." });
        return;
      }
    }

    setStatus({ type: "loading", message: "" });
    try {
      const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
      const data = await apiRequest("me", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          fullName,
        }),
      });
      onProfileUpdate(data.user);
      setForm((current) => ({ ...current, newPassword: "", repeatPassword: "" }));
      setStatus({ type: "success", message: "تغییرات پروفایل ذخیره شد." });
      window.setTimeout(() => setStatus({ type: "idle", message: "" }), 2600);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const userName = displayUserName(user);
  const userPhone = user?.phone || form.phone;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <form onSubmit={handleSubmit} className="overflow-hidden rounded-[28px] bg-white shadow-[0_26px_70px_rgba(70,88,116,0.08)]">
        <div className="flex flex-col gap-5 bg-[#f8fbff] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-9">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#d8dde6] text-[#7b8492]">
              <User className="h-9 w-9" />
            </div>
            <div className="text-right">
              <h1 className="text-2xl text-[#2f3f55]">{userName}</h1>
              <p className="mt-1 text-sm text-[#8593a8]">{userPhone ? toPersianDigits(userPhone) : "شماره ثبت نشده"}</p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#c08081] bg-white px-5 text-sm font-bold text-[#c08081] transition hover:bg-[#fff7f7]"
          >
            <Upload className="h-4 w-4" />
            آپلود تصویر
          </button>
        </div>

        <PanelSection title="مشخصات اصلی">
          <div className="grid gap-5 md:grid-cols-2">
            <PanelField label="نام" icon={User}>
              <PanelInput value={form.firstName} onChange={updateForm("firstName")} placeholder="نام" />
            </PanelField>
            <PanelField label="نام خانوادگی" icon={User}>
              <PanelInput value={form.lastName} onChange={updateForm("lastName")} placeholder="نام خانوادگی" />
            </PanelField>
            <PanelField label="ایمیل" icon={Mail}>
              <PanelInput value={form.email} onChange={updateForm("email")} type="email" placeholder="ایمیل" dir="ltr" />
            </PanelField>
            <PanelField label="تاریخ تولد">
              <PanelInput value={form.birthDate} onChange={updateForm("birthDate")} placeholder="تاریخ تولد" />
            </PanelField>
            <PanelField label="شماره تماس" icon={Phone}>
              <PanelInput value={form.phone} onChange={updateForm("phone")} type="tel" placeholder="شماره تماس" />
            </PanelField>
          </div>
        </PanelSection>

        <PanelSection title="تنظیمات رمز">
          <div className="grid gap-5 md:grid-cols-2">
            <PanelField label="رمز جدید">
              <PasswordInput
                value={form.newPassword}
                onChange={updateForm("newPassword")}
                placeholder="رمز جدید"
                visible={visiblePasswords.newPassword}
                onToggleVisibility={() =>
                  setVisiblePasswords((current) => ({ ...current, newPassword: !current.newPassword }))
                }
              />
            </PanelField>
            <PanelField label="تکرار رمز جدید">
              <PasswordInput
                value={form.repeatPassword}
                onChange={updateForm("repeatPassword")}
                placeholder="تکرار رمز جدید"
                visible={visiblePasswords.repeatPassword}
                onToggleVisibility={() =>
                  setVisiblePasswords((current) => ({ ...current, repeatPassword: !current.repeatPassword }))
                }
              />
            </PanelField>
          </div>
        </PanelSection>

        <PanelSection title="سایر مشخصات">
          <div className="grid gap-5 md:grid-cols-2">
            <PanelField label="صفحه اینستاگرام" icon={AtSign}>
              <PanelInput value={form.instagram} onChange={updateForm("instagram")} placeholder="صفحه اینستاگرام" dir="ltr" />
            </PanelField>
            <PanelField label="آدرس وب‌سایت" icon={Globe2}>
              <PanelInput value={form.website} onChange={updateForm("website")} placeholder="آدرس وب‌سایت" dir="ltr" />
            </PanelField>
          </div>
        </PanelSection>

        <PanelSection title="تنظیمات اطلاع‌رسانی">
          <div className="grid gap-4 md:grid-cols-2">
            <PanelSwitch
              checked={notifications.email}
              onChange={(value) => setNotifications((current) => ({ ...current, email: value }))}
              label="دریافت ایمیل اطلاع‌رسانی"
            />
            <PanelSwitch
              checked={notifications.sms}
              onChange={(value) => setNotifications((current) => ({ ...current, sms: value }))}
              label="دریافت پیامک تخفیف"
            />
          </div>
        </PanelSection>

        <div className="flex flex-col gap-3 border-t border-dashed border-[#dfe7f1] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-9">
          <p
            className={`min-h-6 text-sm ${status.type === "error" ? "text-[#b85d60]" : "text-[#5b8c67]"}`}
            aria-live="polite"
          >
            {status.message}
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2ecf7f] px-6 text-sm font-bold text-white shadow-[0_14px_32px_rgba(46,207,127,0.22)] transition hover:-translate-y-0.5 hover:bg-[#25bd72] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isSaving ? "در حال ذخیره" : "ثبت تغییرات"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_26px_70px_rgba(70,88,116,0.08)]">
        <AddressManager />
      </div>
    </div>
  );
}

function PanelCourseCard({ course, progress }) {
  const lessonsCount = getCourseLessons(course).length;
  const statusLabel = getCourseStatusLabel(progress);

  return (
    <motion.article whileHover={{ y: -8 }} transition={{ duration: 0.28 }} className="h-full">
      <Link
        to={`/panel/courses/${course.id}`}
        className="group relative flex aspect-[0.76] min-h-[360px] overflow-hidden rounded-[24px] bg-[#172235] text-white shadow-[0_22px_52px_rgba(39,54,77,0.15)]"
      >
        <img
          src={course.cover}
          alt={course.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,28,45,0.5)_0%,rgba(16,28,45,0.18)_38%,rgba(16,28,45,0.9)_100%)]" />

        <div className="relative z-10 flex w-full flex-col justify-between p-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3 text-sm font-bold">
              <span>{statusLabel}</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff5b75] text-white">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-[#ff6b78]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl leading-9 text-white drop-shadow-md">{course.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-white/78">{course.subtitle}</p>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-white/78">
              <span>{toPersianDigits(lessonsCount)} درس</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/14 px-3 py-1.5 text-white backdrop-blur">
                ورود به دوره
                <ChevronLeft className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function PanelCoursesPage({ user }) {
  usePanelSEO("دوره‌های من");

  const [progressByCourse, setProgressByCourse] = useState(() => readPanelProgress(user?.id));
  const [availableCourses, setAvailableCourses] = useState(panelCourses);
  const accessibleCourses = availableCourses.filter((course) => userHasPanelCourseAccess(user, course));

  useEffect(() => {
    setProgressByCourse(readPanelProgress(user?.id));
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        const data = await apiRequest("courses");
        if (cancelled) return;
        const normalizedCourses = (data.courses || []).map(normalizeCourseForPanel).filter(Boolean);
        setAvailableCourses(normalizedCourses.length > 0 ? normalizedCourses : panelCourses);
      } catch {
        if (!cancelled) setAvailableCourses(panelCourses);
      }
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-8 text-right">
        <h1 className="text-3xl leading-tight text-[#2f3f55] md:text-4xl">دوره‌هایی که خریدید</h1>
        <p className="mt-2 text-sm text-[#7d8ca3]">دسترسی‌های فعال حساب شما در گلملو</p>
      </div>

      {accessibleCourses.length > 0 ? (
        <div className="grid max-w-4xl gap-6 md:grid-cols-2">
          {accessibleCourses.map((course) => (
            <PanelCourseCard key={course.id} course={course} progress={getCourseProgress(course, progressByCourse)} />
          ))}
        </div>
      ) : (
        <div className="mx-auto grid min-h-[320px] max-w-xl place-items-center rounded-[28px] bg-white p-8 text-center shadow-[0_22px_58px_rgba(70,88,116,0.08)]">
          <div>
            <BookOpen className="mx-auto h-10 w-10 text-[#c08081]" />
            <h2 className="mt-5 text-2xl text-[#2f3f55]">هنوز به دوره‌ای دسترسی ندارید.</h2>
            <Link
              to="/#courses"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.24)] transition hover:-translate-y-0.5"
            >
              مشاهده دوره‌ها
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function PanelVideoFrame({
  course,
  lesson,
  isPlaying,
  onPlay,
  onTimeChange,
  onEnded,
  currentSecond = 0,
  durationSeconds = 600,
}) {
  const videoRef = useRef(null);
  const progress = durationSeconds > 0 ? Math.min(100, Math.max(0, (currentSecond / durationSeconds) * 100)) : 0;

  useEffect(() => {
    if (!lesson.videoUrl || !videoRef.current) return;
    videoRef.current.currentTime = currentSecond;
  }, [lesson.id, lesson.videoUrl]);

  useEffect(() => {
    if (!lesson.videoUrl || !videoRef.current) return;

    if (isPlaying) {
      videoRef.current.play().catch(() => { });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, lesson.videoUrl]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-[26px] bg-[#101a2a] shadow-[0_26px_70px_rgba(39,54,77,0.14)]">
      {lesson.videoUrl ? (
        <video
          ref={videoRef}
          src={lesson.videoUrl}
          poster={lesson.thumbnail || course.cover}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          onTimeUpdate={(event) => onTimeChange?.(event.currentTarget.currentTime)}
          onEnded={onEnded}
        />
      ) : (
        <img src={lesson.thumbnail || course.cover} alt={lesson.title} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,22,35,0.75)_0%,rgba(13,22,35,0.2)_52%,rgba(13,22,35,0.68)_100%)]" />
      <button
        type="button"
        onClick={onPlay}
        className="absolute left-1/2 top-1/2 inline-flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[24px] bg-[#ff7448] text-white shadow-[0_18px_42px_rgba(255,116,72,0.34)] transition hover:scale-105"
        aria-label="پخش درس"
      >
        <Play className="h-9 w-9 fill-current" />
      </button>
      <div className="absolute bottom-6 right-6 max-w-sm text-right">
        <p className="text-sm font-bold text-[#ffd0c2]">{lesson.chapterTitle}</p>
        <h2 className="mt-2 text-3xl leading-10 text-white">{lesson.title}</h2>
        <p className="mt-2 text-sm text-white/75">
          {isPlaying ? "در حال پخش" : "آماده پخش"} از {formatPlaybackTime(currentSecond)}
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/18">
        <div className="h-full bg-[#ff7448]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function PanelLessonButton({ lesson, isActive, isWatched, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm transition ${isActive ? "bg-[#f4f7fb] text-[#26364c]" : "text-[#64748b] hover:bg-[#f8fafc]"
        }`}
    >
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-[#ff6b78] text-white" : isWatched ? "bg-[#edf7f0] text-[#50a568]" : "bg-[#eef3f9] text-[#91a0b5]"
          }`}
      >
        {isWatched ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
      <span className="shrink-0 text-xs text-[#9aa8ba]">{lesson.duration}</span>
    </button>
  );
}

function PanelCourseSyllabus({
  course,
  progress,
  watchedLessonIds,
  activeLessonId,
  openChapterIds,
  onToggleChapter,
  onSelectLesson,
}) {
  return (
    <aside className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(70,88,116,0.08)] lg:sticky lg:top-7 lg:max-h-[calc(100vh-56px)] lg:self-start lg:[direction:rtl]">
      <div className="bg-[linear-gradient(135deg,#f1f3f6_0%,#ffffff_100%)] px-6 py-7">
        <h2 className="text-2xl leading-9 text-[#2f3f55]">{course.title}</h2>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-[#7d8ca3]">
            <span>پیشرفت دوره</span>
            <span>{toPersianDigits(progress)}٪</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e8eef6]">
            <div className="h-full rounded-full bg-[#c08081]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="max-h-none space-y-3 overflow-y-auto p-5 lg:max-h-[calc(100vh-240px)]">
        {getCourseChapters(course).map((chapter, chapterIndex) => {
          const isOpen = openChapterIds.has(chapter.id);
          return (
            <section key={chapter.id} className="border-b border-[#edf1f6] pb-3 last:border-b-0">
              <button
                type="button"
                onClick={() => onToggleChapter(chapter.id)}
                className="flex w-full items-center gap-3 py-3 text-right"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f4f8] text-sm font-bold text-[#697890]">
                  {toPersianDigits(chapterIndex + 1)}
                </span>
                <span className="min-w-0 flex-1 font-bold text-[#2f3f55]">{chapter.title}</span>
                <ChevronDown className={`h-5 w-5 text-[#9aa8ba] transition ${isOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pb-2">
                      {chapter.lessons.map((lesson) => (
                        <PanelLessonButton
                          key={lesson.id}
                          lesson={lesson}
                          isActive={activeLessonId === lesson.id}
                          isWatched={watchedLessonIds.has(lesson.id)}
                          onClick={() => onSelectLesson(lesson.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function PanelCourseDetailPage({ user }) {
  const { id } = useParams();
  const staticCourse = panelCourses.find((item) => item.id === id || (item.accessIds || []).includes(id));
  const [remoteCourse, setRemoteCourse] = useState(null);
  const [loadStatus, setLoadStatus] = useState({ type: staticCourse ? "idle" : "loading", message: "" });
  const course = remoteCourse || staticCourse;
  const lessons = useMemo(() => (course ? getCourseLessons(course) : []), [course]);
  const [progressByCourse, setProgressByCourse] = useState(() => readPanelProgress(user?.id));
  const initialRecord = course ? getPanelProgressRecord(progressByCourse, course.id) : normalizePanelProgressRecord(null);
  const initialWatchedLessonIds = course ? getWatchedLessonIds(course, progressByCourse) : new Set();
  const savedLesson = lessons.find((lesson) => lesson.id === initialRecord.lastLessonId);
  const firstOpenLesson = savedLesson || lessons.find((lesson) => !initialWatchedLessonIds.has(lesson.id)) || lessons[0];
  const [activeLessonId, setActiveLessonId] = useState(firstOpenLesson?.id || "");
  const [openChapterIds, setOpenChapterIds] = useState(() => new Set(firstOpenLesson ? [firstOpenLesson.chapterId] : []));
  const [currentSecond, setCurrentSecond] = useState(savedLesson ? initialRecord.currentTime : 0);
  const [isPlaying, setIsPlaying] = useState(Boolean(savedLesson && initialRecord.currentTime > 0));
  const progressRuntimeRef = useRef({});

  usePanelSEO(course?.title || "دوره");

  const hasAccess = userHasPanelCourseAccess(user, course);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) || lessons[0];
  const activeLessonIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
  const activeLessonDuration = durationToSeconds(activeLesson?.duration, 600);
  const progress = course ? getCourseProgress(course, progressByCourse) : 0;
  const watchedLessonIds = course ? getWatchedLessonIds(course, progressByCourse) : new Set();
  const previousLesson = activeLessonIndex > 0 ? lessons[activeLessonIndex - 1] : null;
  const nextLesson = activeLessonIndex >= 0 && activeLessonIndex < lessons.length - 1 ? lessons[activeLessonIndex + 1] : null;
  const isComplete = course && progress >= 100;

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      setRemoteCourse(null);
      setLoadStatus({ type: staticCourse ? "idle" : "loading", message: "" });
      try {
        const data = await apiRequest(`courses/${id}`);
        if (cancelled) return;
        setRemoteCourse(normalizeCourseForPanel(data.course));
        setLoadStatus({ type: "idle", message: "" });
      } catch (error) {
        if (cancelled) return;
        if (!staticCourse) {
          setLoadStatus({ type: "error", message: error.message });
        }
      }
    }

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [id, staticCourse]);

  useEffect(() => {
    if (!course || !firstOpenLesson) return;

    const nextProgress = readPanelProgress(user?.id);
    const nextRecord = getPanelProgressRecord(nextProgress, course.id);
    const nextSavedLesson = lessons.find((lesson) => lesson.id === nextRecord.lastLessonId);
    const nextLesson = nextSavedLesson || lessons.find((lesson) => !getWatchedLessonIds(course, nextProgress).has(lesson.id)) || lessons[0];

    setProgressByCourse(nextProgress);
    setActiveLessonId(nextLesson?.id || "");
    setOpenChapterIds(new Set(nextLesson ? [nextLesson.chapterId] : []));
    setCurrentSecond(nextSavedLesson && nextLesson?.id === nextSavedLesson.id ? nextRecord.currentTime : 0);
    setIsPlaying(Boolean(nextSavedLesson && nextRecord.currentTime > 0));
  }, [course?.id, user?.id]);

  useEffect(() => {
    progressRuntimeRef.current = {
      courseID: course?.id || "",
      lessonID: activeLesson?.id || "",
      currentSecond,
      durationSeconds: activeLessonDuration,
    };
  }, [activeLesson?.id, activeLessonDuration, course?.id, currentSecond]);

  const persistRuntimeProgress = useCallback(
    ({ markWatched = false } = {}) => {
      const runtime = progressRuntimeRef.current;
      if (!runtime.courseID || !runtime.lessonID) return;

      const shouldMarkWatched =
        markWatched || runtime.currentSecond >= Math.min(runtime.durationSeconds * 0.85, runtime.durationSeconds - 8);
      const nextProgress = updateStoredPanelProgress(user?.id, runtime.courseID, (record) => {
        const watchedLessonIds = new Set(record.watchedLessonIds);
        if (shouldMarkWatched) watchedLessonIds.add(runtime.lessonID);

        return {
          ...record,
          watchedLessonIds: [...watchedLessonIds],
          lastLessonId: runtime.lessonID,
          currentTime: shouldMarkWatched ? 0 : runtime.currentSecond,
        };
      });
      setProgressByCourse(nextProgress);
    },
    [user?.id],
  );

  useEffect(() => {
    if (!activeLesson || !isPlaying || activeLesson.videoUrl) return undefined;

    const intervalId = window.setInterval(() => {
      setCurrentSecond((current) => {
        const next = Math.min(current + 1, activeLessonDuration);
        if (next >= activeLessonDuration) {
          window.clearInterval(intervalId);
          setIsPlaying(false);
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeLesson?.id, activeLessonDuration, isPlaying]);

  useEffect(() => {
    if (!activeLesson) return;
    if (currentSecond < activeLessonDuration) return;

    persistRuntimeProgress({ markWatched: true });
  }, [activeLesson, activeLessonDuration, currentSecond, persistRuntimeProgress]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      persistRuntimeProgress();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      persistRuntimeProgress();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [persistRuntimeProgress]);

  useEffect(() => {
    if (!activeLesson) return;

    setOpenChapterIds((current) => {
      if (current.has(activeLesson.chapterId)) return current;
      const next = new Set(current);
      next.add(activeLesson.chapterId);
      return next;
    });
  }, [activeLesson]);

  const selectLesson = (lessonId) => {
    persistRuntimeProgress();

    const storedProgress = readPanelProgress(user?.id);
    const storedRecord = course ? getPanelProgressRecord(storedProgress, course.id) : normalizePanelProgressRecord(null);
    const resumeSecond = storedRecord.lastLessonId === lessonId ? storedRecord.currentTime : 0;

    setActiveLessonId(lessonId);
    setCurrentSecond(resumeSecond);
    setIsPlaying(false);
  };

  const toggleChapter = (chapterId) => {
    setOpenChapterIds((current) => {
      const next = new Set(current);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  if (loadStatus.type === "loading") {
    return <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">در حال بارگذاری دوره...</div>;
  }

  if (!course || !activeLesson) {
    return (
      <div className="grid min-h-[60vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <BookOpen className="mx-auto h-10 w-10 text-[#c08081]" />
          <h1 className="mt-5 text-2xl text-[#2f3f55]">{loadStatus.message || "دوره پیدا نشد."}</h1>
          <Link
            to="/panel/courses"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white"
          >
            بازگشت به دوره‌ها
          </Link>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="grid min-h-[60vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <Lock className="mx-auto h-10 w-10 text-[#c08081]" />
          <h1 className="mt-5 text-2xl text-[#2f3f55]">این دوره هنوز برای حساب شما فعال نیست.</h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-[#7d8ca3]">از صفحه معرفی دوره درخواست خرید را ثبت کنید تا بعد از فعال‌سازی از همین مسیر وارد دوره شوید.</p>
          <Link
            to={`/courses/${course.slug || course.id}`}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white"
          >
            رفتن به صفحه دوره
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-6 flex flex-col gap-3 text-right sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#c08081]">{activeLesson.chapterTitle}</p>
          <h1 className="mt-1 text-3xl leading-tight text-[#2f3f55] md:text-4xl">{course.title}</h1>
        </div>
        <Link
          to="/panel/courses"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e1e8f2] bg-white px-4 text-sm text-[#617088] transition hover:border-[#c08081]/40 hover:text-[#c08081]"
        >
          <ChevronRight className="h-4 w-4" />
          دوره‌های من
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_370px] lg:[direction:ltr]">
        <div className="lg:[direction:rtl]">
          <PanelVideoFrame
            course={course}
            lesson={activeLesson}
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying((current) => !current)}
            onTimeChange={(nextSecond) => setCurrentSecond(Math.floor(nextSecond))}
            onEnded={() => {
              setCurrentSecond(activeLessonDuration);
              setIsPlaying(false);
            }}
            currentSecond={currentSecond}
            durationSeconds={activeLessonDuration}
          />

          <div className="mt-5 rounded-[24px] bg-white p-5 text-center shadow-[0_18px_46px_rgba(70,88,116,0.06)]">
            <p className="text-sm font-bold text-[#94a2b7]">{activeLesson.chapterTitle}</p>
            <h2 className="mt-2 text-2xl text-[#2f3f55]">{activeLesson.title}</h2>
            {isComplete ? (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#edf7f0] px-4 py-2 text-sm font-bold text-[#4d9a61]">
                <CheckCircle2 className="h-4 w-4" />
                دوره تکمیل شد
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!previousLesson}
              onClick={() => previousLesson && selectLesson(previousLesson.id)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe7f1] bg-white px-4 text-sm font-bold text-[#6f7e96] transition hover:border-[#c08081]/40 hover:text-[#c08081] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#dfe7f1] disabled:hover:text-[#6f7e96]"
            >
              <ChevronRight className="h-4 w-4" />
              بخش قبلی
            </button>
            <button
              type="button"
              disabled={!nextLesson}
              onClick={() => nextLesson && selectLesson(nextLesson.id)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-[#c08081]"
            >
              بخش بعدی
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        <PanelCourseSyllabus
          course={course}
          progress={progress}
          watchedLessonIds={watchedLessonIds}
          activeLessonId={activeLesson.id}
          openChapterIds={openChapterIds}
          onToggleChapter={toggleChapter}
          onSelectLesson={selectLesson}
        />
      </div>
    </section>
  );
}

function OrderStatusBadge({ status }) {
  const label = ORDER_STATUS_LABELS[status] || status || "نامشخص";
  const tone = {
    draft: "bg-[#f5f7fb] text-[#6f7e96]",
    delivered: "bg-[#edf7f0] text-[#4d9a61]",
    cancelled: "bg-[#fff1f1] text-[#b85d60]",
    ready: "bg-[#fff8e8] text-[#b07b28]",
    in_progress: "bg-[#eef6ff] text-[#4372a6]",
    confirmed: "bg-[#f1f4ff] text-[#5669b0]",
    need_more_info: "bg-[#fff7ed] text-[#b06d32]",
    pending_review: "bg-[#f5f7fb] text-[#6f7e96]",
  }[status] || "bg-[#f5f7fb] text-[#6f7e96]";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

function OrderThumbnail({ order, className = "aspect-square" }) {
  const cover = resolveApiURL(orderCoverImage(order));

  return (
    <div className={`${className} grid overflow-hidden rounded-2xl bg-[#f3f6fa]`}>
      {cover ? (
        <img src={cover} alt={orderDisplayTitle(order)} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-[#f8fafc] text-[#c08081]">
          <Send className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}

function PanelOrdersPage() {
  usePanelSEO("سفارش‌های من");

  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const [busyDraftId, setBusyDraftId] = useState("");

  const loadOrders = useCallback(async () => {
    setStatus({ type: "loading", message: "" });
    try {
      const data = await apiRequest("orders");
      setOrders(data.orders || []);
      setStatus({ type: "idle", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const deleteDraft = async (orderId) => {
    if (!window.confirm("این پیش‌نویس حذف شود؟")) return;

    setBusyDraftId(orderId);
    try {
      await apiRequest(`orders/${orderId}`, { method: "DELETE" });
      setOrders((current) => current.filter((order) => order.id !== orderId));
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusyDraftId("");
    }
  };

  const drafts = orders.filter((order) => order.status === "draft");
  const submittedOrders = orders.filter((order) => order.status !== "draft");
  const isEmpty = status.type !== "loading" && orders.length === 0;

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-8 flex flex-col gap-4 text-right sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl leading-tight text-[#2f3f55] md:text-4xl">سفارش‌های من</h1>
          <p className="mt-2 text-sm text-[#7d8ca3]">وضعیت سفارش‌های گل پارچه‌ای خود را تا زمان تحویل پیگیری کنید.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/panel/orders/new?type=custom"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.24)] transition hover:-translate-y-0.5"
          >
            سفارش اختصاصی
          </Link>
          <Link
            to="/products"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe7f1] bg-white px-5 text-sm font-bold text-[#617088] transition hover:border-[#c08081]/40 hover:text-[#c08081]"
          >
            انتخاب از محصولات
          </Link>
        </div>
      </div>

      {status.type === "loading" ? (
        <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">در حال بارگذاری سفارش‌ها...</div>
      ) : null}
      {status.type === "error" ? (
        <div className="rounded-[28px] border border-[#efb8ba] bg-[#fff6f6] p-8 text-center text-[#b85d60]">
          <p>{status.message}</p>
          <button type="button" onClick={loadOrders} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-[#b85d60]">
            تلاش دوباره
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="mx-auto grid min-h-[320px] max-w-xl place-items-center rounded-[28px] bg-white p-8 text-center shadow-[0_22px_58px_rgba(70,88,116,0.08)]">
          <div>
            <Send className="mx-auto h-10 w-10 text-[#c08081]" />
            <h2 className="mt-5 text-2xl text-[#2f3f55]">هنوز سفارشی ثبت نشده است.</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link to="/products" className="inline-flex h-12 items-center justify-center rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.24)] transition hover:-translate-y-0.5">
                مشاهده محصولات
              </Link>
              <Link to="/panel/orders/new?type=custom" className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dfe7f1] bg-white px-5 text-sm font-bold text-[#617088]">
                سفارش اختصاصی
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {drafts.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-right text-xl text-[#2f3f55]">پیش‌نویس‌ها</h2>
          <div className="grid gap-4">
            {drafts.map((order) => (
              <article
                key={order.id}
                className="grid gap-4 rounded-[24px] border border-dashed border-[#dfe7f1] bg-white p-5 text-right shadow-[0_18px_46px_rgba(70,88,116,0.05)] md:grid-cols-[96px_1fr_auto] md:items-center"
              >
                <OrderThumbnail order={order} />
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl text-[#2f3f55]">{orderDisplayTitle(order)}</h3>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="line-clamp-2 text-sm leading-7 text-[#708097]">
                    {orderSummaryText(order, "می‌توانید ثبت سفارش را ادامه دهید.")}
                  </p>
                  <p className="mt-2 text-xs text-[#9aa8ba]">آخرین تغییر: {formatPersianDate(order.updatedAt || order.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link
                    to={`/panel/orders/drafts/${order.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[#c08081] px-4 text-sm font-bold text-white"
                  >
                    ادامه ثبت سفارش
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteDraft(order.id)}
                    disabled={busyDraftId === order.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#f0d7d8] bg-white px-4 text-sm font-bold text-[#b85d60] disabled:opacity-60"
                  >
                    {busyDraftId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {submittedOrders.length > 0 ? (
        <section>
          <h2 className="mb-3 text-right text-xl text-[#2f3f55]">سفارش‌های ثبت‌شده</h2>
          <div className="grid gap-4">
            {submittedOrders.map((order) => (
              <Link
                key={order.id}
                to={`/panel/orders/${order.id}`}
                className="grid gap-4 rounded-[24px] bg-white p-5 text-right shadow-[0_18px_46px_rgba(70,88,116,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_56px_rgba(70,88,116,0.1)] md:grid-cols-[96px_1fr_auto] md:items-center"
              >
                <OrderThumbnail order={order} />
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl text-[#2f3f55]">{orderDisplayTitle(order)}</h2>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="line-clamp-2 text-sm leading-7 text-[#708097]">
                    {orderSummaryText(order)}
                  </p>
                  <p className="mt-2 text-xs text-[#9aa8ba]">ثبت: {formatPersianDate(order.submittedAt || order.createdAt)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-[#c08081]">
                  مشاهده جزئیات
                  <ChevronLeft className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function PanelNewOrderPage() {
  usePanelSEO("ثبت سفارش");

  const navigate = useNavigate();
  const location = useLocation();
  const startedRef = useRef(false);
  const query = new URLSearchParams(location.search);
  const productId = query.get("productId") || "";
  const requestedType = query.get("type") === "custom" ? "custom" : "product";
  const [status, setStatus] = useState({ type: "loading", message: "در حال آماده‌سازی پیش‌نویس سفارش..." });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (requestedType === "product" && !productId) {
      setStatus({ type: "error", message: "محصول انتخاب نشده است." });
      return;
    }

    async function createDraft() {
      setStatus({ type: "loading", message: "در حال آماده‌سازی پیش‌نویس سفارش..." });
      try {
        const data = await apiRequest("orders", {
          method: "POST",
          body: JSON.stringify({
            type: requestedType,
            productId: requestedType === "product" ? productId : "",
            status: "draft",
            quantity: 1,
          }),
        });
        navigate(`/panel/orders/drafts/${data.order.id}`, { replace: true });
      } catch (error) {
        setStatus({ type: "error", message: error.message });
      }
    }

    createDraft();
  }, [navigate, productId, requestedType]);

  return (
    <section className="py-6 lg:py-10">
      <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">
        {status.type === "loading" ? <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-[#c08081]" /> : null}
        <p className={status.type === "error" ? "text-[#b85d60]" : ""}>{status.message}</p>
        {status.type === "error" ? (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to="/products" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white">
              مشاهده محصولات
            </Link>
            <Link to="/panel/orders/new?type=custom" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe7f1] bg-white px-5 text-sm font-bold text-[#617088]">
              سفارش اختصاصی
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function orderFormFromOrder(order) {
  return {
    type: order?.type || "custom",
    productId: order?.productId || "",
    usage: order?.usage || "",
    usageOtherText: order?.usageOtherText || "",
    preferredColor: order?.preferredColor || "",
    styleNote: order?.styleNote || "",
    quantity: String(order?.quantity || 1),
    neededBy: order?.neededBy || "",
    customerNote: order?.customerNote || "",
    deliveryAddressId: order?.deliveryAddressId || "",
  };
}

function orderPayloadFromForm(form) {
  const quantity = Number.parseInt(normalizeDigits(String(form.quantity || "1")), 10);

  return {
    type: form.type,
    productId: form.productId,
    status: "draft",
    usage: form.usage,
    usageOtherText: form.usage === "other" ? form.usageOtherText : "",
    preferredColor: form.preferredColor,
    styleNote: form.styleNote,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    neededBy: form.neededBy,
    customerNote: form.customerNote,
    deliveryAddressId: form.deliveryAddressId,
  };
}

function ReferenceImagesField({ orderId, images = [], onImagesChange }) {
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const isUploading = status.type === "uploading";
  const resolvedImages = images.map((image) => ({ ...image, url: resolveApiURL(image.url) }));

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;
    if (images.length + files.length > 5) {
      setStatus({ type: "error", message: "حداکثر ۵ تصویر مرجع قابل آپلود است." });
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    setStatus({ type: "uploading", message: "" });
    try {
      const data = await apiRequest(`orders/${orderId}/reference-images`, {
        method: "POST",
        body: formData,
      });
      onImagesChange([...(images || []), ...(data.images || [])]);
      setStatus({ type: "success", message: "تصویر مرجع اضافه شد." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const deleteImage = async (imageId) => {
    setStatus({ type: "uploading", message: "" });
    try {
      await apiRequest(`orders/${orderId}/reference-images/${imageId}`, { method: "DELETE" });
      onImagesChange(images.filter((image) => image.id !== imageId));
      setStatus({ type: "success", message: "تصویر حذف شد." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  return (
    <section className="rounded-[24px] border border-[#edf1f6] bg-white p-5 text-right">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl text-[#2f3f55]">تصاویر مرجع</h2>
          <p className="mt-1 text-sm text-[#7d8ca3]">برای توضیح رنگ، فرم یا نمونه مشابه، تا ۵ تصویر اضافه کنید.</p>
        </div>
        <label className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#c08081] px-4 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.18)] ${isUploading ? "pointer-events-none opacity-70" : ""}`}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          افزودن تصویر
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="sr-only" disabled={isUploading} />
        </label>
      </div>

      {resolvedImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {resolvedImages.map((image) => (
            <div key={image.id} className="relative overflow-hidden rounded-2xl bg-[#f3f6fa]">
              <img src={image.url} alt="تصویر مرجع سفارش" className="aspect-square h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => deleteImage(image.id)}
                disabled={isUploading}
                className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-[#b85d60] shadow-[0_8px_20px_rgba(70,88,116,0.12)] disabled:opacity-60"
                aria-label="حذف تصویر"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-[#dfe7f1] bg-[#f8fafc] p-6 text-center text-sm text-[#7d8ca3]">
          هنوز تصویر مرجعی اضافه نشده است.
        </div>
      )}

      {status.message ? (
        <p className={`mt-3 min-h-5 text-sm ${status.type === "error" ? "text-[#b85d60]" : "text-[#5b8c67]"}`}>{status.message}</p>
      ) : null}
    </section>
  );
}

function DraftOrderEditor({ order, onOrderChange }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => orderFormFromOrder(order));
  const [images, setImages] = useState(order.referenceImages || []);
  const [saveStatus, setSaveStatus] = useState({ type: "idle", message: "" });
  const [submitStatus, setSubmitStatus] = useState({ type: "idle", message: "" });
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const autosaveTimerRef = useRef(null);
  const isProductOrder = form.type === "product";
  const isSaving = saveStatus.type === "saving";
  const isSubmitting = submitStatus.type === "submitting";

  useEffect(() => {
    setForm(orderFormFromOrder(order));
    setImages(order.referenceImages || []);
    setHasUserEdited(false);
  }, [order.id]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setHasUserEdited(true);
    setSaveStatus((current) => (current.type === "error" ? { type: "idle", message: "" } : current));
    setSubmitStatus((current) => (current.type === "error" ? { type: "idle", message: "" } : current));
  };

  const updateValue = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setHasUserEdited(true);
  };

  const saveDraft = useCallback(async ({ silent = false } = {}) => {
    if (!order.id) return null;
    if (!silent) setSaveStatus({ type: "saving", message: "" });

    const data = await apiRequest(`orders/${order.id}`, {
      method: "PATCH",
      body: JSON.stringify(orderPayloadFromForm(form)),
    });

    onOrderChange(data.order);
    setImages(data.order.referenceImages || images);
    setSaveStatus({ type: "success", message: "پیش‌نویس ذخیره شد." });
    return data.order;
  }, [form, images, onOrderChange, order.id]);

  useEffect(() => {
    if (!hasUserEdited || !order.id) return undefined;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = window.setTimeout(() => {
      saveDraft({ silent: true }).catch((error) => {
        setSaveStatus({ type: "error", message: error.message });
      });
    }, 1600);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [form, hasUserEdited, order.id, saveDraft]);

  const validateForSubmit = () => {
    if (!form.deliveryAddressId) return "انتخاب آدرس تحویل الزامی است.";
    if (form.type === "custom" && !form.usage) return "نوع استفاده را انتخاب کنید.";
    if (form.type === "custom" && !form.customerNote.trim()) return "توضیح سفارش اختصاصی الزامی است.";
    return "";
  };

  const handleManualSave = async () => {
    try {
      await saveDraft();
      setHasUserEdited(false);
    } catch (error) {
      setSaveStatus({ type: "error", message: error.message });
    }
  };

  const handleSubmitOrder = async () => {
    const validationError = validateForSubmit();
    if (validationError) {
      setSubmitStatus({ type: "error", message: validationError });
      return;
    }

    setSubmitStatus({ type: "submitting", message: "" });
    try {
      await saveDraft({ silent: true });
      const data = await apiRequest(`orders/${order.id}/submit`, { method: "POST" });
      navigate(`/panel/orders/${data.order.id}`, { replace: true });
    } catch (error) {
      setSubmitStatus({ type: "error", message: error.message });
    }
  };

  const productSnapshot = order.productSnapshot || {};

  return (
    <section className="grid gap-6 rounded-[28px] bg-white p-5 text-right shadow-[0_26px_70px_rgba(70,88,116,0.08)] lg:grid-cols-[300px_1fr] lg:p-7">
      <aside className="overflow-hidden rounded-[24px] border border-[#edf1f6] bg-[#f8fafc] lg:self-start">
        {isProductOrder ? (
          <>
            <div className="aspect-square overflow-hidden bg-[#eef3f9]">
              {productSnapshot.coverImageUrl ? (
                <img src={resolveApiURL(productSnapshot.coverImageUrl)} alt={productSnapshot.title} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="text-xl text-[#2f3f55]">{productSnapshot.title || "محصول انتخاب‌شده"}</h2>
              <p className="mt-2 text-sm leading-7 text-[#708097]">{productSnapshot.shortDescription}</p>
              <p className="mt-3 text-sm font-bold text-[#c08081]">{productSnapshot.priceLabel || "پس از بررسی اعلام می‌شود"}</p>
              {order.productId ? (
                <Link to={`/products/${productSnapshot.slug || order.productId}`} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#dfe7f1] bg-white px-4 text-xs font-bold text-[#617088]">
                  مشاهده محصول
                </Link>
              ) : null}
            </div>
          </>
        ) : (
          <div className="grid min-h-[260px] place-items-center p-6 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#fff1f1] text-[#c08081]">
                <Plus className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-2xl text-[#2f3f55]">سفارش اختصاصی</h2>
              <p className="mt-3 text-sm leading-7 text-[#708097]">جزئیات محصولی را که در ذهن دارید ثبت کنید تا بررسی و قیمت‌گذاری شود.</p>
            </div>
          </div>
        )}
      </aside>

      <div className="grid content-start gap-5">
        <section className="rounded-[24px] border border-[#edf1f6] bg-white p-5">
          <h2 className="mb-5 text-xl text-[#2f3f55]">جزئیات سفارش</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <PanelField label="کاربرد سفارش">
              <select
                value={form.usage}
                onChange={updateField("usage")}
                className="h-[52px] rounded-2xl border border-transparent bg-[#f8fafc] px-4 text-sm text-[#2e3d54] outline-none transition focus:border-[#c08081]/60 focus:bg-white"
              >
                <option value="">انتخاب کنید</option>
                {CUSTOM_USAGE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </PanelField>
            {form.usage === "other" ? (
              <PanelField label="توضیح کاربرد">
                <PanelInput value={form.usageOtherText} onChange={updateField("usageOtherText")} placeholder="مثلاً اکسسوری دکور یا کاربرد خاص" />
              </PanelField>
            ) : null}
            <PanelField label="رنگ ترجیحی">
              <PanelInput value={form.preferredColor} onChange={updateField("preferredColor")} placeholder="مثلاً سفید، کرم، قرمز" />
            </PanelField>
            <PanelField label="استایل یا حس موردنظر">
              <PanelInput value={form.styleNote} onChange={updateField("styleNote")} placeholder="مثلاً ظریف، مینیمال، پرحجم" />
            </PanelField>
            <PanelField label="تعداد">
              <PanelInput value={form.quantity} onChange={updateField("quantity")} type="number" min="1" inputMode="numeric" />
            </PanelField>
            <PanelField label="تاریخ موردنیاز">
              <PanelInput value={form.neededBy} onChange={updateField("neededBy")} placeholder="مثلاً ۱۴۰۵/۰۵/۲۰" />
            </PanelField>
          </div>

          <label className="mt-5 grid gap-2 text-right text-sm text-[#7f8ea5]">
            {form.type === "custom" ? "توضیحات سفارش اختصاصی" : "توضیحات تکمیلی"}
            <textarea
              value={form.customerNote}
              onChange={updateField("customerNote")}
              rows={7}
              className="rounded-2xl border border-transparent bg-[#f8fafc] px-4 py-3 text-sm leading-7 text-[#2e3d54] outline-none transition placeholder:text-[#a8b4c5] focus:border-[#c08081]/60 focus:bg-white"
              placeholder="ابعاد، کاربرد، رنگ، محدودیت زمانی یا هر جزئیات مهم دیگر را بنویسید."
            />
          </label>
        </section>

        <ReferenceImagesField orderId={order.id} images={images} onImagesChange={setImages} />

        <section className="rounded-[24px] border border-[#edf1f6] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-right">
            <MapPin className="h-5 w-5 text-[#c08081]" />
            <h2 className="text-xl text-[#2f3f55]">آدرس تحویل</h2>
          </div>
          <AddressManager
            selectable
            selectedId={form.deliveryAddressId}
            onSelect={(addressId) => updateValue("deliveryAddressId", addressId)}
            compact
          />
        </section>

        <div className="flex flex-col gap-3 rounded-[24px] border border-[#edf1f6] bg-[#f8fafc] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className={`min-h-6 text-sm ${saveStatus.type === "error" || submitStatus.type === "error" ? "text-[#b85d60]" : "text-[#708097]"}`}>
            {submitStatus.message || saveStatus.message || "تغییرات به صورت پیش‌نویس ذخیره می‌شود."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving || isSubmitting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe7f1] bg-white px-5 text-sm font-bold text-[#617088] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره پیش‌نویس
            </button>
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={isSaving || isSubmitting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#c08081] px-6 text-sm font-bold text-white shadow-[0_14px_32px_rgba(192,128,129,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              ثبت نهایی سفارش
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PanelDraftOrderPage() {
  usePanelSEO("تکمیل سفارش");

  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState({ type: "loading", message: "" });

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setStatus({ type: "loading", message: "" });
      try {
        const data = await apiRequest(`orders/${id}`);
        if (cancelled) return;
        setOrder(data.order);
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status.type === "loading") {
    return <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">در حال بارگذاری پیش‌نویس...</div>;
  }

  if (!order) {
    return (
      <div className="grid min-h-[50vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <h1 className="text-2xl text-[#2f3f55]">{status.message || "پیش‌نویس پیدا نشد."}</h1>
          <Link to="/panel/orders" className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white">
            بازگشت به سفارش‌ها
          </Link>
        </div>
      </div>
    );
  }

  if (order.status !== "draft") {
    return (
      <div className="grid min-h-[50vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <OrderStatusBadge status={order.status} />
          <h1 className="mt-4 text-2xl text-[#2f3f55]">این سفارش قبلاً ثبت نهایی شده است.</h1>
          <Link to={`/panel/orders/${order.id}`} className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white">
            مشاهده جزئیات سفارش
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-6 flex flex-col gap-3 text-right sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl leading-tight text-[#2f3f55] md:text-4xl">
            {order.type === "custom" ? "تکمیل سفارش اختصاصی" : "تکمیل سفارش محصول"}
          </h1>
          <p className="mt-2 text-sm text-[#7d8ca3]">جزئیات، تصاویر مرجع و آدرس تحویل را ثبت کنید و سپس سفارش را نهایی کنید.</p>
        </div>
        <Link to="/panel/orders" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#e1e8f2] bg-white px-4 text-sm text-[#617088] transition hover:border-[#c08081]/40 hover:text-[#c08081]">
          بازگشت به سفارش‌ها
        </Link>
      </div>

      <DraftOrderEditor order={order} onOrderChange={setOrder} />
    </section>
  );
}

function PanelOrderDetailPage() {
  usePanelSEO("جزئیات سفارش");

  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState({ type: "loading", message: "" });

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setStatus({ type: "loading", message: "" });
      try {
        const data = await apiRequest(`orders/${id}`);
        if (cancelled) return;
        setOrder(data.order);
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status.type === "loading") {
    return <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">در حال بارگذاری سفارش...</div>;
  }

  if (!order) {
    return (
      <div className="grid min-h-[50vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <h1 className="text-2xl text-[#2f3f55]">{status.message || "سفارش پیدا نشد."}</h1>
          <Link to="/panel/orders" className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#c08081] px-5 text-sm font-bold text-white">
            بازگشت به سفارش‌ها
          </Link>
        </div>
      </div>
    );
  }

  const title = orderDisplayTitle(order);
  const cover = resolveApiURL(orderCoverImage(order));
  const address = order.deliveryAddressSnapshot || {};
  const referenceImages = order.referenceImages || [];

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-6 flex flex-col gap-3 text-right sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl leading-tight text-[#2f3f55] md:text-4xl">{title}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-[#7d8ca3]">ثبت شده در {formatPersianDate(order.submittedAt || order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === "draft" ? (
            <Link to={`/panel/orders/drafts/${order.id}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#c08081] px-4 text-sm font-bold text-white">
              ادامه پیش‌نویس
            </Link>
          ) : null}
          <Link to="/panel/orders" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#e1e8f2] bg-white px-4 text-sm text-[#617088] transition hover:border-[#c08081]/40 hover:text-[#c08081]">
            بازگشت به سفارش‌ها
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <section className="rounded-[28px] bg-white p-5 text-right shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
            <h2 className="text-xl text-[#2f3f55]">اطلاعات سفارش</h2>
            <div className="mt-5 grid gap-3 text-sm text-[#617088] md:grid-cols-2">
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">نوع سفارش</span>{order.type === "custom" ? "اختصاصی" : "محصول"}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">کاربرد</span>{order.usage === "other" ? order.usageOtherText || "سایر" : usageLabel(order.usage)}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">رنگ ترجیحی</span>{order.preferredColor || "-"}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">استایل</span>{order.styleNote || "-"}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">تعداد</span>{toPersianDigits(order.quantity || 1)}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">تاریخ موردنیاز</span>{order.neededBy || "-"}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">قیمت</span>{order.productSnapshot?.priceLabel || "پس از بررسی اعلام می‌شود"}</div>
            </div>
            <div className="mt-4 rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm leading-7 text-[#617088]">
              <span className="mb-1 block text-xs text-[#9aa8ba]">توضیحات شما</span>
              {order.customerNote || "-"}
            </div>
            {order.adminNote ? (
              <div className="mt-4 rounded-2xl border border-[#f0d7d8] bg-[#fff8f8] px-4 py-3 text-sm leading-7 text-[#8f5f61]">
                <span className="mb-1 block text-xs text-[#b06d6f]">یادداشت تیم گلملو</span>
                {order.adminNote}
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] bg-white p-5 text-right shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#c08081]" />
              <h2 className="text-xl text-[#2f3f55]">آدرس تحویل</h2>
            </div>
            {address.fullAddress ? (
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-4 text-sm leading-7 text-[#617088]">
                <p className="font-bold text-[#2f3f55]">{address.title || "آدرس تحویل"}</p>
                <p className="mt-2">{address.fullAddress}</p>
                {(address.receiverName || address.receiverPhone) ? (
                  <p className="mt-2 text-xs text-[#9aa8ba]">{[address.receiverName, address.receiverPhone].filter(Boolean).join(" · ")}</p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dfe7f1] bg-[#f8fafc] p-5 text-sm text-[#7d8ca3]">
                آدرس تحویل برای این سفارش ثبت نشده است.
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-5 text-right shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
            <h2 className="text-xl text-[#2f3f55]">تصاویر مرجع</h2>
            {referenceImages.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {referenceImages.map((image) => (
                  <a key={image.id} href={resolveApiURL(image.url)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl bg-[#f3f6fa]">
                    <img src={resolveApiURL(image.url)} alt="تصویر مرجع سفارش" className="aspect-square h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#dfe7f1] bg-[#f8fafc] p-5 text-center text-sm text-[#7d8ca3]">
                تصویر مرجعی برای این سفارش ثبت نشده است.
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-5 text-right shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
            <h2 className="text-xl text-[#2f3f55]">روند وضعیت سفارش</h2>
            <div className="mt-5 grid gap-3">
              {(order.statusHistory || []).map((entry, index) => (
                <div key={`${entry.status}-${entry.createdAt}-${index}`} className="flex gap-3 rounded-2xl bg-[#f8fafc] p-4">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#c08081]" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusBadge status={entry.status} />
                      <span className="text-xs text-[#9aa8ba]">{formatPersianDate(entry.createdAt)}</span>
                    </div>
                    {entry.note ? <p className="mt-2 text-sm leading-7 text-[#617088]">{entry.note}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(70,88,116,0.08)] lg:self-start">
          <div className="aspect-square bg-[#eef3f9]">
            {cover ? (
              <img src={cover} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-[#c08081]">
                <Send className="h-14 w-14" />
              </div>
            )}
          </div>
          <div className="p-5 text-right">
            <h2 className="text-xl text-[#2f3f55]">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-[#708097]">
              {order.productSnapshot?.shortDescription || "سفارش اختصاصی شما بر اساس توضیحات و تصاویر مرجع بررسی می‌شود."}
            </p>
            {order.productId ? (
              <Link to={`/products/${order.productSnapshot?.slug || order.productId}`} className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-[#e1e8f2] bg-white px-4 text-sm font-bold text-[#c08081]">
                مشاهده محصول
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
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

  const renderPanel = (content) => (
    <PanelRoute authStatus={authStatus} user={user}>
      <PanelLayout user={user} onLogout={handleLogout} isLoggingOut={isLoggingOut}>
        {content}
      </PanelLayout>
    </PanelRoute>
  );

  return (
    <Routes>
      <Route path="/" element={<MelodyLandingPage authStatus={authStatus} user={user} />} />
      <Route path="/products" element={<ProductsPage authStatus={authStatus} user={user} />} />
      <Route path="/products/:id" element={<ProductDetailPage authStatus={authStatus} user={user} />} />
      <Route path="/custom-order" element={<Navigate to="/products" replace />} />
      <Route path="/courses" element={<CoursesPage authStatus={authStatus} user={user} />} />
      <Route path="/courses/:id" element={<CourseDetailPage authStatus={authStatus} user={user} />} />
      <Route path="/auth" element={<AuthPage authStatus={authStatus} user={user} onAuthenticate={authenticate} />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/panel/login" element={<Navigate to="/auth" replace />} />
      <Route path="/panel" element={<Navigate to="/panel/orders" replace />} />
      <Route
        path="/panel/profile"
        element={renderPanel(<PanelProfilePage user={user} onProfileUpdate={handleProfileUpdate} />)}
      />
      <Route path="/panel/orders" element={renderPanel(<PanelOrdersPage />)} />
      <Route path="/panel/orders/new" element={renderPanel(<PanelNewOrderPage />)} />
      <Route path="/panel/orders/drafts/:id" element={renderPanel(<PanelDraftOrderPage />)} />
      <Route path="/panel/orders/:id" element={renderPanel(<PanelOrderDetailPage />)} />
      <Route path="/panel/courses" element={renderPanel(<PanelCoursesPage user={user} />)} />
      <Route path="/panel/courses/:id" element={renderPanel(<PanelCourseDetailPage user={user} />)} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
