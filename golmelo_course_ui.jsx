import React from "react";
import { motion } from "framer-motion";

const lessons = [
  {
    id: "01",
    title: "نسترن",
    level: "آسان",
    type: "کیریشه",
    duration: "کمتر از ۱ ساعت",
    summary:
      "شروعی آرام برای ورود به دنیای گل‌سازی پارچه‌ای؛ مناسب برای آشنایی با فرم‌دهی اولیه، جزئیات تزئینی و کنترل بافت.",
    materials: [
      "پارچه ساتن آمریکایی",
      "ساتن مرلین",
      "مخمل کش کره‌ای",
      "چسب",
      "کارگاه گل‌سازی",
      "نخ و سوزن",
      "سیم گل‌سازی سایز ۵ یا ۷",
      "مروارید، کریستال و سنگ پایه‌دار",
    ],
  },
  {
    id: "02",
    title: "داوودی",
    level: "متوسط",
    type: "کیریشه",
    duration: "کمتر از ۱ ساعت",
    summary:
      "تمرکز بر لایه‌سازی و ساخت فرم‌های پرتر؛ برای شناخت بهتر ساختار گل و هماهنگی بافت‌ها در گل‌های کیریشه.",
    materials: [
      "ساتن مرلین",
      "مخمل کره‌ای",
      "زانفیکس متری",
      "نخ",
      "چسب حرارتی",
    ],
  },
  {
    id: "03",
    title: "لیلیوم",
    level: "متوسط",
    type: "کیریشه",
    duration: "کمتر از ۱ ساعت",
    summary:
      "آشنایی بیشتر با فرم گلبرگ‌های متفاوت، کار با سیم و ساختاردهی دقیق‌تر در یک مدل میانی و کاربردی.",
    materials: [
      "ساتن مرلین",
      "ساتن آمریکایی",
      "نخ و سوزن",
      "کارگاه گل‌سازی",
      "سیم گل‌سازی سایز ۵ یا ۷",
    ],
  },
  {
    id: "04",
    title: "رز",
    level: "متوسط",
    type: "کیریشه",
    duration: "حدود ۱ ساعت",
    summary:
      "یکی از مهم‌ترین فرم‌ها در گل‌سازی پارچه‌ای؛ با تمرکز بر حجم‌دهی، ترکیب لایه‌ها و اجرای کامل‌تر ساختار گل.",
    materials: [
      "ساتن مرلین",
      "تافته",
      "زانفیکس",
      "کارگاه گل‌سازی",
      "نخ و سوزن",
      "چسب داغ",
      "پنبه",
      "آستر",
    ],
  },
  {
    id: "05",
    title: "رز حلزونی",
    level: "سخت",
    type: "حریری",
    duration: "۱ ساعت و ۳۰ دقیقه",
    summary:
      "پیشرفته‌ترین آموزش ترم اول؛ برای تجربه‌ی کنترل فرم در گل‌های حریری، اجرای لایه‌های پیچیده‌تر و رسیدن به ظرافت حرفه‌ای‌تر.",
    materials: [
      "قیچی",
      "کاغذ مقوا",
      "اتو",
      "نخ و سوزن همرنگ پارچه",
      "پارچه‌های سیدان",
      "حریر ایتالیایی",
      "ارگاندی",
      "ساتن مرلین",
      "روبان ۸ سانتی‌متری",
    ],
  },
];

const stats = [
  { label: "تعداد آموزش‌ها", value: "۵ گل" },
  { label: "سطح دوره", value: "مقدماتی" },
  { label: "ترتیب یادگیری", value: "از آسان تا سخت" },
  { label: "فرمت", value: "ویدیویی" },
];

const courseOutcomes = [
  "آشنایی با ۵ مدل گل پارچه‌ای",
  "یادگیری از سطح آسان تا سخت",
  "شناخت متریال و ابزار پایه گل‌سازی",
  "آشنایی با گل‌های کیریشه و حریری",
  "تمرین فرم‌دهی، لایه‌سازی و اجرای جزئیات",
];

