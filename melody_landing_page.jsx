import React from "react";
import { motion } from "framer-motion";
import { Flower2, ArrowDown, Send, Sparkles } from "lucide-react";

const flowerStudies = [
  {
    title: "Glow Petal",
    className: "bg-[radial-gradient(circle_at_35%_30%,#ffd28f_0%,#e7a14a_18%,transparent_32%),linear-gradient(180deg,#24463d_0%,#16332c_100%)]",
    h: "h-72",
  },
  {
    title: "Quiet Bloom",
    className: "bg-[radial-gradient(circle_at_55%_28%,#dca58a_0%,#c78267_10%,transparent_18%),radial-gradient(circle_at_75%_58%,#7e4e44_0%,transparent_11%),linear-gradient(180deg,#f5efe5_0%,#e8dfd3_100%)]",
    h: "h-80",
  },
  {
    title: "Soft Shadow",
    className: "bg-[radial-gradient(circle_at_52%_32%,#efb142_0%,#ab6a1f_12%,transparent_22%),radial-gradient(circle_at_44%_36%,#3b321d_0%,transparent_28%),linear-gradient(180deg,#f6efe6_0%,#ece2d7_100%)]",
    h: "h-72",
  },
  {
    title: "Warm Motion",
    className: "bg-[linear-gradient(135deg,#f5d6ba_0%,#f49c55_35%,#d25352_55%,#f0d7c7_85%)]",
    h: "h-76",
  },
  {
    title: "Golden Air",
    className: "bg-[radial-gradient(circle_at_68%_70%,#f2c65b_0%,#d39d36_8%,transparent_16%),linear-gradient(135deg,#4b4626_0%,#9f9160_35%,#b6a36e_55%,#6a6942_100%)]",
    h: "h-80",
  },
];

const applications = [
  {
    title: "سنجاق سینه",
    desc: "لمسه‌ای از لطافت بر یقه و کت",
    icon: "lapel",
  },
  {
    title: "اکسسوری لباس",
    desc: "برای کمربند، سرشانه یا خطوط لباس",
    icon: "dress",
  },
  {
    title: "اکسسوری کلاه",
    desc: "حضور گل روی فرم‌های نرم و کلاسیک",
    icon: "hat",
  },
  {
    title: "اکسسوری مو",
    desc: "برای شینیون، هدبند یا جزئیات مو",
    icon: "hair",
  },
];

const works = [
  {
    title: "نسیم صبحگاهی",
    desc: "سنجاق‌سینه‌ای سبک از ارگانزا و لایه‌های لطیف، با الهام از شکفتن آرام گل در نور صبح.",
    align: "md:flex-row",
    media: "bg-[radial-gradient(circle_at_50%_45%,#d99889_0%,#bf786b_16%,#8e4f46_22%,transparent_28%),linear-gradient(135deg,#f8f2ea_0%,#efe3d6_45%,#dcc6b0_100%)]",
  },
  {
    title: "حریر سپید",
    desc: "قطعه‌ای برای کلاه با گل پارچه‌ای حجیم و بافت تور، ساخته‌شده برای استایل‌های آرام و ماندگار.",
    align: "md:flex-row-reverse",
    media: "bg-[radial-gradient(circle_at_70%_42%,#f3efe8_0%,#e9dac8_22%,#c7aa86_28%,transparent_30%),linear-gradient(135deg,#f7f2ea_0%,#eee3d5_48%,#d7c0a7_100%)]",
  },
  {
    title: "آرامش خاموش",
    desc: "گل پارچه‌ای برای لباس با چین‌های نرم و حضور ظریف؛ جایی میان سکوت، بافت و روشنایی.",
    align: "md:flex-row",
    media: "bg-[radial-gradient(circle_at_38%_55%,#f8f5ef_0%,#e9dcc8_18%,#ccb398_22%,transparent_24%),linear-gradient(135deg,#dad0c3_0%,#f5f0e9_38%,#d8cabc_100%)]",
  },
  {
    title: "شکوفه‌ی مه‌آلود",
    desc: "ادامه‌ی مجموعه‌ای از کارهای منتخب که در اسکرول صفحه ادامه پیدا می‌کنند.",
    align: "md:flex-row-reverse",
    media: "bg-[linear-gradient(135deg,#f5eee5_0%,#ead8cc_35%,#c8ab9f_60%,#f4ede5_100%)]",
  },
];

