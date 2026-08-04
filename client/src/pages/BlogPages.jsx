import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import { SiteNavbar } from "../components/layout/SiteNavbar";
import { Button, ButtonLink } from "../components/ui/Button";
import { ResponsiveImage } from "../components/ui/ResponsiveImage";
import { trackEvent } from "../lib/analytics";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");
const SITE_URL = "https://golmelo.com";

function readBootstrap(type) {
  const element = document.getElementById("golmelo-blog-bootstrap");
  if (!element) return null;
  try {
    const value = JSON.parse(element.textContent || "{}");
    return value.type === type ? value : null;
  } catch {
    return null;
  }
}

async function fetchJSON(path) {
  const response = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, "")}`, { credentials: "include" });
  if (!response.ok) {
    const error = new Error("دریافت اطلاعات انجام نشد.");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function displayName(user) {
  return user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.phone || "کاربر گلملو";
}

function useSEO({ title, description, url, image, type = "website" }) {
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('link[rel="canonical"]', "rel", "canonical", url, "href");
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    if (image) setMeta('meta[property="og:image"]', "property", "og:image", image);
  }, [description, image, title, type, url]);
}

function setMeta(selector, attribute, key, content, contentAttribute = "content") {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement(contentAttribute === "href" ? "link" : "meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute(contentAttribute, content || "");
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

function effectiveDate(post) {
  return post.publishedAt || post.scheduledFor;
}

function BlogCard({ post }) {
  return (
    <article>
      <Link to={`/blogs/${post.slug}`} className="group block" onClick={() => trackEvent("blog_viewed", { content_id: post.id, source: "blog_list" })}>
        {post.coverImageUrl ? (
          <div className="aspect-[4/3] overflow-hidden rounded-md bg-[#f3eeea]">
            <ResponsiveImage
              src={post.coverImageUrl}
              sources={post.coverImageSources || []}
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              alt={post.coverImageAlt}
              width="960"
              height="720"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          </div>
        ) : null}
        <div className="pt-4 text-right">
          <p className="text-xs text-[#8a7770]">{formatDate(effectiveDate(post))} · {Number(post.readingTimeMinutes || 1).toLocaleString("fa-IR")} دقیقه مطالعه</p>
          <h2 className="mt-2 text-xl leading-8 text-[#342c28]">{post.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-7 text-[#6f625b]">{post.excerpt}</p>
          <span className="mt-3 inline-block text-sm font-bold text-[#a05f62]">مطالعه مقاله</span>
        </div>
      </Link>
    </article>
  );
}

function Pagination({ page, totalPages }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="صفحه‌بندی مقالات" className="mt-14 flex justify-center gap-2">
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
        <Link
          key={number}
          to={number === 1 ? "/blogs" : `/blogs/page/${number}`}
          aria-current={number === page ? "page" : undefined}
          className={number === page ? "grid h-10 w-10 place-items-center bg-[#a05f62] text-white" : "grid h-10 w-10 place-items-center border border-[#decfca] text-[#5f514c]"}
        >
          {number.toLocaleString("fa-IR")}
        </Link>
      ))}
    </nav>
  );
}

export function BlogsPage({ authStatus, user, navItems }) {
  const { page: pageParam } = useParams();
  const page = pageParam ? Number(pageParam) : 1;
  const bootstrap = useMemo(() => readBootstrap("list"), []);
  const [list, setList] = useState(() => (bootstrap?.list?.page === page ? bootstrap.list : null));
  const [state, setState] = useState(() => (list ? "ready" : "loading"));

  useSEO({
    title: page > 1 ? `مقالات گلملو - صفحه ${page.toLocaleString("fa-IR")}` : "مقالات گلملو | راهنمای گل‌های پارچه‌ای",
    description: "مقاله‌ها و راهنماهای فارسی گلملو درباره انتخاب، سفارش و ساخت گل‌های پارچه‌ای دست‌ساز.",
    url: page > 1 ? `${SITE_URL}/blogs/page/${page}` : `${SITE_URL}/blogs`,
  });

  useEffect(() => {
    if (list?.page === page) {
      trackEvent("blog_list_viewed", { content_type: "blog", page_path: window.location.pathname });
      return;
    }
    let cancelled = false;
    setState("loading");
    fetchJSON(`blogs?page=${page}&limit=9`)
      .then((data) => {
        if (cancelled) return;
        if (page > 1 && (!data.totalPages || page > data.totalPages)) {
          setState("not-found");
          return;
        }
        setList(data);
        setState("ready");
        trackEvent("blog_list_viewed", { content_type: "blog", page_path: window.location.pathname });
      })
      .catch(() => !cancelled && setState("error"));
    return () => { cancelled = true; };
  }, [page]);

  if (!Number.isInteger(page) || page < 1 || (pageParam && String(page) !== pageParam)) return <Navigate to="/not-found" replace />;
  if (page === 1 && pageParam) return <Navigate to="/blogs" replace />;
  if (state === "not-found") return <Navigate to="/not-found" replace />;

  return (
    <div dir="rtl" className="min-h-screen bg-[#fffdfb] text-[#342c28]">
      <SiteNavbar navItems={navItems} authStatus={authStatus} user={user} userDisplayName={displayName(user)} />
      <main className="pt-32">
        <section className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
          <header className="mb-10 text-center">
            <h1 className="text-4xl leading-tight md:text-5xl">مقالات گلملو</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#6f625b] md:text-base">راهنماها و تجربه‌های گلملو برای انتخاب، سفارش و ساخت گل‌های پارچه‌ای دست‌ساز.</p>
          </header>
          {state === "loading" ? <PageState icon={<Loader2 className="h-5 w-5 animate-spin" />} text="در حال دریافت مقالات..." /> : null}
          {state === "error" ? <PageState text="دریافت مقالات انجام نشد. صفحه را دوباره بارگذاری کنید." /> : null}
          {state === "ready" && list?.posts?.length === 0 ? <PageState text="هنوز مقاله‌ای منتشر نشده است." /> : null}
          {state === "ready" && list?.posts?.length ? (
            <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">{list.posts.map((post) => <BlogCard key={post.id} post={post} />)}</div>
          ) : null}
          <Pagination page={list?.page || page} totalPages={list?.totalPages || 0} />
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}

export function BlogDetailPage({ authStatus, user, navItems }) {
  const { slug } = useParams();
  const bootstrap = useMemo(() => readBootstrap("detail"), []);
  const [post, setPost] = useState(() => (bootstrap?.post?.slug === slug ? bootstrap.post : null));
  const [state, setState] = useState(() => (post ? "ready" : "loading"));

  useSEO({
    title: post ? (post.seoTitle || `${post.title} | گلملو`) : "مقاله گلملو",
    description: post?.seoDescription || post?.excerpt || "مقالات فارسی گلملو درباره گل‌های پارچه‌ای.",
    url: `${SITE_URL}/blogs/${post?.slug || slug}`,
    image: post?.ogImageUrl || post?.coverImageUrl,
    type: "article",
  });

  useEffect(() => {
    if (post?.slug === slug) {
      trackEvent("blog_viewed", { content_id: post.id, content_type: "blog" });
      return;
    }
    let cancelled = false;
    fetchJSON(`blogs/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (cancelled) return;
        setPost(data.post);
        setState("ready");
        trackEvent("blog_viewed", { content_id: data.post.id, content_type: "blog" });
      })
      .catch((error) => !cancelled && setState(error.status === 404 || error.status === 410 ? "not-found" : "error"));
    return () => { cancelled = true; };
  }, [slug]);

  if (state === "not-found") return <Navigate to="/not-found" replace />;

  return (
    <div dir="rtl" className="min-h-screen bg-[#fffdfb] text-[#342c28]">
      <SiteNavbar navItems={navItems} authStatus={authStatus} user={user} userDisplayName={displayName(user)} />
      {state === "loading" ? <main className="pt-36"><PageState icon={<Loader2 className="h-5 w-5 animate-spin" />} text="در حال دریافت مقاله..." /></main> : null}
      {state === "error" ? <main className="pt-36"><PageState text="دریافت مقاله انجام نشد. صفحه را دوباره بارگذاری کنید." /></main> : null}
      {post ? <BlogArticle post={post} /> : null}
      <BlogFooter />
    </div>
  );
}

