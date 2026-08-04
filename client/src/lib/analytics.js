const MEASUREMENT_ID = (import.meta.env.VITE_GA4_MEASUREMENT_ID || "").trim();

const ALLOWED_PARAMETERS = new Set([
  "content_id",
  "content_type",
  "course_id",
  "course_status",
  "method",
  "order_type",
  "page_path",
  "product_id",
  "request_type",
  "source",
  "blog_id",
]);

let initialized = false;

export function initAnalytics() {
  if (!MEASUREMENT_ID || initialized || typeof window === "undefined") return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function trackPageView(pathname) {
  if (!MEASUREMENT_ID || typeof window === "undefined" || typeof window.gtag !== "function") return;
  const pagePath = safePath(pathname);
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: document.title,
  });
}

export function trackEvent(name, parameters = {}) {
  if (!MEASUREMENT_ID || typeof window === "undefined" || typeof window.gtag !== "function") return;
  const safeParameters = {};
  Object.entries(parameters).forEach(([key, value]) => {
    if (!ALLOWED_PARAMETERS.has(key)) return;
    if (!["string", "number", "boolean"].includes(typeof value)) return;
    safeParameters[key] = typeof value === "string" ? value.slice(0, 120) : value;
  });
  window.gtag("event", name, safeParameters);
}

function safePath(value) {
  const path = String(value || "/").split("?")[0].split("#")[0];
  return path.startsWith("/") ? path : "/";
}