function SectionLabel({ children }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d8cbbd] bg-white/70 px-3 py-1 text-[11px] tracking-[0.22em] text-[#8f7f72] backdrop-blur-sm">
      <Sparkles className="h-3.5 w-3.5" />
      <span>{children}</span>
    </div>
  );
}

function FloralWave() {
  return (
    <div className="relative -mt-20 h-28 overflow-hidden">
      <svg viewBox="0 0 1440 200" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path
          d="M0,120 C140,185 290,10 470,60 C610,98 680,182 840,162 C1025,138 1115,42 1285,54 C1360,60 1408,78 1440,94 L1440,200 L0,200 Z"
          fill="#f5f1eb"
        />
      </svg>
      <svg viewBox="0 0 1200 180" className="absolute left-0 top-5 h-full w-[70%] opacity-40" preserveAspectRatio="none">
        <path
          d="M4 134C58 98 110 118 170 90C222 67 257 42 317 49C365 55 390 89 426 104C462 118 524 120 566 101C626 74 640 35 700 31C754 28 774 59 819 72C859 84 915 76 968 49C1024 20 1086 20 1198 76"
          stroke="#c08081"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M120 114C134 96 146 88 163 86C182 84 196 99 196 116C196 135 183 147 167 147C149 147 137 131 137 113C137 95 150 77 168 69"
          stroke="#c08081"
          strokeWidth="1.2"
          fill="none"
        />
        <path
          d="M235 103C254 92 269 92 281 104C292 115 291 132 278 144C265 156 247 156 236 145C226 134 225 117 235 103Z"
          stroke="#c08081"
          strokeWidth="1.2"
          fill="none"
        />
      </svg>
    </div>
  );
}

function Illustration({ type }) {
  const common = "stroke-[#927a72]";

  if (type === "lapel") {
    return (
      <svg viewBox="0 0 180 180" className="h-40 w-40">
        <path d="M26 152V33M154 152V33M58 34L91 89L122 34M58 34H33M122 34H147M90 89L90 152" fill="none" strokeWidth="2.2" className={common} />
        <path d="M122 99c9 0 17 7 17 17s-8 18-17 18-17-8-17-18 8-17 17-17Z" fill="#f2d7db" stroke="#c08081" strokeWidth="1.6" />
      </svg>
    );
  }

  if (type === "dress") {
    return (
      <svg viewBox="0 0 180 180" className="h-40 w-40">
        <path d="M70 30c5 9 13 15 20 15s15-6 20-15M62 52l28 33 28-33M62 52l-10 91M118 52l10 91M90 85v58M66 112h48" fill="none" strokeWidth="2.2" className={common} />
        <path d="M112 105c9 0 16 7 16 16s-7 16-16 16-16-7-16-16 7-16 16-16Z" fill="#f2d7db" stroke="#c08081" strokeWidth="1.6" />
      </svg>
    );
  }

  if (type === "hat") {
    return (
      <svg viewBox="0 0 180 180" className="h-40 w-40">
        <path d="M53 78c2-25 11-37 37-37s35 12 37 37M22 98c22-18 114-18 136 0M22 98c18 18 118 18 136 0M52 78h76" fill="none" strokeWidth="2.2" className={common} />
        <path d="M121 83c9 0 17 7 17 17s-8 18-17 18-17-8-17-18 8-17 17-17Z" fill="#f2d7db" stroke="#c08081" strokeWidth="1.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 180 180" className="h-40 w-40">
      <path d="M90 39c-29 0-44 20-44 44 0 33 25 58 44 58s44-25 44-58c0-24-15-44-44-44Z" fill="none" strokeWidth="2.2" className={common} />
      <path d="M55 92c11-10 24-13 35-13 18 0 28 9 37 20M69 55c14 8 20 21 20 37M116 61c-8 11-12 24-12 40" fill="none" strokeWidth="2.2" className={common} />
      <path d="M124 74c9 0 16 7 16 16s-7 16-16 16-16-7-16-16 7-16 16-16Z" fill="#f2d7db" stroke="#c08081" strokeWidth="1.6" />
    </svg>
  );
}

function AppCard({ item }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.35 }}
      className="group rounded-[28px] border border-[#e5dbd0] bg-white/70 p-6 text-center shadow-[0_10px_35px_rgba(93,74,55,0.06)] backdrop-blur-sm"
    >
      <div className="mx-auto mb-5 flex h-44 w-44 items-center justify-center rounded-full border border-[#eadfd5] bg-[radial-gradient(circle_at_30%_30%,#fffdf9_0%,#f7f0e8_55%,#f0e7dd_100%)] shadow-inner">
        <Illustration type={item.icon} />
      </div>
      <h3 className="mb-2 text-xl text-[#4d4038]">{item.title}</h3>
      <p className="mx-auto max-w-[16rem] text-sm leading-7 text-[#7d6e63]">{item.desc}</p>
    </motion.div>
  );
}