function BlogArticle({ post }) {
  return (
    <main className="pt-32">
      <article className="mx-auto max-w-4xl px-4 pb-20 md:px-8">
        <nav aria-label="مسیر صفحه" className="mb-7 text-sm text-[#807269]"><Link to="/">گلملو</Link><span className="px-2">/</span><Link to="/blogs">مقالات</Link></nav>
        <header className="text-center">
          <h1 className="text-4xl leading-tight md:text-5xl">{post.title}</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#6f625b]">{post.excerpt}</p>
          <p className="mt-4 text-xs text-[#8a7770]">{post.authorName} · {formatDate(effectiveDate(post))} · {Number(post.readingTimeMinutes || 1).toLocaleString("fa-IR")} دقیقه مطالعه</p>
          {post.reviewerName ? <p className="mt-2 text-xs text-[#8a7770]">بازبینی: {post.reviewerName}</p> : null}
          {post.updatedAt && effectiveDate(post) && new Date(post.updatedAt) - new Date(effectiveDate(post)) > 86400000 ? <p className="mt-2 text-xs text-[#8a7770]">آخرین ویرایش: {formatDate(post.updatedAt)}</p> : null}
        </header>
        {post.coverImageUrl ? (
          <figure className="my-10 overflow-hidden rounded-md">
            <ResponsiveImage src={post.coverImageUrl} sources={post.coverImageSources || []} sizes="(min-width: 896px) 832px, 100vw" alt={post.coverImageAlt} width="1200" height="900" fetchPriority="high" className="aspect-[4/3] w-full object-cover" />
          </figure>
        ) : null}
        {post.tableOfContents?.length ? (
          <nav aria-label="فهرست مطالب" className="blog-toc my-10 border-y border-[#eadfda] py-6">
            <h2 className="mb-3 text-xl">فهرست مطالب</h2>
            <ol className="space-y-2 text-sm text-[#6f625b]">{post.tableOfContents.map((item) => <li key={item.id} className={item.level > 2 ? "pr-4" : ""}><a href={`#${item.id}`}>{item.title}</a></li>)}</ol>
          </nav>
        ) : null}
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />
        {post.faqItems?.length ? (
          <section className="mt-14"><h2 className="mb-6 text-3xl">سؤال‌های متداول</h2><div className="divide-y divide-[#eadfda] border-y border-[#eadfda]">{post.faqItems.map((faq, index) => <details key={`${faq.question}-${index}`} className="py-5"><summary className="cursor-pointer font-bold">{faq.question}</summary><p className="mt-3 text-sm leading-7 text-[#6f625b]">{faq.answer}</p></details>)}</div></section>
        ) : null}
        {post.ctaLabel && post.ctaUrl ? (
          <aside className="mt-14 bg-[#f6eeee] px-5 py-8 text-center"><p className="mx-auto max-w-xl text-sm leading-7 text-[#5f514c]">{post.ctaText}</p><ButtonLink to={post.ctaUrl.startsWith("/") ? post.ctaUrl : undefined} href={post.ctaUrl.startsWith("/") ? undefined : post.ctaUrl} className="mt-5" onClick={() => trackEvent("blog_cta_clicked", { content_id: post.id, source: "blog_article" })}>{post.ctaLabel}</ButtonLink></aside>
        ) : null}
        {post.relatedPosts?.length ? <section className="mt-16"><h2 className="mb-7 text-center text-3xl">مقالات مرتبط</h2><div className="grid gap-8 md:grid-cols-3">{post.relatedPosts.map((related) => <BlogCard key={related.id} post={related} />)}</div></section> : null}
      </article>
    </main>
  );
}

