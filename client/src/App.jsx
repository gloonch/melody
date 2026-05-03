import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flower2, Send, Sparkles } from "lucide-react";
import heroImage from "./assets/images-hero/hero.png";
import typographyImage from "./assets/typography.png";
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

const projectImages = [
  ...Object.entries(
    import.meta.glob("./assets/project_images/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  ),
]
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB, undefined, { numeric: true }))
  .map(([, source]) => source);

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

const works = projectImages.map((image, index) => ({
  id: `work-${index + 1}`,
  alt: `نمونه‌کار ${index + 1}`,
  image,
}));

const navItems = [
  { id: "hero", label: "خانه" },
  { id: "inspiration", label: "الهام" },
  { id: "craft", label: "فرآیند ساخت" },
  { id: "usage", label: "کاربردها" },
  { id: "contact", label: "سفارش" },
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

  const handleNavClick = (sectionId) => (event) => {
    event.preventDefault();
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;
    setActiveSection(sectionId);
    targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const activeNavItem = navItems.find((item) => item.id === activeSection) ?? navItems[0];

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f1eb] text-[#493d37]">
      <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/20 bg-[#3f271dcc]/55 px-5 py-3 text-[#f7eee4] shadow-[0_12px_40px_rgba(35,18,10,0.18)] backdrop-blur-md">
          <div className="flex items-center">
            <img
              src={typographyImage}
              alt="Melody Typography"
              className="h-9 w-auto object-contain brightness-110"
            />
          </div>

          <div className="md:hidden">
            <motion.div
              key={activeNavItem.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs text-white/95 backdrop-blur-lg"
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
                      className="absolute inset-0 rounded-full bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_8px_24px_rgba(18,8,4,0.28)] backdrop-blur-xl"
                      transition={{ type: "spring", stiffness: 430, damping: 38, mass: 0.85 }}
                    />
                  ) : null}
                  <span
                    className={`relative z-10 transition-colors duration-300 ${isActive ? "text-white" : "text-[#f7eee4]/82 hover:text-white"
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
        className="relative isolate scroll-mt-28 overflow-hidden bg-[#4b2f20] text-[#fbf5ee] md:scroll-mt-32"
      >
        <img
          src={heroImage}
          alt="گل پارچه‌ای ملودی"
          className="absolute inset-0 h-full w-full object-cover object-center "
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[48%] bg-[linear-gradient(180deg,rgba(10,4,2,0.97)_0%,rgba(24,12,8,0.9)_32%,rgba(42,24,16,0.72)_62%,rgba(60,37,26,0.45)_82%,rgba(75,47,32,0.14)_100%)] md:h-[62%]" />

        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl items-center gap-10 px-6 pb-24 pt-16 md:grid-cols-[1.05fr_0.95fr] md:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl text-right"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-[#f0ddd1] backdrop-blur-sm">
              <Flower2 className="h-4 w-4" />
              ملودی، گل‌های پارچه‌ای دست‌ساز
            </div>
            <h1 className="mb-6 text-5xl leading-[1.1] md:text-7xl">ظرافت گل‌ها</h1>
            <p className="max-w-lg text-lg leading-9 text-[#f7eadf]/92 md:text-xl">
              Melody زیبایی زنده و لطافت گل‌ها را از طبیعت الهام می‌گیرد و آن را به قطعاتی
              دست‌ساز، آرام و ماندگار تبدیل می‌کند؛ آثاری برای پوشیده‌شدن، دیده‌شدن و ماندن.
            </p>
            <div className="mt-8 flex flex-wrap justify-start gap-4 md:mt-10">
              <a
                href="#works"
                className="rounded-full bg-[#c08081] px-7 py-3.5 text-base text-white shadow-[0_14px_34px_rgba(192,128,129,0.35)] transition hover:-translate-y-0.5"
              >
                دیدن نمونه‌کارها
              </a>
              <a
                href="#contact"
                className="rounded-full border border-white/40 bg-white/5 px-7 py-3.5 text-base text-white backdrop-blur-sm transition hover:bg-white/10"
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
              Melody از همین زیبایی زنده الهام می‌گیرد و آن را به زبانی تازه و لمس‌پذیر بازمی‌گوید.
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
              <div className="max-w-xl text-right">
                <SectionLabel>فرآیند ساخت</SectionLabel>
                <h2 className="mb-6 text-4xl leading-tight text-[#54463d] md:text-6xl">
                  ساخته ی دست
                </h2>
                <div className="mb-6 h-px w-24 bg-[#c08081]" />
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

              <form className="grid gap-4 text-right">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    className="h-14 rounded-2xl border border-[#e5d8cd] bg-white/70 px-4 text-[#54463d] outline-none placeholder:text-[#a39286] focus:border-[#c08081]"
                    placeholder="نام و نام خانوادگی"
                  />
                  <input
                    className="h-14 rounded-2xl border border-[#e5d8cd] bg-white/70 px-4 text-[#54463d] outline-none placeholder:text-[#a39286] focus:border-[#c08081]"
                    placeholder="ایمیل یا شماره تماس"
                  />
                </div>
                <textarea
                  rows={5}
                  className="rounded-[22px] border border-[#e5d8cd] bg-white/70 px-4 py-4 text-[#54463d] outline-none placeholder:text-[#a39286] focus:border-[#c08081]"
                  placeholder="پیام شما"
                />
                <div className="flex flex-col items-start justify-between gap-4 pt-2 md:flex-row md:items-center">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-[#c08081] px-7 py-3.5 text-white shadow-[0_14px_32px_rgba(192,128,129,0.3)] transition hover:-translate-y-0.5"
                  >
                    <Send className="h-4 w-4" />
                    ارسال پیام
                  </button>
                  <p className="text-sm text-[#9b867d]">اطلاعات شما امن و محرمانه خواهد ماند.</p>
                </div>
              </form>
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
