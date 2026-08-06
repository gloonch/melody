import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import persian from "react-date-object/calendars/persian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorianEn from "react-date-object/locales/gregorian_en";
import { CheckCircle2, ChevronDown, Clipboard, Eye, Loader2, Newspaper, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";
import { apiRequest } from "./api";

const RichTextEditor = React.lazy(() => import("./components/RichTextEditor"));

const editorSections = [
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
  bodyJson: {},
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(null);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [publishedDate, setPublishedDate] = useState(null);
  const [publishedDateDirty, setPublishedDateDirty] = useState(false);
  const editorRef = useRef(null);
  const hasUnsavedChanges = dirty || scheduleDirty || publishedDateDirty;

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
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  };

  const updateContent = ({ html, json }) => {
    setForm((current) => ({ ...current, bodyHtmlSource: html, bodyJson: json }));
    setPreview(null);
    setDirty(true);
  };

  const choosePost = async (id) => {
    if (hasUnsavedChanges && !window.confirm("تغییرات ذخیره‌نشده کنار گذاشته شوند؟")) return;
    setBusy("load");
    try {
      const [postData, imageData] = await Promise.all([
        apiRequest(`admin/blogs/${id}`, { token }),
        apiRequest(`admin/blogs/${id}/images`, { token }),
      ]);
      const loadedPost = normalizePostForEditor(postData.post);
      setForm({ ...emptyPost(), ...loadedPost });
      setScheduleDate(dateObjectFromTehranLocal(loadedPost.scheduledForTehranLocal));
      setPublishedDate(dateObjectFromISOInTehran(loadedPost.publishedAt));
      setImages(imageData.images || []);
      setDirty(false);
      setScheduleDirty(false);
      setPublishedDateDirty(false);
      setPreview(null);
      requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const startNew = () => {
    if (hasUnsavedChanges && !window.confirm("تغییرات ذخیره‌نشده کنار گذاشته شوند؟")) return;
    setForm(emptyPost());
    setImages([]);
    setScheduleDate(null);
    setPublishedDate(null);
    setPreview(null);
    setDirty(false);
    setScheduleDirty(false);
    setPublishedDateDirty(false);
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const updateScheduleDate = (value) => {
    setScheduleDate(value);
    setScheduleDirty(true);
  };

  const updatePublishedDate = (value) => {
    setPublishedDate(value);
    setPublishedDateDirty(true);
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
      onStatus({ type: "success", message: data.post.status === "published" ? "تغییرات مقاله ذخیره شد." : "پیش‌نویس مقاله ذخیره شد." });
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
      setScheduleDate(dateObjectFromTehranLocal(data.post.scheduledForTehranLocal));
      setPublishedDate(dateObjectFromISOInTehran(data.post.publishedAt));
      setScheduleDirty(false);
      setPublishedDateDirty(false);
      await loadLists();
      onStatus({ type: "success", message: publicationMessage(nextStatus) });
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const savePublishedAt = async () => {
    if (!form.id || form.status !== "published" || !publishedDate) return;
    if (!window.confirm("تاریخ انتشار اصلاح شود؟ این تغییر ترتیب مقالات و اطلاعات SEO را تغییر می‌دهد.")) return;
    let post = form;
    if (dirty) post = await savePost();
    if (!post?.id) return;
    const publishedAtTehranLocal = dateObjectToGregorianLocal(publishedDate);
    setBusy("published-at");
    try {
      const data = await apiRequest(`admin/blogs/${post.id}/published-at`, {
        token,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishedAtTehranLocal }),
      });
      const updatedPost = normalizePostForEditor(data.post);
      setForm({ ...emptyPost(), ...updatedPost });
      setPublishedDate(dateObjectFromISOInTehran(updatedPost.publishedAt));
      setPublishedDateDirty(false);
      await loadLists();
      onStatus({ type: "success", message: "تاریخ انتشار اصلاح شد." });
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
      setForm(emptyPost());
      setImages([]);
      setScheduleDate(null);
      setPublishedDate(null);
      setPreview(null);
      setDirty(false);
      setScheduleDirty(false);
      setPublishedDateDirty(false);
      await loadLists();
      onStatus({ type: "success", message: "پیش‌نویس حذف شد." });
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const persistCoverImage = async (image, { manageBusy = true } = {}) => {
    const alt = String(image.alt || form.title || "").trim();
    if (!alt) {
      onStatus({ type: "error", message: "برای تصویر شاخص alt بنویسید." });
      return false;
    }
    if (manageBusy) setBusy("cover");
    try {
      const imageData = await apiRequest(`admin/blogs/${form.id}/images/${image.id}`, {
        token,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt, caption: image.caption || "" }),
      });
      setImages((current) => current.map((item) => item.id === image.id ? imageData.image : item));

      const nextForm = { ...form, coverImageId: image.id, coverImageAlt: alt };
      const postData = await apiRequest(`admin/blogs/${form.id}`, {
        token,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextForm),
      });
      setForm({ ...emptyPost(), ...normalizePostForEditor(postData.post) });
      setDirty(false);
      await loadLists();
      onStatus({ type: "success", message: "تصویر شاخص ذخیره شد و روی سایت قابل نمایش است." });
      return true;
    } catch (error) {
      onStatus({ type: "error", message: error.message });
      return false;
    } finally {
      if (manageBusy) setBusy("");
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
      const uploadedData = await apiRequest(`admin/blogs/${form.id}/images`, { token, method: "POST", body });
      const data = await apiRequest(`admin/blogs/${form.id}/images`, { token });
      setImages(data.images || []);
      const firstUploaded = uploadedData.images?.[0];
      if (!form.coverImageId && firstUploaded) {
        await persistCoverImage({ ...firstUploaded, alt: form.title || firstUploaded.alt }, { manageBusy: false });
      } else {
        onStatus({ type: "success", message: "تصویر آپلود شد." });
      }
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const uploadInlineImage = async (file, alt) => {
    if (!form.id) {
      onStatus({ type: "error", message: "ابتدا مقاله را ذخیره کنید، سپس تصویر داخل متن اضافه کنید." });
      return null;
    }
    setBusy("editor-image");
    try {
      const body = new FormData();
      body.append("images", file);
      const uploadedData = await apiRequest(`admin/blogs/${form.id}/images`, { token, method: "POST", body });
      const uploaded = uploadedData.images?.[0];
      if (!uploaded) throw new Error("آپلود تصویر انجام نشد.");
      const imageData = await apiRequest(`admin/blogs/${form.id}/images/${uploaded.id}`, {
        token,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt, caption: "" }),
      });
      const image = {
        ...imageData.image,
        url: imageData.image.url || uploaded.url,
        sources: imageData.image.sources?.length ? imageData.image.sources : uploaded.sources,
        ogUrl: imageData.image.ogUrl || uploaded.ogUrl,
      };
      setImages((current) => [...current.filter((item) => item.id !== image.id), image]);
      onStatus({ type: "success", message: "تصویر داخل متن درج شد." });
      return image;
    } catch (error) {
      onStatus({ type: "error", message: error.message });
      return null;
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

      <details className="group mb-5 border-y border-[#eee7df] py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-[#5f544d]">
          <span>مدیریت دسته‌بندی‌ها</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-4"><CategoryManager categories={categories} setCategories={setCategories} token={token} onStatus={onStatus} onChanged={loadLists} /></div>
      </details>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-[#9b8c83]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${fieldClass} pr-9`} placeholder="جستجوی عنوان یا slug" /></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={fieldClass}><option value="">همه وضعیت‌ها</option><option value="draft">پیش‌نویس</option><option value="scheduled">زمان‌بندی‌شده</option><option value="published">منتشرشده</option><option value="archived">آرشیو</option></select>
      </div>
      <BlogList posts={posts} selectedId={form.id} onSelect={choosePost} />

      <div ref={editorRef} className="mt-8 min-w-0 scroll-mt-24 border-t border-[#ddd3c9] pt-6">
        <div className="sticky top-0 z-20 -mx-1 mb-7 bg-white/95 px-1 py-3 backdrop-blur-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0"><p className="text-xs text-[#8b7d74]">{form.id ? statusLabel(form.status) : "مقاله جدید"}</p><h3 className="truncate text-base font-semibold text-[#3f352f]">{form.title || "مقاله بدون عنوان"}</h3></div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={savePost} disabled={Boolean(busy)} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#a05f62] px-5 text-sm text-white disabled:opacity-60">{busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{form.status === "published" ? "ذخیره تغییرات" : "ذخیره پیش‌نویس"}</button>
              {form.id && form.status === "draft" && !form.publishedAt ? <button type="button" onClick={removePost} disabled={Boolean(busy)} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e4c6c8] px-4 text-sm text-[#b85d60]"><Trash2 className="h-4 w-4" />حذف</button> : null}
              {hasUnsavedChanges ? <span className="text-xs text-[#a05f62]">تغییرات ذخیره نشده‌اند.</span> : <span className="inline-flex items-center gap-1 text-xs text-[#5d8066]"><CheckCircle2 className="h-4 w-4" />ذخیره‌شده</span>}
            </div>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto border-t border-[#eee7df] pt-3" aria-label="بخش‌های فرم مقاله">{editorSections.map(([id, label]) => <a key={id} href={`#blog-editor-${id}`} className="shrink-0 px-3 py-1.5 text-sm text-[#6f625b] hover:bg-[#f7f3ef] hover:text-[#a05f62]">{label}</a>)}</nav>
        </div>

        {busy === "load" ? <div className="grid min-h-80 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#c08081]" /></div> : <>
          <EditorSection id="blog-editor-content" title="محتوا" description="عنوان، متن، پرسش‌های متداول و مسیرهای مرتبط مقاله"><ContentFields form={form} update={update} updateContent={updateContent} categories={categories} posts={posts} preview={preview} onPreview={previewPost} onUploadImage={uploadInlineImage} onStatus={onStatus} busy={busy} /></EditorSection>
          <EditorSection id="blog-editor-media" title="رسانه" description="تصویر شاخص، تصویر شبکه‌های اجتماعی و تصاویر داخل متن"><MediaFields form={form} update={update} images={images} setImages={setImages} token={token} onUpload={uploadImages} onSetCover={persistCoverImage} busy={busy} onStatus={onStatus} /></EditorSection>
          <EditorSection id="blog-editor-seo" title="SEO" description="کلیدواژه‌ها، metadata و کنترل کیفیت صفحه"><SEOFields form={form} update={update} warnings={seoWarnings} /></EditorSection>
          <EditorSection id="blog-editor-publication" title="انتشار" description="وضعیت، زمان‌بندی و اصلاح تاریخ انتشار"><PublicationFields form={form} scheduleDate={scheduleDate} onScheduleDateChange={updateScheduleDate} publishedDate={publishedDate} publishedDateDirty={publishedDateDirty} onPublishedDateChange={updatePublishedDate} onSavePublishedAt={savePublishedAt} onPublication={publication} busy={busy} /></EditorSection>
        </>}
      </div>
    </section>
  );
}

function BlogList({ posts, selectedId, onSelect }) {
  if (posts.length === 0) return <p className="py-8 text-center text-sm text-[#8b7d74]">مقاله‌ای پیدا نشد.</p>;
  return <div className="mt-4 overflow-hidden border-y border-[#e5ddd5]">
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[980px] border-collapse text-right text-sm">
        <thead className="bg-[#f8f5f1] text-xs text-[#786b63]"><tr><th className="px-4 py-3 font-medium">مقاله</th><th className="px-3 py-3 font-medium">وضعیت</th><th className="px-3 py-3 font-medium">دسته‌بندی</th><th className="px-3 py-3 font-medium">انتشار / زمان‌بندی</th><th className="px-3 py-3 font-medium">آخرین ویرایش</th><th className="px-3 py-3 font-medium">محتوا</th></tr></thead>
        <tbody className="divide-y divide-[#eee7df]">{posts.map((post) => <tr key={post.id} tabIndex={0} onClick={() => onSelect(post.id)} onKeyDown={(event) => activateRow(event, () => onSelect(post.id))} className={`cursor-pointer outline-none transition hover:bg-[#fbf7f4] focus:bg-[#fbf2f2] ${selectedId === post.id ? "bg-[#fbf2f2]" : "bg-white"}`}>
          <td className="max-w-[330px] px-4 py-3"><span className="block truncate font-medium text-[#3f352f]">{post.title}</span><span dir="ltr" className="mt-1 block truncate text-left text-xs text-[#8b7d74]">/{post.slug}</span></td>
          <td className="px-3 py-3"><StatusBadge status={post.status} /></td>
          <td className="px-3 py-3 text-xs text-[#6f625b]">{post.categoryName || "بدون دسته‌بندی"}</td>
          <td className="whitespace-nowrap px-3 py-3 text-xs text-[#6f625b]">{publicationDateLabel(post)}</td>
          <td className="whitespace-nowrap px-3 py-3 text-xs text-[#6f625b]">{formatCompactTehranDateTime(post.updatedAt)}</td>
          <td className="whitespace-nowrap px-3 py-3 text-xs text-[#6f625b]"><span className="block">{post.readingTimeMinutes || 1} دقیقه مطالعه</span><span className={post.coverImageId ? "text-[#5d8066]" : "text-[#9a6c48]"}>{post.coverImageId ? "تصویر شاخص دارد" : "بدون تصویر شاخص"}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="divide-y divide-[#eee7df] md:hidden">{posts.map((post) => <button type="button" key={post.id} onClick={() => onSelect(post.id)} className={`w-full p-4 text-right ${selectedId === post.id ? "bg-[#fbf2f2]" : "bg-white"}`}>
      <span className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block font-medium text-[#3f352f]">{post.title}</span><span dir="ltr" className="mt-1 block break-all text-left text-xs text-[#8b7d74]">/{post.slug}</span></span><StatusBadge status={post.status} /></span>
      <span className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-[#6f625b]"><span>{post.categoryName || "بدون دسته‌بندی"}</span><span>{publicationDateLabel(post)}</span><span>ویرایش: {formatCompactTehranDateTime(post.updatedAt)}</span><span>{post.readingTimeMinutes || 1} دقیقه · {post.coverImageId ? "با تصویر" : "بدون تصویر"}</span></span>
    </button>)}</div>
  </div>;
}

function EditorSection({ id, title, description, children }) {
  return <section id={id} className="scroll-mt-32 border-t border-[#eee7df] py-8 first:border-t-0 first:pt-0"><header className="mb-5"><h3 className="text-lg font-semibold text-[#3f352f]">{title}</h3><p className="mt-1 text-sm text-[#8b7d74]">{description}</p></header>{children}</section>;
}

function ContentFields({ form, update, updateContent, categories, posts, preview, onPreview, onUploadImage, onStatus, busy }) {
  const addFAQ = () => update("faqItems", [...form.faqItems, { question: "", answer: "" }]);
  return <div className="grid gap-4">
    <div className="grid gap-4 md:grid-cols-2"><Field label="عنوان مقاله"><input className={fieldClass} value={form.title} onChange={(e) => update("title", e.target.value)} maxLength={180} /></Field><Field label="Slug لاتین"><input dir="ltr" className={`${fieldClass} text-left`} value={form.slug} onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="choose-fabric-flower" /></Field></div>
    <Field label="خلاصه"><textarea className={`${fieldClass} min-h-24`} value={form.excerpt} onChange={(e) => update("excerpt", e.target.value)} maxLength={500} /></Field>
    <div className="grid gap-4 md:grid-cols-3"><Field label="دسته‌بندی"><select className={fieldClass} value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}><option value="">بدون دسته‌بندی</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="برچسب‌ها"><input className={fieldClass} value={form.tags.join("، ")} onChange={(e) => update("tags", splitList(e.target.value))} placeholder="استایل، گل پارچه‌ای" /></Field><Field label="نویسنده"><input className={fieldClass} value={form.authorName} onChange={(e) => update("authorName", e.target.value)} /></Field></div>
    <div className="flex items-center justify-between"><label className="text-sm font-medium text-[#5f544d]">متن مقاله</label><button type="button" onClick={onPreview} disabled={busy === "preview"} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d9cfc5] px-3 text-sm text-[#6f625b]">{busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}پیش‌نمایش نهایی</button></div>
    <React.Suspense fallback={<div className="grid min-h-[420px] place-items-center border border-[#d9cfc5] bg-white"><Loader2 className="h-5 w-5 animate-spin text-[#a05f62]" /></div>}><RichTextEditor contentKey={form.id || "new"} html={form.bodyHtmlSource} json={form.bodyJson} onChange={updateContent} onUploadImage={onUploadImage} onStatus={onStatus} /></React.Suspense>
    {preview ? <div className="rounded-md border border-[#d9cfc5] bg-[#fffdfb] p-5"><div className="mb-4 flex flex-wrap gap-2 text-xs text-[#807269]"><span>{preview.readingTimeMinutes} دقیقه مطالعه</span>{preview.warnings?.map((warning) => <span key={warning} className="bg-[#fff2dc] px-2 py-1 text-[#8a652e]">{warning}</span>)}</div><div className="admin-blog-preview" dangerouslySetInnerHTML={{ __html: preview.html }} /></div> : null}
    <section className="border-t border-[#eee7df] pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-[#3f352f]">سؤال‌های متداول</h3><button type="button" onClick={addFAQ} className="inline-flex h-9 items-center gap-1 text-sm text-[#a05f62]"><Plus className="h-4 w-4" />افزودن سؤال</button></div>{form.faqItems.map((faq, index) => <div key={index} className="mb-3 grid gap-2 border-b border-[#eee7df] pb-3 md:grid-cols-[1fr_1fr_auto]"><input className={fieldClass} value={faq.question} onChange={(e) => updateFAQ(form, update, index, "question", e.target.value)} placeholder="سؤال" /><textarea className={fieldClass} value={faq.answer} onChange={(e) => updateFAQ(form, update, index, "answer", e.target.value)} placeholder="پاسخ" /><button type="button" onClick={() => update("faqItems", form.faqItems.filter((_, i) => i !== index))} aria-label="حذف سؤال"><X className="h-4 w-4 text-[#b85d60]" /></button></div>)}</section>
    <section className="border-t border-[#eee7df] pt-5"><h3 className="mb-3 font-semibold text-[#3f352f]">مقالات مرتبط</h3><div className="grid gap-2 md:grid-cols-2">{posts.filter((post) => post.id !== form.id).map((post) => <label key={post.id} className="flex items-center gap-2 text-sm text-[#5f544d]"><input type="checkbox" checked={form.relatedPostIds.includes(post.id)} onChange={() => update("relatedPostIds", toggleValue(form.relatedPostIds, post.id))} />{post.title}</label>)}</div><p className="mt-2 text-xs text-[#8b7d74]">اگر انتخابی نداشته باشید، سه مقاله هم‌دسته خودکار نمایش داده می‌شود.</p></section>
    <section className="grid gap-3 border-t border-[#eee7df] pt-5 md:grid-cols-3"><Field label="متن دکمه CTA"><input className={fieldClass} value={form.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} /></Field><Field label="لینک CTA"><input dir="ltr" className={`${fieldClass} text-left`} value={form.ctaUrl} onChange={(e) => update("ctaUrl", e.target.value)} placeholder="/custom-order" /></Field><Field label="توضیح CTA"><input className={fieldClass} value={form.ctaText} onChange={(e) => update("ctaText", e.target.value)} /></Field></section>
  </div>;
}

function MediaFields({ form, update, images, setImages, token, onUpload, onSetCover, busy, onStatus }) {
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
  return <div><div className="flex flex-wrap items-center gap-3"><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className={fieldClass} /><button type="button" onClick={() => onUpload(inputRef.current?.files || [])} disabled={busy === "upload"} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#a05f62] px-4 text-sm text-white">{busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}آپلود</button></div><p className="mt-2 text-xs text-[#807269]">JPG، PNG یا WebP؛ حداکثر ۸MB و ۶۰۰۰×۶۰۰۰. اگر مقاله تصویر شاخص نداشته باشد، اولین تصویر آپلودشده خودکار انتخاب و ذخیره می‌شود.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{images.map((image) => <article key={image.id} className="rounded-md border border-[#e5ddd5] p-3"><img src={image.url} alt={image.alt} className="aspect-[4/3] w-full rounded-md object-cover" /><div className="mt-3 grid gap-2"><input className={fieldClass} value={image.alt} onChange={(e) => setImages((current) => current.map((item) => item.id === image.id ? { ...item, alt: e.target.value } : item))} placeholder="alt تصویر" /><input className={fieldClass} value={image.caption || ""} onChange={(e) => setImages((current) => current.map((item) => item.id === image.id ? { ...item, caption: e.target.value } : item))} placeholder="caption" /><div className="flex flex-wrap gap-2"><button type="button" onClick={() => saveImage(image)} className="h-9 rounded-md border border-[#d9cfc5] px-3 text-xs">ذخیره alt و caption</button><button type="button" onClick={() => onSetCover(image)} disabled={Boolean(busy)} className="h-9 rounded-md border border-[#d9cfc5] px-3 text-xs disabled:opacity-50">{form.coverImageId === image.id ? "ذخیره تغییرات تصویر شاخص" : "انتخاب به‌عنوان تصویر شاخص"}</button><button type="button" onClick={() => { update("ogImageId", image.id); update("ogImageAlt", image.alt); }} className="h-9 rounded-md border border-[#d9cfc5] px-3 text-xs">تصویر OG</button><button type="button" onClick={() => copyImageHTML(image)} className="grid h-9 w-9 place-items-center rounded-md border border-[#d9cfc5]" title="کپی HTML"><Clipboard className="h-4 w-4" /></button><button type="button" onClick={() => remove(image.id)} className="grid h-9 w-9 place-items-center text-[#b85d60]" aria-label="حذف"><Trash2 className="h-4 w-4" /></button></div>{form.coverImageId === image.id ? <span className="text-xs text-[#5d8066]">تصویر شاخص روی سایت ذخیره شده است.</span> : null}</div></article>)}</div>
  </div>;
}

function SEOFields({ form, update, warnings }) {
  return <div className="grid gap-4"><Field label="کلیدواژه اصلی"><input className={fieldClass} value={form.focusKeyword} onChange={(e) => update("focusKeyword", e.target.value)} /></Field><Field label="کلیدواژه‌های فرعی"><input className={fieldClass} value={form.secondaryKeywords.join("، ")} onChange={(e) => update("secondaryKeywords", splitList(e.target.value))} /></Field><Field label={`عنوان SEO (${[...form.seoTitle].length}/۶۰)`}><input className={fieldClass} value={form.seoTitle} onChange={(e) => update("seoTitle", e.target.value)} maxLength={180} /></Field><Field label={`توضیح SEO (${[...form.seoDescription].length}/۱۶۰)`}><textarea className={`${fieldClass} min-h-24`} value={form.seoDescription} onChange={(e) => update("seoDescription", e.target.value)} maxLength={320} /></Field><section className="bg-[#fbf9f6] p-4"><h3 className="font-semibold text-[#3f352f]">کنترل کیفیت</h3>{warnings.length ? <ul className="mt-3 list-disc space-y-2 pr-5 text-sm text-[#8a652e]">{warnings.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-[#5d8066]">بررسی‌های اصلی محتوا پاس شده‌اند.</p>}</section></div>;
}

function PublicationFields({ form, scheduleDate, onScheduleDateChange, publishedDate, publishedDateDirty, onPublishedDateChange, onSavePublishedAt, onPublication, busy }) {
  const isDraft = form.status === "draft";
  const isScheduled = form.status === "scheduled";
  const isPublished = form.status === "published";
  const isArchived = form.status === "archived";
  return <div className="grid gap-6">
    <section className="bg-[#fbf9f6] p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-sm text-[#5f544d]">وضعیت فعلی:</span><StatusBadge status={form.status} /></div>{form.publishedAt ? <p className="mt-3 text-xs text-[#807269]">تاریخ انتشار: {formatTehranDateTime(form.publishedAt)}</p> : null}{form.scheduledFor ? <div className="mt-3 space-y-1 text-xs text-[#807269]"><p>زمان‌بندی تهران: {formatTehranDateTime(form.scheduledFor)}</p><p dir="ltr" className="text-right">UTC: {new Date(form.scheduledFor).toISOString()}</p></div> : null}</section>

    {isPublished ? <div className="grid max-w-xl gap-3"><label className="text-sm font-medium text-[#5f544d]">اصلاح تاریخ انتشار با تقویم شمسی و ساعت تهران</label><DatePicker value={publishedDate} onChange={onPublishedDateChange} calendar={persian} locale={persianFa} format="YYYY/MM/DD HH:mm" plugins={[<TimePicker key="published-time" position="bottom" hideSeconds />]} inputClass={fieldClass} calendarPosition="bottom-right" /><p className="text-xs text-[#8b7d74]">تاریخ آینده پذیرفته نمی‌شود و برای انتشار آینده باید از زمان‌بندی استفاده کنید.</p><div><button type="button" onClick={onSavePublishedAt} disabled={Boolean(busy) || !publishedDate || !publishedDateDirty} className="h-10 rounded-md border border-[#c08081] px-4 text-sm text-[#a05f62] disabled:opacity-50">{busy === "published-at" ? "در حال ذخیره..." : "ذخیره تاریخ انتشار"}</button></div></div> : null}

    {isDraft || isScheduled ? <div className="grid max-w-xl gap-3"><label className="text-sm font-medium text-[#5f544d]">زمان انتشار با تقویم شمسی و ساعت تهران</label><DatePicker value={scheduleDate} onChange={onScheduleDateChange} calendar={persian} locale={persianFa} format="YYYY/MM/DD HH:mm" plugins={[<TimePicker key="schedule-time" position="bottom" hideSeconds />]} inputClass={fieldClass} calendarPosition="bottom-right" /></div> : null}

    <div className="flex flex-wrap gap-2">
      {isDraft || isScheduled || isArchived ? <button type="button" onClick={() => onPublication("published")} disabled={Boolean(busy)} className="h-11 rounded-full bg-[#a05f62] px-5 text-sm text-white disabled:opacity-50">{isArchived ? "انتشار دوباره" : "انتشار اکنون"}</button> : null}
      {isDraft || isScheduled ? <button type="button" onClick={() => onPublication("scheduled")} disabled={Boolean(busy) || !scheduleDate} className="h-11 rounded-full border border-[#c08081] px-5 text-sm text-[#a05f62] disabled:opacity-50">{isScheduled ? "به‌روزرسانی زمان‌بندی" : "زمان‌بندی انتشار"}</button> : null}
      {isPublished ? <button type="button" onClick={() => onPublication("archived")} disabled={Boolean(busy)} className="h-11 rounded-md border border-[#d9cfc5] px-5 text-sm text-[#6f625b] disabled:opacity-50">آرشیو مقاله</button> : null}
    </div>
  </div>;
}

function CategoryManager({ categories, setCategories, token, onStatus, onChanged }) {
  const [category, setCategory] = useState({ name: "", slug: "", description: "", sortOrder: 0, isActive: true });
  const save = async () => { try { const editing = Boolean(category.id); const data = await apiRequest(editing ? `admin/blog-categories/${category.id}` : "admin/blog-categories", { token, method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(category) }); setCategories((current) => editing ? current.map((item) => item.id === data.category.id ? data.category : item) : [...current, data.category]); setCategory({ name: "", slug: "", description: "", sortOrder: 0, isActive: true }); await onChanged?.(); } catch (error) { onStatus({ type: "error", message: error.message }); } };
  const remove = async (id) => { if (!window.confirm("دسته‌بندی حذف شود؟ مقاله‌ها بدون دسته‌بندی باقی می‌مانند.")) return; try { await apiRequest(`admin/blog-categories/${id}`, { token, method: "DELETE" }); setCategories((current) => current.filter((item) => item.id !== id)); await onChanged?.(); } catch (error) { onStatus({ type: "error", message: error.message }); } };
  return <section><div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><input className={fieldClass} value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })} placeholder="نام فارسی" /><input dir="ltr" className={`${fieldClass} text-left`} value={category.slug} onChange={(e) => setCategory({ ...category, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="latin-slug" /><button type="button" onClick={save} className="h-10 rounded-md bg-[#51645a] px-4 text-sm text-white">{category.id ? "ویرایش" : "افزودن"}</button></div><div className="mt-2 grid gap-2 md:grid-cols-[1fr_140px_auto]"><input className={fieldClass} value={category.description || ""} onChange={(e) => setCategory({ ...category, description: e.target.value })} placeholder="توضیح کوتاه دسته‌بندی" /><input type="number" className={fieldClass} value={category.sortOrder || 0} onChange={(e) => setCategory({ ...category, sortOrder: Number(e.target.value) })} placeholder="ترتیب" /><label className="flex items-center gap-2 text-sm text-[#5f544d]"><input type="checkbox" checked={category.isActive !== false} onChange={(e) => setCategory({ ...category, isActive: e.target.checked })} />فعال</label></div><div className="mt-3 flex flex-wrap gap-2">{categories.map((item) => <span key={item.id} className="inline-flex items-center gap-2 bg-[#f7f3ef] px-3 py-2 text-xs"><button type="button" onClick={() => setCategory(item)} className="text-[#5f544d]">{item.name}</button><button type="button" onClick={() => remove(item.id)} aria-label="حذف دسته‌بندی"><X className="h-3.5 w-3.5 text-[#b85d60]" /></button></span>)}</div></section>;
}

function Field({ label, children }) { return <label className="grid gap-2 text-sm font-medium text-[#5f544d]"><span>{label}</span>{children}</label>; }
function splitList(value) { return value.split(/[،,]/).map((item) => item.trim()).filter(Boolean); }
function toggleValue(values, value) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function updateFAQ(form, update, index, field, value) { update("faqItems", form.faqItems.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)); }
function statusLabel(status) { return ({ draft: "پیش‌نویس", scheduled: "زمان‌بندی‌شده", published: "منتشرشده", archived: "آرشیو" }[status] || status); }
function StatusBadge({ status }) {
  const classes = { draft: "bg-[#eee9e3] text-[#6f625b]", scheduled: "bg-[#fff2dc] text-[#8a652e]", published: "bg-[#e7f1e9] text-[#42644b]", archived: "bg-[#eeeef0] text-[#62616a]" };
  return <span className={`inline-flex whitespace-nowrap px-2.5 py-1 text-xs font-medium ${classes[status] || classes.draft}`}>{statusLabel(status)}</span>;
}
function publicationMessage(status) { return ({ published: "مقاله منتشر شد.", scheduled: "انتشار مقاله زمان‌بندی شد.", archived: "مقاله آرشیو شد.", draft: "مقاله به پیش‌نویس برگشت." }[status] || "وضعیت انتشار تغییر کرد."); }
function copyImageHTML(image) { const alt = String(image.alt || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"); navigator.clipboard.writeText(`<figure><img src="${image.url}" alt="${alt}" width="${image.width || 1200}" height="${image.height || 800}" loading="lazy">${image.caption ? `<figcaption>${image.caption}</figcaption>` : ""}</figure>`); }
function activateRow(event, action) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

function publicationDateLabel(post) {
  if (post.status === "scheduled" && post.scheduledFor) return formatCompactTehranDateTime(post.scheduledFor);
  if (post.publishedAt) return formatCompactTehranDateTime(post.publishedAt);
  return "منتشر نشده";
}
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
  return { ...post, bodyHtmlSource: post?.bodyHtmlSource || post?.bodyHtml || "", bodyJson: post?.bodyJson || {} };
}

function dateObjectFromTehranLocal(value) {
  if (!value) return null;
  return new DateObject({ date: value, format: "YYYY-MM-DD HH:mm", calendar: gregorian, locale: gregorianEn }).convert(persian, persianFa);
}

function dateObjectFromISOInTehran(value) {
  if (!value) return null;
  return dateObjectFromTehranLocal(tehranLocalFromISO(value));
}

function dateObjectToGregorianLocal(value) {
  return new DateObject(value).convert(gregorian, gregorianEn).format("YYYY-MM-DD HH:mm");
}

function tehranLocalFromISO(value) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
}

function formatTehranDateTime(value) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value));
}

function formatCompactTehranDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(new Date(value));
}