function WorkCard({ item, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay: index * 0.05 }}
      className={`flex flex-col ${item.align} gap-6 rounded-[34px] border border-[#e5dbd0] bg-white/80 p-5 shadow-[0_18px_45px_rgba(83,63,47,0.07)] backdrop-blur-sm md:p-6`}
    >
      <div className={`min-h-[220px] flex-1 rounded-[28px] ${item.media} shadow-inner`}>
        <div className="flex h-full items-end justify-between rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.22))] p-6">
          <div className="h-24 w-24 rounded-full border border-white/50 bg-white/20 backdrop-blur-sm" />
          <div className="h-16 w-32 rounded-[22px] border border-white/35 bg-white/20 backdrop-blur-sm" />
        </div>
      </div>
      <div className="flex w-full flex-1 items-center justify-center px-2 md:max-w-[28rem]">
        <div className="text-right">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#f6efea] px-3 py-1 text-[11px] tracking-[0.18em] text-[#a48f84]">
            منتخب
          </div>
          <h3 className="mb-4 text-3xl text-[#54463d] md:text-[2rem]">{item.title}</h3>
          <p className="mb-5 text-base leading-8 text-[#73645a] md:text-lg">{item.desc}</p>
          <button className="inline-flex items-center gap-2 text-sm text-[#b0676c] transition hover:gap-3">
            مشاهده جزئیات
            <ArrowDown className="h-4 w-4 rotate-90" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default function MelodyLandingPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f1eb] text-[#493d37]">
      <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/20 bg-[#3f271dcc]/55 px-5 py-3 text-[#f7eee4] shadow-[0_12px_40px_rgba(35,18,10,0.18)] backdrop-blur-md">
          <div className="flex items-center gap-3 text-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
              <Flower2 className="h-5 w-5" />
            </div>
            <span className="font-serif tracking-wide">Melody</span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-[#f7eee4]/80 md:flex">
            <a href="#hero" className="text-[#f2d0d5]">خانه</a>
            <a href="#inspiration" className="hover:text-white">الهام</a>
            <a href="#craft" className="hover:text-white">فرآیند ساخت</a>
            <a href="#usage" className="hover:text-white">کاربردها</a>
            <a href="#contact" className="hover:text-white">سفارش</a>
            <a href="#works" className="hover:text-white">نمونه‌کارها</a>
          </nav>
        </div>
      </div>

      <section
        id="hero"
        className="relative isolate overflow-hidden bg-[#4b2f20] pt-28 text-[#fbf5ee] md:pt-32"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(255,251,244,0.38),transparent_18%),radial-gradient(circle_at_65%_52%,rgba(255,247,239,0.3),transparent_16%),radial-gradient(circle_at_35%_75%,rgba(255,248,240,0.25),transparent_18%),linear-gradient(90deg,rgba(33,16,8,0.82)_0%,rgba(71,45,28,0.45)_38%,rgba(97,67,44,0.18)_62%,rgba(44,25,14,0.35)_100%)]" />
        <div className="absolute inset-0 opacity-70">
          <div className="absolute right-[8%] top-[6%] h-72 w-72 rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,252,248,0.9)_0%,rgba(255,248,241,0.55)_26%,rgba(255,255,255,0)_56%)] blur-[2px] md:h-[28rem] md:w-[28rem]" />
          <div className="absolute left-[30%] top-[15%] h-44 w-44 rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,250,245,0.85)_0%,rgba(255,247,240,0.45)_28%,rgba(255,255,255,0)_58%)]" />
          <div className="absolute bottom-[12%] left-[34%] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,251,246,0.9)_0%,rgba(255,247,240,0.5)_24%,rgba(255,255,255,0)_52%)] blur-sm" />
          <div className="absolute right-[16%] top-[14%] h-[38rem] w-[28rem] rotate-[16deg] rounded-[48%] border border-white/15 bg-[linear-gradient(180deg,rgba(255,252,247,0.94),rgba(247,236,225,0.22)_65%,rgba(255,255,255,0)_100%)] blur-[1px]" />
          <div className="absolute right-[4%] top-[22%] h-[30rem] w-[18rem] -rotate-[12deg] rounded-[55%] border border-white/10 bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(252,244,236,0.15)_70%,rgba(255,255,255,0)_100%)]" />
          <div className="absolute left-[41%] top-[52%] h-[18rem] w-[30rem] -rotate-[7deg] rounded-[50%] border border-white/10 bg-[linear-gradient(180deg,rgba(255,252,247,0.88),rgba(252,244,236,0.2)_55%,rgba(255,255,255,0)_100%)]" />
          <div className="absolute right-[42%] top-[18%] h-[12rem] w-px bg-white/40" />
          <div className="absolute right-[42%] top-[28%] h-px w-24 rotate-[-30deg] bg-white/35" />
          <div className="absolute right-[43%] top-[52%] h-px w-20 rotate-[18deg] bg-white/35" />
        </div>

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

        <FloralWave />
      </section>

      <main className="relative z-10 -mt-1">
        <section id="inspiration" className="mx-auto max-w-7xl px-6 py-24 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>الهام از طبیعت</SectionLabel>
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">الهام‌گرفته از زیبایی زنده</h2>
            <p className="text-lg leading-9 text-[#75655a]">
              هر گل نیروی آرام خود را دارد؛ لطافتی درونی، حرکتی نرم، و نظمی پنهان در دل طبیعت.
              Melody از همین زیبایی زنده الهام می‌گیرد و آن را به زبانی تازه و لمس‌پذیر بازمی‌گوید.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-5 md:items-end">
            {flowerStudies.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.06 }}
                className={`overflow-hidden rounded-[26px] border border-[#e7ddd2] ${item.h} ${item.className} shadow-[0_16px_40px_rgba(84,64,47,0.08)]`}
              />
            ))}
          </div>
        </section>

        <section id="craft" className="border-y border-[#ece3d8] bg-white/45">
          <div className="mx-auto grid max-w-7xl gap-16 px-6 py-24 md:grid-cols-[0.95fr_1.05fr] md:px-8 lg:px-12">
            <div className="flex items-center">
              <div className="max-w-xl text-right">
                <SectionLabel>فرآیند ساخت</SectionLabel>
                <h2 className="mb-6 text-4xl leading-tight text-[#54463d] md:text-6xl">
                  با دست ساخته،
                  <br />
                  با نیت شکل‌گرفته
                </h2>
                <div className="mb-6 h-px w-24 bg-[#c08081]" />
                <p className="text-lg leading-9 text-[#6f6056]">
                  از انتخاب بافت‌های لطیف تا برش دقیق، فرم‌دهی آرام، دوخت‌های ظریف و ترکیب
                  لایه‌ها، هر قطعه با صبر و توجه ساخته می‌شود تا شکوه گل را به حضوری ماندگار و
                  پوشیدنی تبدیل کند.
                </p>
              </div>
            </div>

            <div className="relative min-h-[420px] md:min-h-[500px]">
              <div className="absolute right-[18%] top-0 h-64 w-56 rounded-[34px] border border-[#e8ddd0] bg-[linear-gradient(180deg,#f3efe8_0%,#ebe2d6_100%)] shadow-[0_18px_45px_rgba(74,58,43,0.08)] md:h-72 md:w-60">
                <div className="h-full w-full rounded-[34px] bg-[repeating-radial-gradient(circle_at_30%_30%,rgba(199,188,172,0.28)_0_3px,transparent_3px_16px),linear-gradient(135deg,#faf7f1_0%,#efe7dc_100%)] opacity-80" />
              </div>
              <div className="absolute left-[8%] top-14 h-72 w-72 rounded-[38px] border border-[#e5dbd0] bg-[linear-gradient(180deg,#d8d0cb_0%,#bfb4ae_100%)] shadow-[0_20px_52px_rgba(74,58,43,0.1)] md:h-80 md:w-80">
                <div className="h-full w-full rounded-[38px] bg-[repeating-radial-gradient(circle_at_25%_35%,rgba(255,255,255,0.35)_0_2px,transparent_2px_14px),repeating-linear-gradient(45deg,rgba(255,255,255,0.09)_0_1px,transparent_1px_12px)] opacity-90" />
              </div>
              <div className="absolute bottom-12 right-[6%] h-52 w-72 rounded-[30px] border border-[#e6ddd2] bg-[linear-gradient(135deg,#fbf7f0_0%,#e8ddd1_100%)] shadow-[0_20px_48px_rgba(74,58,43,0.08)] md:h-56 md:w-80">
                <div className="h-full w-full rounded-[30px] bg-[repeating-radial-gradient(circle_at_40%_35%,rgba(214,196,175,0.35)_0_3px,transparent_3px_16px),linear-gradient(135deg,rgba(255,255,255,0.8),rgba(238,229,217,0.7))]" />
              </div>
              <div className="absolute bottom-0 left-[28%] h-44 w-60 rounded-[28px] border border-[#ebe0d4] bg-[linear-gradient(135deg,#faf6ef_0%,#e8ddd1_50%,#f7f1ea_100%)] shadow-[0_18px_45px_rgba(74,58,43,0.09)] md:h-48 md:w-64">
                <div className="h-full w-full rounded-[28px] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0)_40%),linear-gradient(135deg,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0)_45%,rgba(255,255,255,0.55)_100%)]" />
              </div>
              <div className="absolute bottom-[18%] left-[3%] h-14 w-24 rotate-[-10deg] rounded-full bg-[#e7d8c1]/60 blur-sm" />
            </div>
          </div>
        </section>

        <section id="usage" className="mx-auto max-w-7xl px-6 py-24 md:px-8 lg:px-12">
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

        <section id="contact" className="mx-auto max-w-7xl px-6 pb-24 md:px-8 lg:px-12">
          <div className="overflow-hidden rounded-[34px] border border-[#e6dbcf] bg-[linear-gradient(135deg,#fbf7f1_0%,#f3ece4_100%)] shadow-[0_20px_50px_rgba(84,64,47,0.06)]">
            <div className="grid gap-8 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-8 lg:p-10">
              <div className="relative text-right">
                <SectionLabel>سفارش و همکاری</SectionLabel>
                <h2 className="mb-4 text-4xl leading-tight text-[#54463d]">برای سفارش یا همکاری</h2>
                <p className="max-w-md text-lg leading-9 text-[#73645a]">
                  ایده‌ی شما می‌تواند از همین‌جا آغاز شود. برای سفارش، همکاری یا پرسش درباره‌ی
                  قطعات سفارشی، پیام خود را بفرستید.
                </p>
                <div className="mt-8 h-40 w-40 rounded-full border border-[#ead9d7] bg-[radial-gradient(circle_at_30%_30%,rgba(192,128,129,0.18),rgba(192,128,129,0.03)_55%,transparent_60%)]" />
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

        <section id="works" className="mx-auto max-w-7xl px-6 pb-24 md:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <SectionLabel>Selected Works</SectionLabel>
            <h2 className="mb-5 text-4xl leading-tight text-[#51645a] md:text-5xl">نمونه‌کارهای منتخب</h2>
            <p className="text-lg leading-9 text-[#75655a]">
              مجموعه‌ای از قطعات منتخب که هرکدام روایتی متفاوت از لطافت، بافت، فرم و حضور گل در
              استایل را به نمایش می‌گذارند.
            </p>
          </div>

          <div className="mt-14 space-y-7">
            {works.map((item, index) => (
              <WorkCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
