import heroImage from "./assets/images-hero/hero.png";
import flowerImage1 from "./assets/section-two/1.jpeg";
import flowerImage2 from "./assets/section-two/2.jpg";
import flowerImage3 from "./assets/section-two/3.jpg";
import flowerImage4 from "./assets/section-two/4.jpg";
import flowerImage5 from "./assets/section-two/5.jpg";
import fabricImage1 from "./assets/section-three/1.jpg";
import fabricImage2 from "./assets/section-three/2.jpg";
import fabricImage3 from "./assets/section-three/3.jpg";
import fabricImage4 from "./assets/section-three/4.jpg";
import styleImage1 from "./assets/section-four/1.png";
import styleImage2 from "./assets/section-four/2.png";
import styleImage3 from "./assets/section-four/3.png";
import styleImage4 from "./assets/section-four/4.png";
import styleImage5 from "./assets/section-four/5.png";
import styleImage6 from "./assets/section-four/6.png";

const selectedWorks = [
  {
    id: "petal-study",
    title: "Petal Study in Blush Silk",
    cover: styleImage1
  },
  {
    id: "waist-bloom",
    title: "Soft Bloom for Dress Accents",
    cover: styleImage2
  },
  {
    id: "hat-signature",
    title: "Signature Floral for Hats",
    cover: styleImage3
  },
  {
    id: "accessory-fragment",
    title: "Accessory Petal Fragment",
    cover: styleImage4
  },
  {
    id: "bridal-note",
    title: "Ceremonial Bloom Composition",
    cover: styleImage5
  },
  {
    id: "couture-note",
    title: "Couture Floral Accent",
    cover: styleImage6
  },
  {
    id: "brooch-atelier",
    title: "Brooch Atelier Bloom",
    cover: fabricImage1
  },
  {
    id: "tailored-petal",
    title: "Tailored Petal Form",
    cover: fabricImage2
  },
  {
    id: "silk-movement",
    title: "Silk Movement Study",
    cover: fabricImage3
  }
];

