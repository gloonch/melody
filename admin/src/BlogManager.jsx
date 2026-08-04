import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import persian from "react-date-object/calendars/persian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorianEn from "react-date-object/locales/gregorian_en";
import { CheckCircle2, Clipboard, Eye, Loader2, Newspaper, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";
import { apiRequest } from "./api";

const tabs = [
  ["content", "محتوا"],
  ["media", "رسانه"],
  ["seo", "SEO"],
  ["publication", "انتشار"],
];

const emptyPost = () => ({
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  bodyHtml: "",
  bodyHtmlSource: "",
  categoryId: "",
  tags: [],
  coverImageId: "",
  coverImageAlt: "",
  ogImageId: "",
  ogImageAlt: "",
  focusKeyword: "",
  secondaryKeywords: [],
  seoTitle: "",
  seoDescription: "",
  authorName: "تیم محتوای گلملو",
  reviewerName: "",
  faqItems: [],
  relatedPostIds: [],
  ctaLabel: "مشاهده گل‌های مناسب لباس مجلسی",
  ctaText: "مدل‌های آماده را ببینید یا برای انتخاب رنگ و اندازه متناسب با لباس خود مشاوره بگیرید.",
  ctaUrl: "/custom-order",
  status: "draft",
  scheduledFor: null,
  publishedAt: null,
});

const fieldClass = "w-full rounded-md border border-[#d9cfc5] bg-white px-3 py-2.5 text-sm text-[#3f352f] outline-none transition focus:border-[#c08081]";

export function BlogManager({ token, onStatus }) {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState(emptyPost);
  const [activeTab, setActiveTab] = useState("content");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(null);

  const loadLists = async () => {
    const [postData, categoryData] = await Promise.all([
      apiRequest(`admin/blogs?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`, { token }),
      apiRequest("admin/blog-categories", { token }),
    ]);
    setPosts(postData.posts || []);
    setCategories(categoryData.categories || []);
  };

  useEffect(() => {
    loadLists().catch((error) => onStatus({ type: "error", message: error.message }));
  }, [search, statusFilter]);

  useEffect(() => {
    const warn = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const choosePost = async (id) => {
    if (dirty && !window.confirm("تغییرات ذخیره‌نشده کنار گذاشته شوند؟")) return;
    setBusy("load");
    try {
      const [postData, imageData] = await Promise.all([
        apiRequest(`admin/blogs/${id}`, { token }),
        apiRequest(`admin/blogs/${id}/images`, { token }),
      ]);
      const loadedPost = normalizePostForEditor(postData.post);
      setForm({ ...emptyPost(), ...loadedPost });
      setScheduleDate(dateObjectFromTehranLocal(loadedPost.scheduledForTehranLocal));
      setImages(imageData.images || []);
      setDirty(false);
      setPreview(null);
      setActiveTab("content");
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const startNew = () => {
    if (dirty && !window.confirm("تغییرات ذخیره‌نشده کنار گذاشته شوند؟")) return;
    setForm(emptyPost());
    setImages([]);
    setScheduleDate(null);
    setPreview(null);
    setDirty(false);
    setActiveTab("content");
  };

  const savePost = async () => {
    setBusy("save");
    try {
      const path = form.id ? `admin/blogs/${form.id}` : "admin/blogs";
      const data = await apiRequest(path, {
        token,
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ ...emptyPost(), ...normalizePostForEditor(data.post) });
      setDirty(false);
      await loadLists();
      onStatus({ type: "success", message: "پیش‌نویس مقاله ذخیره شد." });
      return data.post;
    } catch (error) {
      onStatus({ type: "error", message: error.message });
      return null;
    } finally {
      setBusy("");
    }
  };

  const previewPost = async () => {
    setBusy("preview");
    try {
      const data = await apiRequest(`admin/blogs/${form.id || "new"}/preview`, {
        token,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyHtml: form.bodyHtmlSource }),
      });
      setPreview(data);
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const publication = async (nextStatus) => {
    let post = form;
    if (dirty || !form.id) post = await savePost();
    if (!post?.id) return;
    const scheduledForTehranLocal = nextStatus === "scheduled" && scheduleDate
      ? new DateObject(scheduleDate).convert(gregorian, gregorianEn).format("YYYY-MM-DD HH:mm")
      : "";
    setBusy(nextStatus);
    try {
      const data = await apiRequest(`admin/blogs/${post.id}/publication`, {
        token,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, scheduledForTehranLocal }),
      });
      setForm({ ...emptyPost(), ...normalizePostForEditor(data.post) });
      setDirty(false);
      await loadLists();
      onStatus({ type: "success", message: publicationMessage(nextStatus) });
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const removePost = async () => {
    if (!form.id || !window.confirm("این پیش‌نویس برای همیشه حذف شود؟")) return;
    setBusy("delete");
    try {
      await apiRequest(`admin/blogs/${form.id}`, { token, method: "DELETE" });
      startNew();
      await loadLists();
      onStatus({ type: "success", message: "پیش‌نویس حذف شد." });
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const uploadImages = async (files) => {
    if (!form.id) {
      onStatus({ type: "error", message: "ابتدا مقاله را ذخیره کنید، سپس تصویر اضافه کنید." });
      return;
    }
    setBusy("upload");
    try {
      const body = new FormData();
      Array.from(files).forEach((file) => body.append("images", file));
      await apiRequest(`admin/blogs/${form.id}/images`, { token, method: "POST", body });
      const data = await apiRequest(`admin/blogs/${form.id}/images`, { token });
      setImages(data.images || []);
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const seoWarnings = useMemo(() => qualityWarnings(form, preview), [form, preview]);

  return (
    <section className="rounded-lg border border-[#e0d7cd] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2"><Newspaper className="h-5 w-5 text-[#c08081]" /><h2 className="text-lg font-semibold text-[#3f352f]">مدیریت مقالات</h2></div><p className="mt-1 text-sm text-[#807269]">مقاله فارسی، HTML امن، SEO و زمان‌بندی انتشار</p></div>
        <button type="button" onClick={startNew} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#a05f62] px-4 text-sm font-medium text-white"><Plus className="h-4 w-4" />مقاله جدید</button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-l-0 border-[#eee7df] xl:border-l xl:pl-5">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <label className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-[#9b8c83]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} pr-9`} placeholder="جستجوی عنوان یا slug" /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={fieldClass}><option value="">همه وضعیت‌ها</option><option value="draft">پیش‌نویس</option><option value="scheduled">زمان‌بندی‌شده</option><option value="published">منتشرشده</option><option value="archived">آرشیو</option></select>
          </div>
          <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
            {posts.map((post) => <button type="button" key={post.id} onClick={() => choosePost(post.id)} className={`w-full rounded-md border p-3 text-right ${form.id === post.id ? "border-[#c08081] bg-[#fbf2f2]" : "border-[#eee7df] bg-[#fbf9f6]"}`}><span className="block truncate text-sm font-medium text-[#3f352f]">{post.title}</span><span className="mt-1 block text-xs text-[#8b7d74]">{statusLabel(post.status)} · {post.slug}</span></button>)}
            {posts.length === 0 ? <p className="py-6 text-center text-sm text-[#8b7d74]">مقاله‌ای پیدا نشد.</p> : null}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap gap-2 border-b border-[#eee7df] pb-3">{tabs.map(([id, label]) => <button type="button" key={id} onClick={() => setActiveTab(id)} className={`h-9 px-4 text-sm ${activeTab === id ? "bg-[#c08081] text-white" : "bg-[#f7f3ef] text-[#6f625b]"}`}>{label}</button>)}</div>
          {busy === "load" ? <div className="grid min-h-80 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#c08081]" /></div> : (
            <>
              {activeTab === "content" ? <ContentFields form={form} update={update} categories={categories} posts={posts} preview={preview} onPreview={previewPost} busy={busy} /> : null}
              {activeTab === "media" ? <MediaFields form={form} update={update} images={images} setImages={setImages} token={token} onUpload={uploadImages} busy={busy} onStatus={onStatus} /> : null}
              {activeTab === "seo" ? <SEOFields form={form} update={update} warnings={seoWarnings} /> : null}
              {activeTab === "publication" ? <PublicationFields form={form} categories={categories} setCategories={setCategories} token={token} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate} onPublication={publication} busy={busy} onStatus={onStatus} /> : null}
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#eee7df] pt-5">
                <button type="button" onClick={savePost} disabled={Boolean(busy)} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#a05f62] px-5 text-sm text-white disabled:opacity-60">{busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}ذخیره پیش‌نویس</button>
                {form.id && form.status === "draft" && !form.publishedAt ? <button type="button" onClick={removePost} disabled={Boolean(busy)} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e4c6c8] px-4 text-sm text-[#b85d60]"><Trash2 className="h-4 w-4" />حذف</button> : null}
                {dirty ? <span className="text-xs text-[#a05f62]">تغییرات ذخیره نشده‌اند.</span> : <span className="inline-flex items-center gap-1 text-xs text-[#5d8066]"><CheckCircle2 className="h-4 w-4" />ذخیره‌شده</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ContentFields({ form, update, categories, posts, preview, onPreview, busy }) {
  const addFAQ = () => update("faqItems", [...form.faqItems, { question: "", answer: "" }]);
  return <div className="grid gap-4">
    <div className="grid gap-4 md:grid-cols-2"><Field label="عنوان مقاله"><input className={fieldClass} value={form.title} onChange={(e) => update("title", e.target.value)} maxLength={180} /></Field><Field label="Slug لاتین"><input dir="ltr" className={`${fieldClass} text-left`} value={form.slug} onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="choose-fabric-flower" /></Field></div>
    <Field label="خلاصه"><textarea className={`${fieldClass} min-h-24`} value={form.excerpt} onChange={(e) => update("excerpt", e.target.value)} maxLength={500} /></Field>
    <div className="grid gap-4 md:grid-cols-3"><Field label="دسته‌بندی"><select className={fieldClass} value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}><option value="">بدون دسته‌بندی</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="برچسب‌ها"><input className={fieldClass} value={form.tags.join("، ")} onChange={(e) => update("tags", splitList(e.target.value))} placeholder="استایل، گل پارچه‌ای" /></Field><Field label="نویسنده"><input className={fieldClass} value={form.authorName} onChange={(e) => update("authorName", e.target.value)} /></Field></div>
    <div className="flex items-center justify-between"><label className="text-sm font-medium text-[#5f544d]">HTML مقاله</label><button type="button" onClick={onPreview} disabled={busy === "preview"} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d9cfc5] px-3 text-sm text-[#6f625b]">{busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}پیش‌نمایش امن</button></div>
    <textarea dir="rtl" spellCheck="true" className={`${fieldClass} min-h-[420px] font-mono leading-7`} value={form.bodyHtmlSource} onChange={(e) => update("bodyHtmlSource", e.target.value)} placeholder="<h2>عنوان بخش</h2>&#10;<p>متن مقاله...</p>" />
    {preview ? <div className="rounded-md border border-[#d9cfc5] bg-[#fffdfb] p-5"><div className="mb-4 flex flex-wrap gap-2 text-xs text-[#807269]"><span>{preview.readingTimeMinutes} دقیقه مطالعه</span>{preview.warnings?.map((warning) => <span key={warning} className="bg-[#fff2dc] px-2 py-1 text-[#8a652e]">{warning}</span>)}</div><div className="admin-blog-preview" dangerouslySetInnerHTML={{ __html: preview.html }} /></div> : null}
    <section className="border-t border-[#eee7df] pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-[#3f352f]">سؤال‌های متداول</h3><button type="button" onClick={addFAQ} className="inline-flex h-9 items-center gap-1 text-sm text-[#a05f62]"><Plus className="h-4 w-4" />افزودن سؤال</button></div>{form.faqItems.map((faq, index) => <div key={index} className="mb-3 grid gap-2 border-b border-[#eee7df] pb-3 md:grid-cols-[1fr_1fr_auto]"><input className={fieldClass} value={faq.question} onChange={(e) => updateFAQ(form, update, index, "question", e.target.value)} placeholder="سؤال" /><textarea className={fieldClass} value={faq.answer} onChange={(e) => updateFAQ(form, update, index, "answer", e.target.value)} placeholder="پاسخ" /><button type="button" onClick={() => update("faqItems", form.faqItems.filter((_, i) => i !== index))} aria-label="حذف سؤال"><X className="h-4 w-4 text-[#b85d60]" /></button></div>)}</section>
    <section className="border-t border-[#eee7df] pt-5"><h3 className="mb-3 font-semibold text-[#3f352f]">مقالات مرتبط</h3><div className="grid gap-2 md:grid-cols-2">{posts.filter((post) => post.id !== form.id).map((post) => <label key={post.id} className="flex items-center gap-2 text-sm text-[#5f544d]"><input type="checkbox" checked={form.relatedPostIds.includes(post.id)} onChange={() => update("relatedPostIds", toggleValue(form.relatedPostIds, post.id))} />{post.title}</label>)}</div><p className="mt-2 text-xs text-[#8b7d74]">اگر انتخابی نداشته باشید، سه مقاله هم‌دسته خودکار نمایش داده می‌شود.</p></section>
    <section className="grid gap-3 border-t border-[#eee7df] pt-5 md:grid-cols-3"><Field label="متن دکمه CTA"><input className={fieldClass} value={form.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} /></Field><Field label="لینک CTA"><input dir="ltr" className={`${fieldClass} text-left`} value={form.ctaUrl} onChange={(e) => update("ctaUrl", e.target.value)} placeholder="/custom-order" /></Field><Field label="توضیح CTA"><input className={fieldClass} value={form.ctaText} onChange={(e) => update("ctaText", e.target.value)} /></Field></section>
  </div>;
}

function MediaFields({ form, update, images, setImages, token, onUpload, busy, onStatus }) {
  const inputRef = useRef(null);
  const saveImage = async (image) => {
    try {
      const data = await apiRequest(`admin/blogs/${form.id}/images/${image.id}`, { token, method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alt: image.alt, caption: image.caption }) });
      setImages((current) => current.map((item) => item.id === image.id ? data.image : item));
    } catch (error) { onStatus({ type: "error", message: error.message }); }
  };
  const remove = async (imageId) => {
    if (!window.confirm("تصویر حذف شود؟")) return;
    try { await apiRequest(`admin/blogs/${form.id}/images/${imageId}`, { token, method: "DELETE" }); setImages((current) => current.filter((item) => item.id !== imageId)); } catch (error) { onStatus({ type: "error", message: error.message }); }
  };
  return <div><div className="flex flex-wrap items-center gap-3"><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className={fieldClass} /><button type="button" onClick={() => onUpload(inputRef.current?.files || [])} disabled={busy === "upload"} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#a05f62] px-4 text-sm text-white">{busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}آپلود</button></div><p className="mt-2 text-xs text-[#807269]">JPG، PNG یا WebP؛ حداکثر ۸MB و ۶۰۰۰×۶۰۰۰. انتشار بدون تصویر شاخص و alt آن ممکن نیست.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{images.map((image) => <article key={image.id} className="rounded-md border border-[#e5ddd5] p-3"><img src={image.url} alt={image.alt} className="aspect-[4/3] w-full rounded-md object-cover" /><div className="mt-3 grid gap-2"><input className={fieldClass} value={image.alt} onChange={(e) => setImages((current) => current.map((item) => item.id === image.id ? { ...item, alt: e.target.value } : item))} placeholder="alt تصویر" /><input className={fieldClass} value={image.caption || ""} onChange={(e) => setImages((current) => current.map((item) => item.id === image.id ? { ...item, caption: e.target.value } : item))} placeholder="caption" /><div className="flex flex-wrap gap-2"><button type="button" onClick={() => saveImage(image)} className="h-9 rounded-md border border-[#d9cfc5] px-3 text-xs">ذخیره تصویر</button><button type="button" onClick={() => { update("coverImageId", image.id); update("coverImageAlt", image.alt); }} className="h-9 rounded-md border border-[#d9cfc5] px-3 text-xs">تصویر شاخص</button><button type="button" onClick={() => { update("ogImageId", image.id); update("ogImageAlt", image.alt); }} className="h-9 rounded-md border border-[#d9cfc5] px-3 text-xs">تصویر OG</button><button type="button" onClick={() => copyImageHTML(image)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d9cfc5]" title="کپی HTML"><Clipboard className="h-4 w-4" /></button><button type="button" onClick={() => remove(image.id)} className="grid h-9 w-9 place-items-center text-[#b85d60]" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></div>{form.coverImageId === image.id ? <span className="text-xs text-[#5d8066]">تصویر شاخص انتخاب شده</span> : null}</div></article>)}</div>
  </div>;
}

function SEOFields({ form, update, warnings }) {
  return <div className="grid gap-4"><Field label="کلیدواژه اصلی"><input className={fieldClass} value={form.focusKeyword} onChange={(e) => update("focusKeyword", e.target.value)} /></Field><Field label="کلیدواژه‌های فرعی"><input className={fieldClass} value={form.secondaryKeywords.join("، ")} onChange={(e) => update("secondaryKeywords", splitList(e.target.value))} /></Field><Field label={`عنوان SEO (${[...form.seoTitle].length}/۶۰)`}><input className={fieldClass} value={form.seoTitle} onChange={(e) => update("seoTitle", e.target.value)} maxLength={180} /></Field><Field label={`توضیح SEO (${[...form.seoDescription].length}/۱۶۰)`}><textarea className={`${fieldClass} min-h-24`} value={form.seoDescription} onChange={(e) => update("seoDescription", e.target.value)} maxLength={320} /></Field><section className="bg-[#fbf9f6] p-4"><h3 className="font-semibold text-[#3f352f]">کنترل کیفیت</h3>{warnings.length ? <ul className="mt-3 list-disc space-y-2 pr-5 text-sm text-[#8a652e]">{warnings.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-[#5d8066]">بررسی‌های اصلی محتوا پاس شده‌اند.</p>}</section></div>;
}

function PublicationFields({ form, categories, setCategories, token, scheduleDate, setScheduleDate, onPublication, busy, onStatus }) {
  return <div className="grid gap-6"><section className="bg-[#fbf9f6] p-4"><p className="text-sm text-[#5f544d]">وضعیت فعلی: <strong>{statusLabel(form.status)}</strong></p>{form.publishedAt ? <p className="mt-2 text-xs text-[#807269]">تاریخ اولین انتشار ثابت می‌ماند: {formatTehranDateTime(form.publishedAt)}</p> : null}{form.scheduledFor ? <div className="mt-3 space-y-1 text-xs text-[#807269]"><p>زمان تهران: {formatTehranDateTime(form.scheduledFor)}</p><p dir="ltr" className="text-right">UTC ذخیره‌شده: {new Date(form.scheduledFor).toISOString()}</p></div> : null}</section><div className="grid gap-3"><label className="text-sm font-medium text-[#5f544d]">زمان انتشار به تقویم شمسی و ساعت تهران</label><DatePicker value={scheduleDate} onChange={setScheduleDate} calendar={persian} locale={persianFa} format="YYYY/MM/DD HH:mm" plugins={[<TimePicker key="time" position="bottom" hideSeconds />]} inputClass={fieldClass} calendarPosition="bottom-right" /></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onPublication("published")} disabled={Boolean(busy)} className="h-11 rounded-full bg-[#a05f62] px-5 text-sm text-white">انتشار اکنون</button><button type="button" onClick={() => onPublication("scheduled")} disabled={Boolean(busy) || !scheduleDate} className="h-11 rounded-full border border-[#c08081] px-5 text-sm text-[#a05f62] disabled:opacity-50">زمان‌بندی انتشار</button>{form.publishedAt && form.status !== "archived" ? <button type="button" onClick={() => onPublication("archived")} className="h-11 rounded-md border border-[#d9cfc5] px-5 text-sm text-[#6f625b]">آرشیو مقاله</button> : null}</div><CategoryManager categories={categories} setCategories={setCategories} token={token} onStatus={onStatus} /></div>;
}

function CategoryManager({ categories, setCategories, token, onStatus }) {
  const [category, setCategory] = useState({ name: "", slug: "", description: "", sortOrder: 0, isActive: true });
  const save = async () => { try { const editing = Boolean(category.id); const data = await apiRequest(editing ? `admin/blog-categories/${category.id}` : "admin/blog-categories", { token, method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(category) }); setCategories((current) => editing ? current.map((item) => item.id === data.category.id ? data.category : item) : [...current, data.category]); setCategory({ name: "", slug: "", description: "", sortOrder: 0, isActive: true }); } catch (error) { onStatus({ type: "error", message: error.message }); } };
  const remove = async (id) => { if (!window.confirm("دسته‌بندی حذف شود؟ مقاله‌ها بدون دسته‌بندی باقی می‌مانند.")) return; try { await apiRequest(`admin/blog-categories/${id}`, { token, method: "DELETE" }); setCategories((current) => current.filter((item) => item.id !== id)); } catch (error) { onStatus({ type: "error", message: error.message }); } };
  return <section className="border-t border-[#eee7df] pt-5"><h3 className="mb-3 font-semibold text-[#3f352f]">دسته‌بندی‌ها</h3><div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><input className={fieldClass} value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })} placeholder="نام فارسی" /><input dir="ltr" className={`${fieldClass} text-left`} value={category.slug} onChange={(e) => setCategory({ ...category, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="latin-slug" /><button type="button" onClick={save} className="h-10 rounded-md bg-[#51645a] px-4 text-sm text-white">{category.id ? "ویرایش" : "افزودن"}</button></div><div className="mt-2 grid gap-2 md:grid-cols-[1fr_140px_auto]"><input className={fieldClass} value={category.description || ""} onChange={(e) => setCategory({ ...category, description: e.target.value })} placeholder="توضیح کوتاه دسته‌بندی" /><input type="number" className={fieldClass} value={category.sortOrder || 0} onChange={(e) => setCategory({ ...category, sortOrder: Number(e.target.value) })} placeholder="ترتیب" /><label className="flex items-center gap-2 text-sm text-[#5f544d]"><input type="checkbox" checked={category.isActive !== false} onChange={(e) => setCategory({ ...category, isActive: e.target.checked })} />فعال</label></div><div className="mt-3 flex flex-wrap gap-2">{categories.map((item) => <span key={item.id} className="inline-flex items-center gap-2 bg-[#f7f3ef] px-3 py-2 text-xs"><button type="button" onClick={() => setCategory(item)} className="text-[#5f544d]">{item.name}</button><button type="button" onClick={() => remove(item.id)} aria-label="حذف دسته‌بندی"><X className="h-3.5 w-3.5 text-[#b85d60]" /></button></span>)}</div></section>;
}

function Field({ label, children }) { return <label className="grid gap-2 text-sm font-medium text-[#5f544d]"><span>{label}</span>{children}</label>; }
function splitList(value) { return value.split(/[،,]/).map((item) => item.trim()).filter(Boolean); }
function toggleValue(values, value) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function updateFAQ(form, update, index, field, value) { update("faqItems", form.faqItems.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)); }
function statusLabel(status) { return ({ draft: "پیش‌نویس", scheduled: "زمان‌بندی‌شده", published: "منتشرشده", archived: "آرشیو" }[status] || status); }
function publicationMessage(status) { return ({ published: "مقاله منتشر شد.", scheduled: "انتشار مقاله زمان‌بندی شد.", archived: "مقاله آرشیو شد.", draft: "مقاله به پیش‌نویس برگشت." }[status] || "وضعیت انتشار تغییر کرد."); }
function copyImageHTML(image) { const alt = String(image.alt || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"); navigator.clipboard.writeText(`<figure><img src="${image.url}" alt="${alt}" width="${image.width || 1200}" height="${image.height || 800}" loading="lazy">${image.caption ? `<figcaption>${image.caption}</figcaption>` : ""}</figure>`); }
function qualityWarnings(form, preview) {
  const warnings = [];
  if ([...form.title].length < 20) warnings.push("عنوان مقاله کوتاه است.");
  if (!form.focusKeyword) warnings.push("کلیدواژه اصلی تعیین نشده است.");
  if (!form.seoTitle || [...form.seoTitle].length > 60) warnings.push("عنوان SEO بهتر است بین ۳۰ تا ۶۰ کاراکتر باشد.");
  if (!form.seoDescription || [...form.seoDescription].length < 110 || [...form.seoDescription].length > 160) warnings.push("توضیح SEO بهتر است بین ۱۱۰ تا ۱۶۰ کاراکتر باشد.");
  if (!form.coverImageId) warnings.push("برای SEO و اشتراک‌گذاری بهتر، تصویر شاخص پیشنهاد می‌شود.");
  if (form.coverImageId && !form.coverImageAlt) warnings.push("برای تصویر شاخص انتخاب‌شده، alt بنویسید.");
  if (form.focusKeyword && !`${form.title} ${form.excerpt} ${form.bodyHtmlSource}`.includes(form.focusKeyword)) warnings.push("کلیدواژه اصلی در عنوان، خلاصه یا متن دیده نمی‌شود.");
  if (!form.bodyHtmlSource.includes("href=\"/")) warnings.push("لینک داخلی در متن دیده نشد.");
  return [...warnings, ...(preview?.warnings || [])].filter((value, index, all) => all.indexOf(value) === index);
}

function normalizePostForEditor(post) {
  return { ...post, bodyHtmlSource: post?.bodyHtmlSource || post?.bodyHtml || "" };
}

function dateObjectFromTehranLocal(value) {
  if (!value) return null;
  return new DateObject({ date: value, format: "YYYY-MM-DD HH:mm", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
}

function formatTehranDateTime(value) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));
}