function PageState({ icon, text }) {
  return <div className="flex min-h-48 items-center justify-center gap-2 text-center text-sm text-[#807269]">{icon}{text}</div>;
}

function BlogFooter() {
  const [form, setForm] = useState({ fullName: "", contact: "", message: "" });
  const [status, setStatus] = useState("idle");
  const submit = async (event) => {
    event.preventDefault();
    setStatus("loading");
    try {
      await fetchJSONWithBody("contact-requests", form);
      setForm({ fullName: "", contact: "", message: "" });
      setStatus("success");
      trackEvent("contact_form_submitted", { source: "blog_footer" });
    } catch {
      setStatus("error");
    }
  };
  return (
    <footer id="contact" className="bg-[#2f3b33] px-6 py-16 text-center text-[#fbf5ee]">
      <div className="mx-auto max-w-3xl"><h2 className="text-4xl text-white">تماس با گلملو</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#e4d2c1]">برای انتخاب گل، سفارش اختصاصی یا دوره آموزشی پیام بگذارید.</p>
        <form onSubmit={submit} className="mx-auto mt-8 grid max-w-2xl gap-3 text-right">
          <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="h-12 rounded-xl border border-white/20 bg-white/10 px-4 text-white outline-none" placeholder="نام و نام خانوادگی (اختیاری)" />
          <input required value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} className="h-12 rounded-xl border border-white/20 bg-white/10 px-4 text-white outline-none" placeholder="شماره تماس" inputMode="tel" />
          <textarea required minLength={10} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="min-h-28 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none" placeholder="پیام شما" />
          <Button type="submit" variant="light" disabled={status === "loading"}>{status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} ارسال پیام</Button>
          <p aria-live="polite" className="min-h-6 text-sm text-[#e4d2c1]">{status === "success" ? "پیام شما ثبت شد." : status === "error" ? "ارسال پیام انجام نشد." : ""}</p>
        </form>
        <nav className="mt-8 flex flex-wrap justify-center gap-5 border-t border-white/10 pt-7 text-sm text-[#e4d2c1]"><Link to="/custom-order">راهنمای سفارش اختصاصی</Link><Link to="/blogs">مقالات</Link><Link to="/privacy">حریم خصوصی</Link></nav>
      </div>
    </footer>
  );
}

async function fetchJSONWithBody(path, body) {
  const response = await fetch(`${API_BASE_URL}/${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("request failed");
  return response.json();
}
