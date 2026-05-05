import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Flower2, Send, Sparkles } from "lucide-react";
import heroImage from "./assets/images-hero/hero.png";
import logoImage from "./assets/logo.png";
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

function apiEndpoint(path) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
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
    title: "Glow Petal",
    image: flowerImage1,
  },
  {
    title: "Quiet Bloom",
    image: flowerImage2,
  },
  {
    title: "Soft Shadow",
    image: flowerImage3,
  },
  {
    title: "Warm Motion",
    image: flowerImage4,
  },
];

const applications = [
  {
    title: "سنجاق سینه",
    desc: "لمسه‌ای از لطافت بر یقه و کت",
    image: styleImage1,
  },
  {
    title: "اکسسوری لباس",
    desc: "برای کمربند، سرشانه یا خطوط لباس",
    image: styleImage2,
  },
  {
    title: "اکسسوری کلاه",
    desc: "حضور گل روی فرم‌های نرم و کلاسیک",
    image: styleImage3,
  },
  {
    title: "اکسسوری مو",
    desc: "برای شینیون، هدبند یا جزئیات مو",
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

function SectionLabel({ children }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d8cbbd] bg-white/70 px-3 py-1 text-[11px] tracking-[0.22em] text-[#8f7f72] backdrop-blur-sm">
      <Sparkles className="h-3.5 w-3.5" />
      <span>{children}</span>
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
      <div className="mx-auto mb-5 h-44 w-44 overflow-hidden rounded-full border border-[#eadfd5] bg-[#f7f0e8] shadow-inner">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <h3 className="mb-2 text-xl text-[#4d4038]">{item.title}</h3>
      <p className="mx-auto max-w-[16rem] text-sm leading-7 text-[#7d6e63]">{item.desc}</p>
    </motion.div>
  );
}

function WorkCard({ item, index }) {
  return (
    <motion.article
      initial={{ y: 14 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className="group relative aspect-square overflow-hidden rounded-[26px] border border-[#e5dbd0] shadow-[0_12px_30px_rgba(83,63,47,0.12)]"
    >
      <img
        src={item.image}
        alt={item.alt}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      />
    </motion.article>
  );
}

export default function MelodyLandingPage() {
  const [activeSection, setActiveSection] = useState("hero");
  const [heroSlides, setHeroSlides] = useState([]);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [works, setWorks] = useState([]);
  const [contactForm, setContactForm] = useState({
    fullName: "",
    contact: "",
    message: "",
  });
  const [contactStatus, setContactStatus] = useState({ type: "idle", message: "" });
  const [coursePhone, setCoursePhone] = useState("");
  const [courseStatus, setCourseStatus] = useState({ type: "idle", message: "" });

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

    loadHeroSlides();
    loadProjectImages();

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
    if (contactStatus.type !== "success" && courseStatus.type !== "success") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (contactStatus.type === "success") {
        setContactStatus({ type: "idle", message: "" });
      }
      if (courseStatus.type === "success") {
        setCourseStatus({ type: "idle", message: "" });
      }
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [contactStatus.type, courseStatus.type]);

  const handleNavClick = (sectionId) => (event) => {
    event.preventDefault();
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;
    setActiveSection(sectionId);
    targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const activeNavItem = navItems.find((item) => item.id === activeSection) ?? navItems[0];
  const isSendingContactRequest = contactStatus.type === "loading";
  const isSubmittingCourseSignup = courseStatus.type === "loading";
  const successToastMessage = contactStatus.type === "success"
    ? contactStatus.message
    : courseStatus.type === "success"
      ? courseStatus.message
      : "";
  const heroSlidesForDisplay = heroSlides.length > 0
    ? heroSlides
    : [{ id: "hero-fallback", image: heroImage, alt: "گل پارچه‌ای golmelo" }];

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f1eb] text-[#493d37]">
      <AnimatePresence>
        {successToastMessage ? (
          <>
            <motion.div
              key="contact-success-overlay"
              className="pointer-events-none fixed inset-0 z-[60] bg-[linear-gradient(180deg,rgba(47,59,51,0.08)_0%,rgba(47,59,51,0.18)_52%,rgba(47,59,51,0.08)_100%)] backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            />
            <motion.div
              key="contact-success-toast"
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
              <span>{successToastMessage}</span>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-[#d7ddd4]/20 bg-[#2f3b33cc] px-5 py-3 text-[#f7eee4] shadow-[0_12px_40px_rgba(25,34,29,0.22)] backdrop-blur-md">
          <div className="flex items-center">
            <img
              src={logoImage}
              alt="golmelo logo"
              className="h-9 w-auto object-contain brightness-110"
            />
          </div>

          <div className="md:hidden">
            <motion.div
              key={activeNavItem.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="rounded-full border border-[#d7ddd4]/30 bg-[#51645a]/24 px-3 py-1.5 text-xs text-white/95 backdrop-blur-lg"
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
                  href={`#${item.id}`}
                  onClick={handleNavClick(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className="relative rounded-full px-4 py-2"
                >
                  {isActive ? (
                    <motion.span
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-full bg-[#51645a]/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_8px_24px_rgba(25,34,29,0.32)] backdrop-blur-xl"
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

      <section
        id="hero"
        className="relative isolate scroll-mt-28 overflow-hidden bg-[#2f3b33] text-[#fbf5ee] md:scroll-mt-32"
      >
        <div className="pointer-events-none absolute inset-0">
          {heroSlidesForDisplay.map((slide, index) => {
            const isActive = index === activeHeroSlide % heroSlidesForDisplay.length;

            return (
              <motion.img
                key={slide.id}
                src={slide.image}
                alt={slide.alt}
                initial={false}
                animate={{ opacity: isActive ? 1 : 0 }}
                transition={{ duration: 1.55, ease: [0.45, 0, 0.2, 1] }}
                style={{ zIndex: isActive ? 2 : 1 }}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            );
          })}
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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d7ddd4]/20 bg-[#51645a]/20 px-4 py-2 text-sm text-[#f0ddd1] backdrop-blur-sm">
              <Flower2 className="h-4 w-4" />
              golmelo، گل‌های پارچه‌ای دست‌ساز
            </div>
            <h1
              className="mb-6 text-5xl leading-[1.1] md:text-7xl"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.62), 0 1px 2px rgba(0,0,0,0.72)" }}
            >
              ظرافت گل‌ها
            </h1>
            <p
              className="max-w-lg text-lg leading-9 text-[#f7eadf]/92 md:text-xl"
              style={{ textShadow: "0 3px 18px rgba(0,0,0,0.58), 0 1px 2px rgba(0,0,0,0.68)" }}
            >
              golmelo زیبایی زنده و لطافت گل‌ها را از طبیعت الهام می‌گیرد و آن را به قطعاتی
              دست‌ساز، آرام و ماندگار تبدیل می‌کند؛ آثاری برای پوشیده‌شدن، دیده‌شدن و ماندن.
            </p>
            <div className="mt-8 flex flex-wrap justify-start gap-4 md:mt-10">
              <a
                href="#works"
                className="rounded-full bg-[#51645a] px-7 py-3.5 text-base text-white shadow-[0_14px_34px_rgba(81,100,90,0.32)] transition hover:-translate-y-0.5 hover:bg-[#44554c]"
              >
                دیدن نمونه‌کارها
              </a>
              <a
                href="#contact"
                className="rounded-full border border-[#d7ddd4]/50 bg-white/5 px-7 py-3.5 text-base text-white backdrop-blur-sm transition hover:bg-[#51645a]/20"
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
            <SectionLabel>الهام از طبیعت</SectionLabel>
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">الهام‌گرفته از زیبایی زنده</h2>
            <p className="text-lg leading-9 text-[#75655a]">
              هر گل نیروی آرام خود را دارد؛ لطافتی درونی، حرکتی نرم، و نظمی پنهان در دل طبیعت.
              این مجموعه از همین زیبایی زنده الهام می‌گیرد و آن را به زبانی تازه و لمس‌پذیر بازمی‌گوید.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 md:hidden">
            {flowerStudies.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className="aspect-[3/4] overflow-hidden rounded-[24px] border border-[#e7ddd2] shadow-[0_14px_35px_rgba(84,64,47,0.08)]"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </motion.div>
            ))}
          </div>

          <div className="relative mt-14 hidden min-h-[420px] md:block md:min-h-[500px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="absolute right-[18%] top-0 h-64 w-56 overflow-hidden rounded-[34px] border border-[#e8ddd0] shadow-[0_18px_45px_rgba(74,58,43,0.08)] md:h-72 md:w-60"
            >
              <img src={flowerStudies[0].image} alt={flowerStudies[0].title} loading="lazy" className="h-full w-full object-cover" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.06 }}
              className="absolute left-[8%] top-14 h-72 w-72 overflow-hidden rounded-[38px] border border-[#e5dbd0] shadow-[0_20px_52px_rgba(74,58,43,0.1)] md:h-80 md:w-80"
            >
              <img src={flowerStudies[1].image} alt={flowerStudies[1].title} loading="lazy" className="h-full w-full object-cover" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="absolute bottom-12 right-[6%] h-52 w-72 overflow-hidden rounded-[30px] border border-[#e6ddd2] shadow-[0_20px_48px_rgba(74,58,43,0.08)] md:h-56 md:w-80"
            >
              <img src={flowerStudies[2].image} alt={flowerStudies[2].title} loading="lazy" className="h-full w-full object-cover" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="absolute bottom-0 left-[28%] h-44 w-60 overflow-hidden rounded-[28px] border border-[#ebe0d4] shadow-[0_18px_45px_rgba(74,58,43,0.09)] md:h-48 md:w-64"
            >
              <img src={flowerStudies[3].image} alt={flowerStudies[3].title} loading="lazy" className="h-full w-full object-cover" />
            </motion.div>
          </div>
        </section>

        <section id="craft" className="scroll-mt-24 border-y border-[#ece3d8] bg-white/45 md:scroll-mt-28">
          <div className="mx-auto grid max-w-7xl gap-16 px-6 py-24 md:grid-cols-[0.95fr_1.05fr] md:px-8 lg:px-12">
            <div className="flex items-center">
              <div className="max-w-xl text-center">
                <SectionLabel>فرآیند ساخت</SectionLabel>
                <h2 className="mb-6 text-4xl leading-tight text-[#54463d] md:text-6xl">
                  ساخته ی دست
                </h2>
                <div className="mb-6 h-px w-24 bg-[#b77a78] mx-auto" />
                <p className="text-lg leading-9 text-[#6f6056]">
                  از انتخاب بافت‌های لطیف تا برش دقیق، فرم‌دهی آرام، دوخت‌های ظریف و ترکیب
                  لایه‌ها، هر قطعه با صبر و توجه ساخته می‌شود تا شکوه گل را به حضوری ماندگار و
                  پوشیدنی تبدیل کند.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:hidden">
              {[craftImage1, craftImage2, craftImage3, craftImage4].map((image, index) => (
                <div
                  key={`craft-mobile-${index + 1}`}
                  className="aspect-[3/4] overflow-hidden rounded-[24px] border border-[#e5dbd0] shadow-[0_14px_35px_rgba(74,58,43,0.08)]"
                >
                  <img
                    src={image}
                    alt={`بافت پارچه ${index + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="relative hidden min-h-[420px] md:block md:min-h-[500px]">
              <div className="absolute right-[18%] top-0 h-64 w-56 overflow-hidden rounded-[34px] border border-[#e8ddd0] shadow-[0_18px_45px_rgba(74,58,43,0.08)] md:h-72 md:w-60">
                <img src={craftImage1} alt="بافت پارچه ۱" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="absolute left-[8%] top-14 h-72 w-72 overflow-hidden rounded-[38px] border border-[#e5dbd0] shadow-[0_20px_52px_rgba(74,58,43,0.1)] md:h-80 md:w-80">
                <img src={craftImage2} alt="بافت پارچه ۲" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="absolute bottom-12 right-[6%] h-52 w-72 overflow-hidden rounded-[30px] border border-[#e6ddd2] shadow-[0_20px_48px_rgba(74,58,43,0.08)] md:h-56 md:w-80">
                <img src={craftImage3} alt="بافت پارچه ۳" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="absolute bottom-0 left-[28%] h-44 w-60 overflow-hidden rounded-[28px] border border-[#ebe0d4] shadow-[0_18px_45px_rgba(74,58,43,0.09)] md:h-48 md:w-64">
                <img src={craftImage4} alt="بافت پارچه ۴" loading="lazy" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        <section id="usage" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>کاربردها</SectionLabel>
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">
              برای پوشیده‌شدن، استایل‌شدن و ماندن
            </h2>
            <p className="text-lg leading-9 text-[#75655a]">
              این گل‌ها فراتر از تزئین طراحی شده‌اند؛ تا بخشی از بیان شخصی باشند و روی لباس،
              کلاه، مو یا جزئیات استایل، لطافتی آرام و ماندگار به همراه بیاورند.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {applications.map((item) => (
              <AppCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="overflow-hidden rounded-[34px] border border-[#e6dbcf] bg-[linear-gradient(135deg,#fbf7f1_0%,#f3ece4_100%)] shadow-[0_20px_50px_rgba(84,64,47,0.06)]">
            <div className="grid gap-8 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8 lg:p-10">
              <div className="relative text-right">
                <SectionLabel>سفارش و همکاری</SectionLabel>
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
                    className="h-14 rounded-2xl border border-[#e5d8cd] bg-white/70 px-4 text-[#54463d] outline-none placeholder:text-[#a39286] focus:border-[#51645a]"
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
                    className="inline-flex items-center gap-2 rounded-full bg-[#51645a] px-7 py-3.5 text-white shadow-[0_14px_32px_rgba(81,100,90,0.28)] transition hover:-translate-y-0.5 hover:bg-[#44554c] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
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
          <div className="overflow-hidden rounded-[34px] border border-[#e6dbcf] bg-[linear-gradient(135deg,#f9f4ec_0%,#efe4d6_100%)] shadow-[0_20px_50px_rgba(84,64,47,0.06)]">
            <div className="p-8 text-center md:p-10">
              <SectionLabel>دوره‌های آموزشی</SectionLabel>

              <h2 className="mb-4 text-3xl leading-tight text-[#4f4138] md:text-5xl">
                ثبت‌نام دوره‌های آموزش گل‌سازی به‌زودی
              </h2>
              <p className="mx-auto max-w-3xl text-base leading-8 text-[#75655a] md:text-lg md:leading-9">
                در حال آماده‌سازی دوره‌های آموزشی تخصصی گل‌سازی هستیم. به‌زودی زمان‌بندی و جزئیات
                کامل دوره‌ها برای ثبت‌نام اعلام می‌شود.
              </p>

              <form
                className="mx-auto mt-8 grid max-w-xl gap-3 text-right md:grid-cols-[1fr_auto] md:items-start"
                onSubmit={handleCourseSignupSubmit}
              >
                <input
                  value={coursePhone}
                  onChange={(event) => setCoursePhone(event.target.value)}
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9۰-۹٠-٩]+"
                  autoComplete="tel"
                  className="h-14 rounded-2xl border border-[#e0d2c4] bg-white/72 px-4 text-[#54463d] outline-none placeholder:text-[#a39286] focus:border-[#51645a]"
                  placeholder="شماره تلفن"
                />
                <button
                  type="submit"
                  disabled={isSubmittingCourseSignup}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#51645a] px-6 text-white shadow-[0_14px_30px_rgba(81,100,90,0.28)] transition hover:-translate-y-0.5 hover:bg-[#44554c] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
                >
                  <Send className="h-4 w-4" />
                  {isSubmittingCourseSignup ? "در حال ثبت" : "از شروع دوره‌های آموزشی با خبرم کن"}
                </button>
              </form>

              <p
                aria-live="polite"
                className={`mx-auto mt-3 max-w-xl text-right text-sm ${courseStatus.type === "error" ? "text-[#b85d60]" : "text-[#9b867d]"
                  }`}
              >
                {courseStatus.type === "success"
                  ? "شماره شما امن و محرمانه خواهد ماند."
                  : courseStatus.message || "فقط شماره تلفن خود را وارد کنید."}
              </p>
            </div>
          </div>
        </section>

        <section id="works" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-24 md:scroll-mt-28 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Selected Works</SectionLabel>
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">نمونه‌کارهای منتخب</h2>
            <p className="text-lg leading-9 text-[#75655a]">
              مجموعه‌ای از قطعات منتخب که هرکدام روایتی متفاوت از لطافت، بافت، فرم و حضور گل در
              استایل را به نمایش می‌گذارند.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {works.map((item, index) => (
              <WorkCard key={item.id} item={item} index={index} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