export default function App() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#efebe8]">
      <section className="mx-auto w-full max-w-[1440px]">
        <div className="relative h-[920px] w-full">
          <img
            src={heroImage}
            alt="Hero"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute z-10 w-[420px] -translate-y-1/2 p-6"
            style={{
              top: "30%",
              left: "4%",
            }}
          >
            <h1 className="text-3xl text-[#f6eee6]" dir="rtl">
              ظرافت گل‌ها
            </h1>
            <p className="mt-3 text-lg leading-8 text-[#f6eee6]" dir="rtl">
              Melody زیباییِ زنده و ظریفِ گل‌ها را از طبیعت الهام می‌گیرد و آن را به
              آثاری دست‌ساز تبدیل می‌کند؛ آثاری که بخشی از آن شکوهِ شگفت‌انگیز را با
              خود به زندگی می‌آورند.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] overflow-hidden px-10 pb-28 pt-24">
        <div className="mx-auto max-w-[760px]">
          <h2 className="text-center text-4xl text-[#2f241d]" dir="rtl">الهام‌گرفته از زیباییِ زنده</h2>
          <p className="mt-5 text-lg leading-8 text-[#5f4d40]" dir="rtl">
            هر گل نوعی نیروی آرام در خود دارد؛ لطافتی درونی، ریتمی زنده و شیوه‌ای
            از شکفتن که با وقار همراه است. Melody از همین زیباییِ زنده الهام
            می‌گیرد و در ظرافت، حرکت و شعر پنهان در شکوفه‌های طبیعت، مسیر خلق آثار
            خود را پیدا می‌کند.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-5 gap-x-7">
          <div className="mx-auto mt-6 h-[300px] w-full max-w-[200px]">
            <img
              src={flowerImage1}
              alt="Flower inspiration one"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mx-auto mt-0 h-[360px] w-full max-w-[200px]">
            <img
              src={flowerImage2}
              alt="Flower inspiration two"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mx-auto mt-10 h-[320px] w-full max-w-[200px]">
            <img
              src={flowerImage3}
              alt="Flower inspiration three"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mx-auto mt-3 h-[350px] w-full max-w-[200px]">
            <img
              src={flowerImage4}
              alt="Flower inspiration four"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mx-auto mt-8 h-[390px] w-full max-w-[200px]">
            <img
              src={flowerImage5}
              alt="Flower inspiration five"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1360px] overflow-hidden px-12 pb-32 pt-10">
        <div className="flex items-start justify-between gap-16">
          <div className="w-[44%] pt-16">
            <h2 className="text-5xl leading-[1.25] text-[#2e241d]" dir="rtl">
              با دست ساخته، با نیت شکل‌گرفته
            </h2>
            <p className="mt-8 text-xl leading-10 text-[#5c4a3d]" dir="rtl">
              از جرقه‌ی الهام تا لحظه‌ی آفرینش، هر قطعه با دقت و حوصله از دل پارچه،
              فرم و جزئیات جان می‌گیرد. لایه‌ها با دست شکل می‌گیرند تا نرمیِ گلبرگ و
              وقار شکوفه را بازتاب دهند و زیبایی زودگذر طبیعت را به اثری ماندگار،
              پوشیدنی و عمیقاً بیانگر تبدیل کنند.
            </p>
          </div>

          <div className="relative h-[820px] w-[56%] overflow-hidden">
            <div className="absolute left-0 top-14 h-[530px] w-[52%] overflow-hidden rounded-[30px] shadow-[0_24px_50px_-22px_rgba(35,22,14,0.35)]">
              <img
                src={fabricImage3}
                alt="Handcrafted fabric detail one"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute right-[14%] top-0 h-[295px] w-[33%] overflow-hidden rounded-[26px] shadow-[0_18px_40px_-20px_rgba(35,22,14,0.28)]">
              <img
                src={fabricImage1}
                alt="Handcrafted fabric detail two"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute right-0 top-[250px] h-[255px] w-[30%] overflow-hidden rounded-[24px] shadow-[0_18px_40px_-20px_rgba(35,22,14,0.28)]">
              <img
                src={fabricImage2}
                alt="Handcrafted fabric detail three"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute bottom-[58px] left-[35%] h-[330px] w-[40%] overflow-hidden rounded-[28px] shadow-[0_22px_48px_-20px_rgba(35,22,14,0.32)]">
              <img
                src={fabricImage4}
                alt="Handcrafted fabric detail four"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1360px] overflow-hidden px-12 pb-36 pt-6">
        <div className="mx-auto max-w-[920px] text-center">
          <h2 className="text-5xl leading-[1.2] text-[#2e241d]" dir="rtl">
            برای پوشیده‌شدن، استایل‌شدن و ماندن
          </h2>
          <p className="mt-6 text-xl leading-10 text-[#5c4a3d]" dir="rtl">
            این گل‌ها فراتر از تزئین طراحی شده‌اند تا بخشی از بیان شخصی باشند. چه
            روی یقه کت، چه روی لباس، کلاه یا اکسسوری قرار بگیرند، لطافتی آرام،
            امضایی فردی و ظرافتی بی‌صدا به شیوه‌ی پوشیدن زیبایی اضافه می‌کنند.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-6 gap-6">
          <article className="flex items-center justify-center">
            <div className="aspect-square w-full overflow-hidden rounded-full bg-transparent">
              <img
                src={styleImage1}
                alt="استایل گل روی یقه"
                className="h-full w-full object-cover"
              />
            </div>
          </article>

          <article className="flex items-center justify-center">
            <div className="aspect-square w-full overflow-hidden rounded-full bg-transparent">
              <img
                src={styleImage2}
                alt="استایل گل روی لباس"
                className="h-full w-full object-cover"
              />
            </div>
          </article>

          <article className="flex items-center justify-center">
            <div className="aspect-square w-full overflow-hidden rounded-full bg-transparent">
              <img
                src={styleImage3}
                alt="استایل گل روی کلاه"
                className="h-full w-full object-cover"
              />
            </div>
          </article>

          <article className="flex items-center justify-center">
            <div className="aspect-square w-full overflow-hidden rounded-full bg-transparent">
              <img
                src={styleImage4}
                alt="استایل گل روی اکسسوری"
                className="h-full w-full object-cover"
              />
            </div>
          </article>

          <article className="flex items-center justify-center">
            <div className="aspect-square w-full overflow-hidden rounded-full bg-transparent">
              <img
                src={styleImage5}
                alt="استایل گل پنجم"
                className="h-full w-full object-cover"
              />
            </div>
          </article>

          <article className="flex items-center justify-center">
            <div className="aspect-square w-full overflow-hidden rounded-full bg-transparent">
              <img
                src={styleImage6}
                alt="استایل گل ششم"
                className="h-full w-full object-cover"
              />
            </div>
          </article>
        </div>
      </section>

      <section className="relative w-full overflow-hidden pt-6">
        <div className="pointer-events-none absolute inset-x-0 top-8 z-20 flex justify-center">
          <div className="bg-[#2d2118]/26 px-8 py-3 backdrop-blur-[1px]">
            <h2 className="text-5xl leading-[1.1] text-[#f4ede7]">
              Selected Works
            </h2>
          </div>
        </div>

        <div className="grid h-screen grid-cols-3 grid-rows-3">
          {selectedWorks.map((project) => (
            <article
              key={project.id}
              className="relative overflow-hidden"
            >
              <img
                src={project.cover}
                alt={project.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2d2118]/88 via-[#2d2118]/42 to-transparent px-[5%] pb-[5%] pt-16">
                <h3 className="text-2xl leading-tight text-[#f5eee7]">
                  {project.title}
                </h3>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