const audience = [
  "هنرجویان مبتدی و علاقه‌مند به گل‌سازی پارچه‌ای",
  "کسانی که می‌خواهند اصول اولیه را درست و مرحله‌به‌مرحله یاد بگیرند",
  "افرادی که قصد دارند از مدل‌های ساده‌تر به فرم‌های پیچیده‌تر برسند",
];

const sanityChecks = {
  lessons: lessons.length === 5,
  stats: stats.length === 4,
  hasOutcomes: courseOutcomes.length > 0,
  hasAudience: audience.length > 0,
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function SvgIcon(props) {
  const {
    children,
    className = "h-5 w-5",
    strokeWidth = 1.8,
    viewBox = "0 0 24 24",
  } = props;

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ArrowLeftIcon(props) {
  return (
    <SvgIcon className={props.className}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </SvgIcon>
  );
}

function ClockIcon(props) {
  return (
    <SvgIcon className={props.className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v4.8l3.3 1.9" />
    </SvgIcon>
  );
}

function FlowerIcon(props) {
  return (
    <SvgIcon className={props.className}>
      <path d="M12 12.2c0-2.4 1.4-4.2 3.5-4.2 1.8 0 3 1.3 3 3.1 0 2.1-1.7 3.5-4 3.5" />
      <path d="M12 12.2c2.4 0 4.2 1.4 4.2 3.5 0 1.8-1.3 3-3.1 3-2.1 0-3.5-1.7-3.5-4" />
      <path d="M12 12.2c0 2.4-1.4 4.2-3.5 4.2-1.8 0-3-1.3-3-3.1 0-2.1 1.7-3.5 4-3.5" />
      <path d="M12 12.2c-2.4 0-4.2-1.4-4.2-3.5 0-1.8 1.3-3 3.1-3 2.1 0 3.5 1.7 3.5 4" />
      <circle cx="12" cy="12.2" r="1.6" />
    </SvgIcon>
  );
}

function LayersIcon(props) {
  return (
    <SvgIcon className={props.className}>
      <path d="M12 4 3.5 8.4 12 12.8 20.5 8.4 12 4Z" />
      <path d="M5.4 11.9 12 15.3l6.6-3.4" />
      <path d="M5.4 15.4 12 18.8l6.6-3.4" />
    </SvgIcon>
  );
}

function PlayCircleIcon(props) {
  return (
    <SvgIcon className={props.className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 8.8 15.2 12 10 15.2V8.8Z" fill="currentColor" stroke="none" />
    </SvgIcon>
  );
}

function ShieldIcon(props) {
  return (
    <SvgIcon className={props.className}>
      <path d="M12 3.8 6.3 6v4.8c0 4 2.3 6.6 5.7 8.3 3.4-1.7 5.7-4.3 5.7-8.3V6L12 3.8Z" />
      <path d="m9.4 12.1 1.8 1.8 3.6-3.8" />
    </SvgIcon>
  );
}

function SparklesIcon(props) {
  return (
    <SvgIcon className={props.className}>
      <path d="m12 3.8 1.2 3.2L16.4 8l-3.2 1.2L12 12.4l-1.2-3.2L7.6 8l3.2-1.2L12 3.8Z" />
      <path d="m18.3 13.8.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
      <path d="m5.6 14.1 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
    </SvgIcon>
  );
}

function StarIcon(props) {
  return (
    <SvgIcon className={props.className}>
      <path d="m12 4.2 2.1 4.2 4.7.7-3.4 3.3.8 4.6-4.2-2.2-4.2 2.2.8-4.6-3.4-3.3 4.7-.7L12 4.2Z" />
    </SvgIcon>
  );
}

function Label(props) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#e5ddd4] bg-white px-3 py-1 text-[11px] tracking-[0.18em] text-[#8c7d72]">
      <SparklesIcon className="h-3.5 w-3.5" />
      <span>{props.children}</span>
    </div>
  );
}

function SoftOrb(props) {
  return <div className={cx("absolute rounded-full bg-white/60 blur-2xl", props.className || "")} />;
}

function GlassPanel(props) {
  return (
    <div
      className={cx(
        "rounded-[24px] border border-[#ece4db] bg-white p-5 shadow-[0_10px_28px_rgba(85,63,45,0.04)]",
        props.className || "",
      )}
    >
      {props.children}
    </div>
  );
}

function StatCard(props) {
  const item = props.item;

  return (
    <div className="rounded-[24px] border border-[#ebe2d8] bg-white p-5 text-center shadow-[0_10px_28px_rgba(85,63,45,0.04)]">
      <div className="text-sm text-[#9b8b81]">{item.label}</div>
      <div className="mt-2 text-2xl text-[#54463d]">{item.value}</div>
    </div>
  );
}

function MaterialPill(props) {
  return (
    <span className="rounded-full border border-[#e8ded4] bg-[#fbf8f4] px-3 py-1.5 text-sm text-[#74645a]">
      {props.children}
    </span>
  );
}

function CourseCard() {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-[32px] border border-[#e9e1d7] bg-white p-6 shadow-[0_18px_40px_rgba(85,63,45,0.05)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-[#efe4d8]" />
      <SoftOrb className="right-4 top-4 h-28 w-28 opacity-80" />
      <SoftOrb className="left-10 bottom-10 h-24 w-24 opacity-60" />
      <div className="absolute right-8 top-10 h-28 w-28 rotate-[16deg] rounded-[42%] border border-white/70 bg-white/40" />
      <div className="absolute left-16 top-24 h-20 w-20 -rotate-[10deg] rounded-[46%] border border-white/60 bg-white/30" />

      <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="relative min-h-[220px] overflow-hidden rounded-[26px] border border-[#efe7de] bg-gradient-to-b from-[#f7f2eb] to-[#eee4d8]">
          <SoftOrb className="right-10 top-10 h-20 w-20 opacity-70" />
          <div className="absolute right-[22%] top-[16%] h-28 w-28 rotate-[14deg] rounded-[44%] border border-white/70 bg-white/45" />
          <div className="absolute left-[24%] top-[34%] h-20 w-20 -rotate-[10deg] rounded-[46%] border border-white/60 bg-white/35" />
          <div className="absolute right-[46%] top-[38%] h-16 w-px bg-[#b9a295]/70" />
          <div className="absolute right-[46%] top-[48%] h-px w-14 rotate-[24deg] bg-[#b9a295]/70" />
        </div>

        <div className="text-right">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#a49084]">
              <span className="rounded-full bg-[#f6efea] px-3 py-1 text-xs tracking-[0.16em]">ترم ۰۱</span>
              <span className="rounded-full bg-[#edf2ec] px-3 py-1 text-xs text-[#6d7e6b]">مقدماتی</span>
              <span className="rounded-full bg-[#f4eeea] px-3 py-1 text-xs text-[#8d786d]">ویدیویی</span>
            </div>
            <Label>دوره کامل</Label>
          </div>

          <h3 className="mt-5 text-3xl leading-tight text-[#4f433b] md:text-[2.05rem]">
            دوره مقدماتی گل‌سازی پارچه‌ای
          </h3>
          <p className="mt-4 text-base leading-8 text-[#73645a]">
            یادگیری ۵ گل پارچه‌ای به‌صورت ویدیویی، با مسیری که از مدل‌های ساده‌تر شروع می‌شود و
            قدم‌به‌قدم به ساخت فرم‌های پیچیده‌تر می‌رسد.
          </p>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {stats.map((item) => (
              <MaterialPill key={item.label}>
                {item.label} · {item.value}
              </MaterialPill>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end gap-4">
            <button className="inline-flex items-center gap-2 rounded-full bg-[#c08081] px-5 py-3 text-sm text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5">
              مشاهده جزئیات دوره
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function LessonCard(props) {
  const lesson = props.lesson;
  const featured = props.featured;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
      className={cx(
        "relative overflow-hidden rounded-[32px] border border-[#e9e1d7] p-6 shadow-[0_18px_40px_rgba(85,63,45,0.05)]",
        featured ? "bg-[#fcfaf7]" : "bg-white",
      )}
    >
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="relative min-h-[240px] overflow-hidden rounded-[28px] border border-[#efe7de] bg-gradient-to-b from-[#f7f2eb] to-[#eee4d8]">
          <SoftOrb className="right-8 top-8 h-24 w-24 opacity-70" />
          <SoftOrb className="left-10 bottom-10 h-20 w-20 opacity-60" />
          <div className="absolute right-[18%] top-[12%] h-32 w-32 rotate-[14deg] rounded-[44%] border border-white/70 bg-white/45" />
          <div className="absolute left-[20%] top-[30%] h-24 w-24 -rotate-[10deg] rounded-[46%] border border-white/60 bg-white/35" />
          <div className="absolute right-[44%] top-[38%] h-20 w-px bg-[#b9a295]/70" />
          <div className="absolute right-[44%] top-[48%] h-px w-16 rotate-[24deg] bg-[#b9a295]/70" />
        </div>

        <div className="text-right">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#a49084]">
              <span className="rounded-full bg-[#f6efea] px-3 py-1 text-xs tracking-[0.16em]">{lesson.id}</span>
              <span className="rounded-full bg-[#edf2ec] px-3 py-1 text-xs text-[#6d7e6b]">{lesson.level}</span>
              <span className="rounded-full bg-[#f4eeea] px-3 py-1 text-xs text-[#8d786d]">{lesson.type}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f8f3ed] px-3 py-1.5 text-sm text-[#8b7a70]">
              <ClockIcon className="h-4 w-4" />
              {lesson.duration}
            </div>
          </div>

          <h3 className="mt-5 text-3xl text-[#4f433b]">گل {lesson.title}</h3>
          <p className="mt-4 text-base leading-8 text-[#73645a]">{lesson.summary}</p>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {lesson.materials.map((item) => (
              <MaterialPill key={item}>{item}</MaterialPill>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function GolmeloCourseUI() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f1eb] text-[#493d37]">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 lg:px-12">
        <div className="mb-10 flex items-center justify-between rounded-full border border-[#e8dfd5] bg-white/70 px-5 py-3 shadow-[0_10px_30px_rgba(85,63,45,0.05)]">
          <div className="inline-flex items-center gap-3 text-[#4f433b]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfd5] bg-[#fbf7f3]">
              <FlowerIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg">golmelo.com</div>
              <div className="text-xs text-[#9c8a7f]">UI Study · Course Card & Detail Page</div>
            </div>
          </div>
          <div className="text-sm text-[#a08f84]">Apple-like learning experience</div>
        </div>

        <section className="mb-24">
          <div className="mb-8 max-w-2xl text-right">
            <Label>نمای کارت دوره</Label>
            <h1 className="mt-4 text-4xl leading-tight text-[#4f433b] md:text-5xl">
              آیتم کارت برای نمایش کلیات دوره
            </h1>
            <p className="mt-4 text-lg leading-9 text-[#75655a]">
              این کارت برای صفحهٔ لیست دوره‌ها طراحی شده و کلیات دوره را با یک زبان بصری آرام و
              منظم نشان می‌دهد.
            </p>
          </div>
          <CourseCard />
        </section>

        <section className="overflow-hidden rounded-[40px] border border-[#e8dfd5] bg-[#faf7f3] shadow-[0_24px_60px_rgba(85,63,45,0.06)]">
          <div className="border-b border-[#eee5db] px-6 py-14 md:px-10 lg:px-14">
            <div className="mx-auto max-w-4xl text-center">
              <Label>صفحه جزئیات دوره</Label>
              <h2 className="mt-5 text-5xl leading-[1.18] text-[#4f433b] md:text-6xl">
                دوره مقدماتی
                <br />
                گل‌سازی پارچه‌ای
              </h2>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-[#75655a] md:text-xl">
                در ترم اول، هنرجو ساخت ۵ گل پارچه‌ای را به‌صورت ویدیویی و مرحله‌به‌مرحله یاد
                می‌گیرد؛ مسیری آرام و منظم که از مدل‌های ساده‌تر آغاز می‌شود و به فرم‌های
                پیچیده‌تر و حرفه‌ای‌تر می‌رسد.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button className="rounded-full bg-[#c08081] px-6 py-3 text-white shadow-[0_14px_32px_rgba(192,128,129,0.26)] transition hover:-translate-y-0.5">
                  ثبت‌نام در دوره
                </button>
                <button className="rounded-full border border-[#e3d8ce] bg-white px-6 py-3 text-[#5d5047] transition hover:bg-[#fcfaf7]">
                  مشاهده سرفصل‌ها
                </button>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {stats.map((item) => (
                <StatCard key={item.label} item={item} />
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <GlassPanel className="text-right">
                <div className="mb-3 flex items-center justify-end gap-2 text-[#6f8370]">
                  <PlayCircleIcon className="h-5 w-5" />
                  <h3 className="text-lg text-[#4f433b]">آنچه در این دوره یاد می‌گیرید</h3>
                </div>
                <ul className="space-y-2 text-sm leading-7 text-[#726359]">
                  {courseOutcomes.slice(0, 3).map((item) => (
                    <li key={item} className="flex items-start justify-end gap-2">
                      <span>{item}</span>
                      <StarIcon className="mt-1 h-3.5 w-3.5 text-[#c08081]" />
                    </li>
                  ))}
                </ul>
              </GlassPanel>

              <GlassPanel className="text-right">
                <div className="mb-3 flex items-center justify-end gap-2 text-[#8a776c]">
                  <LayersIcon className="h-5 w-5" />
                  <h3 className="text-lg text-[#4f433b]">مسیر یادگیری</h3>
                </div>
                <p className="text-sm leading-7 text-[#726359]">
                  نسترن، داوودی، لیلیوم، رز و در نهایت رز حلزونی؛ مسیری مرحله‌به‌مرحله برای
                  ساختن درک، مهارت و ظرافت بیشتر.
                </p>
              </GlassPanel>

              <GlassPanel className="text-right">
                <div className="mb-3 flex items-center justify-end gap-2 text-[#8a776c]">
                  <ShieldIcon className="h-5 w-5" />
                  <h3 className="text-lg text-[#4f433b]">مناسب چه کسانی است؟</h3>
                </div>
                <ul className="space-y-2 text-sm leading-7 text-[#726359]">
                  {audience.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </GlassPanel>
            </div>
          </div>

          <div className="px-6 py-12 md:px-10 lg:px-14">
            <div className="mb-8 flex items-end justify-between">
              <div className="text-sm text-[#9c8a7f]">۵ آموزش ویدیویی</div>
              <div className="text-right">
                <h3 className="text-2xl text-[#4f433b]">سرفصل‌های دوره</h3>
                <p className="mt-2 text-sm text-[#8f7f73]">
                  هر درس با متریال موردنیاز و سطح سختی مشخص شده است.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {lessons.map((lesson, index) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  featured={index === 0 || index === lessons.length - 1}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="mt-8 hidden">
          {String(sanityChecks.lessons)}
          {String(sanityChecks.stats)}
          {String(sanityChecks.hasOutcomes)}
          {String(sanityChecks.hasAudience)}
        </div>
      </div>
    </div>
  );
}
