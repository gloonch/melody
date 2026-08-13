import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  MessageSquareText,
  PackageSearch,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Upload,
  Users,
  Video,
} from "lucide-react";
import { BlogManager } from "./BlogManager";
import { apiRequest } from "./api";

const TOKEN_KEY = "melody_admin_token";
const courseStatusOptions = [
  { value: "recording", label: "در حال ضبط" },
  { value: "for_sale", label: "قابل فروش" },
  { value: "sold_out", label: "تکمیل ظرفیت" },
  { value: "in_production", label: "در حال تولید" },
  { value: "in_progress", label: "در حال برگزاری" },
  { value: "completed", label: "اتمام دوره" },
  { value: "draft", label: "پیش‌نویس" },
  { value: "archived", label: "آرشیو" },
];
const orderStatusOptions = [
  { value: "pending_review", label: "در انتظار بررسی" },
  { value: "need_more_info", label: "نیازمند اطلاعات بیشتر" },
  { value: "confirmed", label: "تایید شده" },
  { value: "in_progress", label: "در حال ساخت" },
  { value: "ready", label: "آماده تحویل" },
  { value: "delivered", label: "تحویل شده" },
  { value: "cancelled", label: "لغو شده" },
];

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function latinDigits(value) {
  return String(value || "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function tomanToRial(value) {
  const toman = Number(latinDigits(value).replace(/[^0-9]/g, ""));
  return Number.isFinite(toman) ? toman * 10 : 0;
}

function formatToman(rial) {
  const value = Number(rial);
  return value > 0 ? `${new Intl.NumberFormat("fa-IR").format(Math.round(value / 10))} تومان` : "بدون قیمت";
}

function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const isLoading = status.type === "loading";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "loading", message: "" });

    try {
      const data = await apiRequest("admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onLogin(data.token);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-[#f6f3ef] px-4">
      <section className="w-full max-w-sm rounded-lg border border-[#ded5cc] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#c08081] text-white">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#3f352f]">پنل مدیریت golmelo</h1>
            <p className="mt-1 text-sm text-[#807269]">ورود ادمین</p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-[#5f544d]">
            نام کاربری
            <input
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              className="h-11 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#c08081]"
              autoComplete="username"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-[#5f544d]">
            رمز عبور
            <input
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="h-11 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#c08081]"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#c08081] px-4 text-sm font-medium text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ورود
          </button>
        </form>

        {status.message ? <p className="mt-4 text-sm text-[#b85d60]">{status.message}</p> : null}
      </section>
    </main>
  );
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-[#e0d7cd] bg-white p-4 shadow-sm">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#f0ebe5] text-[#c08081]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-semibold text-[#3f352f]">{value}</div>
      <div className="mt-1 text-sm text-[#807269]">{label}</div>
    </div>
  );
}

function ImageManager({ title, description, images, uploadLabel, onUpload, onDelete, busy }) {
  const fileInputRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;
    onUpload(files).then(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  return (
    <section className="rounded-lg border border-[#e0d7cd] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#3f352f]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#807269]">{description}</p>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="max-w-64 rounded-md border border-[#d9cfc5] bg-[#fbf9f6] px-3 py-2 text-sm text-[#5f544d]"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#c08081] px-4 text-sm font-medium text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploadLabel}
          </button>
        </form>
      </div>

      {images.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#d9cfc5] bg-[#fbf9f6] p-6 text-center text-sm text-[#807269]">
          هنوز تصویری ثبت نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {images.map((image) => (
            <article key={image.id} className="overflow-hidden rounded-lg border border-[#e5ddd5] bg-[#fbf9f6]">
              <div className="aspect-square bg-[#efe8df]">
                <img src={image.url} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="min-w-0 truncate text-xs text-[#807269]" title={image.filename}>
                  {image.filename}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(image.id)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#b85d60] transition hover:bg-[#f4e6e7]"
                  aria-label="حذف تصویر"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ContactRequestsTable({ requests, onDelete, deletingId }) {
  return (
    <section className="rounded-lg border border-[#e0d7cd] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[#3f352f]">پیام‌های فرم تماس</h2>
        <p className="mt-1 text-sm text-[#807269]">نام، شماره یا راه ارتباطی، متن پیام و تاریخ ارسال.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-right text-sm">
          <thead>
            <tr className="bg-[#f4eee8] text-[#5f544d]">
              <th className="rounded-r-md border-y border-r border-[#e0d7cd] px-3 py-3 font-medium">نام شخص</th>
              <th className="border-y border-[#e0d7cd] px-3 py-3 font-medium">شماره تلفن</th>
              <th className="border-y border-[#e0d7cd] px-3 py-3 font-medium">پیام</th>
              <th className="border-y border-[#e0d7cd] px-3 py-3 font-medium">تاریخ ارسال</th>
              <th className="rounded-l-md border-y border-l border-[#e0d7cd] px-3 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[#807269]">
                  هنوز پیامی ثبت نشده است.
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className="align-top">
                  <td className="border-b border-[#eee7df] px-3 py-3 font-medium text-[#3f352f]">{request.fullName}</td>
                  <td className="border-b border-[#eee7df] px-3 py-3 text-[#5f544d]">{request.contact}</td>
                  <td className="max-w-xl border-b border-[#eee7df] px-3 py-3 leading-6 text-[#5f544d]">{request.message}</td>
                  <td className="whitespace-nowrap border-b border-[#eee7df] px-3 py-3 text-[#807269]">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#eee7df] px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onDelete(request.id)}
                      disabled={deletingId === request.id}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e4c6c8] bg-white px-3 text-sm text-[#b85d60] transition hover:bg-[#f4e6e7] disabled:opacity-50"
                    >
                      {deletingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      حذف
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CourseSignupsTable({ signups, onDelete, deletingId }) {
  return (
    <section className="rounded-lg border border-[#e0d7cd] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[#3f352f]">درخواست‌های دوره</h2>
        <p className="mt-1 text-sm text-[#807269]">درخواست خرید، اطلاع از انتشار یا عضویت در فهرست انتظار هر دوره.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-separate border-spacing-0 text-right text-sm">
          <thead>
            <tr className="bg-[#f4eee8] text-[#5f544d]">
              <th className="rounded-r-md border-y border-r border-[#e0d7cd] px-3 py-3 font-medium">شماره تلفن</th>
              <th className="border-y border-[#e0d7cd] px-3 py-3 font-medium">دوره</th>
              <th className="border-y border-[#e0d7cd] px-3 py-3 font-medium">نوع درخواست</th>
              <th className="border-y border-[#e0d7cd] px-3 py-3 font-medium">تاریخ ثبت</th>
              <th className="rounded-l-md border-y border-l border-[#e0d7cd] px-3 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {signups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[#807269]">
                  هنوز درخواستی ثبت نشده است.
                </td>
              </tr>
            ) : (
              signups.map((signup) => (
                <tr key={signup.id}>
                  <td className="border-b border-[#eee7df] px-3 py-3 font-medium text-[#3f352f]">{signup.phone}</td>
                  <td className="border-b border-[#eee7df] px-3 py-3 text-[#5f544d]">
                    {signup.courseTitle || signup.courseSlug || signup.courseId || "-"}
                  </td>
                  <td className="border-b border-[#eee7df] px-3 py-3 text-[#5f544d]">
                    {signup.requestType === "notification" ? "اطلاع از انتشار" : signup.requestType === "waitlist" ? "فهرست انتظار" : "خرید دوره"}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#eee7df] px-3 py-3 text-[#807269]">
                    {formatDate(signup.createdAt)}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#eee7df] px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onDelete(signup.id)}
                      disabled={deletingId === signup.id}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e4c6c8] bg-white px-3 text-sm text-[#b85d60] transition hover:bg-[#f4e6e7] disabled:opacity-50"
                    >
                      {deletingId === signup.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      حذف
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderStatusBadge({ status }) {
  const label = orderStatusOptions.find((item) => item.value === status)?.label || status || "نامشخص";
  const tone = {
    delivered: "bg-[#edf7f0] text-[#4d9a61]",
    cancelled: "bg-[#fff1f1] text-[#b85d60]",
    ready: "bg-[#fff8e8] text-[#b07b28]",
    in_progress: "bg-[#eef6ff] text-[#4372a6]",
    confirmed: "bg-[#f1f4ff] text-[#5669b0]",
    need_more_info: "bg-[#fff7ed] text-[#b06d32]",
    pending_review: "bg-[#f5f7fb] text-[#6f7e96]",
  }[status] || "bg-[#f5f7fb] text-[#6f7e96]";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{label}</span>;
}

function OrdersTable({ orders, onUpdateStatus, updatingId }) {
  const [drafts, setDrafts] = useState({});

  const draftFor = (order) => drafts[order.id] || { status: order.status || "pending_review", adminNote: order.adminNote || "" };

  const updateDraft = (order, field, value) => {
    setDrafts((current) => ({
      ...current,
      [order.id]: {
        ...draftFor(order),
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event, order) => {
    event.preventDefault();
    const draft = draftFor(order);
    await onUpdateStatus(order.id, draft.status, draft.adminNote);
  };

  return (
    <section className="rounded-lg border border-[#e0d7cd] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[#3f352f]">سفارش‌های مشتریان</h2>
        <p className="mt-1 text-sm text-[#807269]">درخواست‌های ثبت‌شده از پنل مشتری و تغییر وضعیت سفارش.</p>
      </div>

      <div className="grid gap-4">
        {orders.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#d9cfc5] bg-[#fbf9f6] p-6 text-center text-sm text-[#807269]">
            هنوز سفارشی ثبت نشده است.
          </div>
        ) : (
          orders.map((order) => {
            const draft = draftFor(order);
            return (
              <article key={order.id} className="grid gap-4 rounded-lg border border-[#eee7df] bg-[#fbf9f6] p-4">
                <div className="grid gap-3 lg:grid-cols-[96px_1fr_auto] lg:items-start">
                  <div className="aspect-square overflow-hidden rounded-md bg-[#efe8df]">
                    {order.productSnapshot?.coverImageUrl ? (
                      <img src={order.productSnapshot.coverImageUrl} alt={order.productSnapshot.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#3f352f]">{order.productSnapshot?.title || "سفارش گلملو"}</h3>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-sm leading-6 text-[#5f544d]">
                      مشتری: {order.userName || "کاربر گلملو"} · {order.userPhone || "بدون شماره"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#807269]">
                      کاربرد: {order.usage || "-"} · رنگ: {order.preferredColor || "-"} · تاریخ موردنیاز: {order.neededBy || "-"}
                    </p>
                    {order.customerNote ? <p className="mt-2 rounded-md bg-white px-3 py-2 text-sm leading-6 text-[#5f544d]">{order.customerNote}</p> : null}
                    <p className="mt-2 text-xs text-[#9a8a80]">ثبت: {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-xs text-[#807269]">#{order.id}</div>
                </div>

                <form className="grid gap-3 border-t border-[#eee7df] pt-4 lg:grid-cols-[220px_1fr_auto] lg:items-end" onSubmit={(event) => handleSubmit(event, order)}>
                  <label className="grid gap-2 text-sm text-[#5f544d]">
                    وضعیت
                    <select
                      value={draft.status}
                      onChange={(event) => updateDraft(order, "status", event.target.value)}
                      className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none"
                    >
                      {orderStatusOptions.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm text-[#5f544d]">
                    یادداشت تیم
                    <input
                      value={draft.adminNote}
                      onChange={(event) => updateDraft(order, "adminNote", event.target.value)}
                      className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none"
                      placeholder="مثلاً برای تایید رنگ با مشتری تماس گرفته شد."
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={updatingId === order.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#c08081] px-4 text-sm font-medium text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {updatingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    ذخیره وضعیت
                  </button>
                </form>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

const emptyProductForm = {
  id: "",
  slug: "",
  title: "",
  shortDescription: "",
  description: "",
  coverImageId: "",
  category: "گل پارچه‌ای",
  usageLabel: "",
  useCases: [],
  techniques: [],
  materials: [],
  colors: [],
  diameterCm: "",
  isCustomizable: true,
  customizableColor: false,
  customizableSize: false,
  customizableMaterial: false,
  priceLabel: "",
  basePriceToman: "",
  priceCurrency: "IRR",
  availability: "in_stock",
  preparationTime: "",
  preparationDays: "1",
  isFeatured: false,
  featuredOrder: "0",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
  sortOrder: "0",
};

const productStatusOptions = [
  { value: "draft", label: "پیش‌نویس" },
  { value: "active", label: "منتشرشده" },
  { value: "archived", label: "آرشیو" },
];

const availabilityOptions = [
  { value: "in_stock", label: "موجود و آماده سفارش" },
  { value: "made_to_order", label: "ساخت پس از سفارش" },
  { value: "out_of_stock", label: "ناموجود" },
];

const productUseCaseOptions = [
  { value: "evening_dress", label: "لباس مجلسی" },
  { value: "wedding_dress", label: "لباس عروس و عقد" },
  { value: "coat_manto", label: "کت و مانتو" },
  { value: "hat", label: "کلاه" },
  { value: "hair_accessory", label: "اکسسوری مو" },
  { value: "multipurpose", label: "چندمنظوره" },
];

const productTechniqueOptions = [
  { value: "kerisheh", label: "کریشه" },
  { value: "fashion", label: "فشن" },
  { value: "stumpwork", label: "استامپ‌ورک" },
  { value: "classic", label: "کلاسیک" },
  { value: "three_dimensional", label: "سه‌بعدی" },
];

const productMaterialOptions = [
  { value: "chiffon", label: "حریر" },
  { value: "satin", label: "ساتن" },
  { value: "organza", label: "ارگانزا" },
  { value: "velvet", label: "مخمل" },
  { value: "tulle", label: "تور" },
  { value: "crepe", label: "کرپ" },
  { value: "mixed", label: "ترکیبی" },
];

const productColorOptions = [
  { value: "white", label: "سفید", swatch: "#ffffff" },
  { value: "black", label: "مشکی", swatch: "#1f1f1f" },
  { value: "cream", label: "کرم", swatch: "#ead8b7" },
  { value: "ivory", label: "شیری", swatch: "#f3ead8" },
  { value: "pink", label: "صورتی", swatch: "#d996a8" },
  { value: "red", label: "قرمز", swatch: "#a83d45" },
  { value: "blue", label: "آبی", swatch: "#557d9d" },
  { value: "green", label: "سبز", swatch: "#55735f" },
  { value: "gold", label: "طلایی", swatch: "#b08a43" },
  { value: "silver", label: "نقره‌ای", swatch: "#a7a7a4" },
  { value: "purple", label: "بنفش", swatch: "#795b80" },
  { value: "multicolor", label: "چندرنگ", swatch: "linear-gradient(135deg,#a83d45,#d9a34a,#557d9d)" },
];

const productTaxonomyFields = [
  { field: "useCases", label: "کاربردهای محصول", options: productUseCaseOptions },
  { field: "techniques", label: "تکنیک ساخت", options: productTechniqueOptions },
  { field: "materials", label: "جنس پارچه", options: productMaterialOptions },
  { field: "colors", label: "رنگ‌های محصول", options: productColorOptions },
];

const productTaxonomyValues = Object.fromEntries(
  productTaxonomyFields.map(({ field, options }) => [field, new Set(options.map((option) => option.value))]),
);

function isProductMetadataIncomplete(product) {
  return Number(product.basePriceRial) <= 0
    || !product.usageLabel
    || !(product.useCases || []).length
    || !(product.techniques || []).length
    || !(product.materials || []).length
    || !(product.colors || []).length
    || !(Number(product.diameterCm) > 0)
    || /^نمونه[‌-]?کار\s*\d+$/u.test(product.title || "");
}

function productToForm(product) {
  if (!product) return { ...emptyProductForm };
  return {
    ...emptyProductForm,
    ...product,
    basePriceToman: product.basePriceRial > 0 ? String(Math.round(product.basePriceRial / 10)) : "",
    preparationDays: String(product.preparationDays ?? 1),
    featuredOrder: String(product.featuredOrder ?? 0),
    sortOrder: String(product.sortOrder ?? 0),
    useCases: (product.useCases || []).filter((value) => productTaxonomyValues.useCases.has(value)),
    techniques: (product.techniques || []).filter((value) => productTaxonomyValues.techniques.has(value)),
    materials: (product.materials || []).filter((value) => productTaxonomyValues.materials.has(value)),
    colors: (product.colors || []).filter((value) => productTaxonomyValues.colors.has(value)),
    diameterCm: product.diameterCm == null ? "" : String(product.diameterCm),
  };
}

function productFromForm(form) {
  const diameterValue = Number(latinDigits(form.diameterCm));
  return {
    id: form.id.trim(),
    slug: form.slug.trim(),
    title: form.title.trim(),
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    coverImageId: form.coverImageId,
    category: form.category.trim(),
    usageLabel: form.usageLabel.trim(),
    useCases: form.useCases,
    techniques: form.techniques,
    materials: form.materials,
    colors: form.colors,
    diameterCm: Number.isFinite(diameterValue) && diameterValue > 0 ? diameterValue : null,
    isCustomizable: Boolean(form.isCustomizable),
    customizableColor: Boolean(form.customizableColor),
    customizableSize: Boolean(form.customizableSize),
    customizableMaterial: Boolean(form.customizableMaterial),
    priceLabel: form.priceLabel.trim(),
    basePriceRial: tomanToRial(form.basePriceToman),
    priceCurrency: "IRR",
    availability: form.availability,
    preparationTime: form.preparationTime.trim(),
    preparationDays: Number(latinDigits(form.preparationDays)) || 0,
    isFeatured: Boolean(form.isFeatured),
    featuredOrder: Number(latinDigits(form.featuredOrder)) || 0,
    seoTitle: form.seoTitle.trim(),
    seoDescription: form.seoDescription.trim(),
    status: form.status,
    sortOrder: Number(latinDigits(form.sortOrder)) || 0,
  };
}

function ProductManager({ products, projectImages, token, onReload, onStatus }) {
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(() => productToForm(null));
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: "idle", message: "" });
  const selectedImage = projectImages.find((image) => image.id === form.coverImageId);
  const featuredCount = products.filter((product) => product.isFeatured && product.status === "active").length;
  const incompleteCount = products.filter(isProductMetadataIncomplete).length;

  const update = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setSaveStatus({ type: "idle", message: "" });
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleTaxonomyValue = (field, value) => {
    setSaveStatus({ type: "idle", message: "" });
    setForm((current) => {
      const selected = current[field] || [];
      return {
        ...current,
        [field]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  };

  const handleNew = () => {
    const timestamp = Date.now();
    setSelectedId("");
    setForm({ ...emptyProductForm, id: `product-${timestamp}`, slug: `fabric-flower-${timestamp}` });
    setSaveStatus({ type: "idle", message: "" });
    setIsOpen(true);
  };

  const handleEdit = (product) => {
    setSelectedId(product.id);
    setForm(productToForm(product));
    setSaveStatus({ type: "idle", message: "" });
    setIsOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setBusy(true);
    setSaveStatus({ type: "idle", message: "" });
    try {
      const path = selectedId ? `admin/products/${selectedId}` : "admin/products";
      const data = await apiRequest(path, {
        method: selectedId ? "PUT" : "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productFromForm(form)),
      });
      setSelectedId(data.product.id);
      setForm(productToForm(data.product));
      await onReload();
      setSaveStatus({ type: "success", message: "تغییرات محصول ذخیره شد." });
      onStatus({ type: "idle", message: "" });
    } catch (error) {
      setSaveStatus({ type: "error", message: error.message });
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-[#e0d7cd] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#3f352f]">مدیریت محصولات</h2>
          <p className="mt-1 text-sm leading-6 text-[#807269]">قیمت در این فرم به تومان وارد و در دیتابیس به ریال ذخیره می‌شود. محصولات ناقص را پیش‌نویس نگه دارید.</p>
          <p className="mt-1 text-xs text-[#9b696b]">محصولات منتخب صفحه اصلی: {featuredCount} از ۳</p>
          {incompleteCount > 0 ? <p className="mt-1 text-xs font-medium text-[#b06d32]">{incompleteCount} محصول هنوز مشخصات ساختاری، نام یا قیمت کامل ندارد.</p> : null}
        </div>
        <button type="button" onClick={handleNew} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#a05f62] px-4 text-sm text-white shadow-sm">
          <Plus className="h-4 w-4" /> محصول جدید
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((product) => {
          const isIncomplete = isProductMetadataIncomplete(product);
          return (
            <article key={product.id} className="flex items-center gap-3 rounded-lg border border-[#eee7df] bg-[#fbf9f6] p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[#eee7df]">
                {product.coverImageUrl ? <img src={product.coverImageUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-medium text-[#3f352f]">{product.title}</h3>
                  {product.isFeatured ? <span className="rounded-full bg-[#edf2ec] px-2 py-1 text-xs text-[#51645a]">منتخب</span> : null}
                  {isIncomplete ? <span className="rounded-full bg-[#fff3e8] px-2 py-1 text-xs text-[#a9632d]">نیازمند تکمیل</span> : null}
                </div>
                <p className="mt-1 text-xs text-[#807269]">{formatToman(product.basePriceRial)} · {productStatusOptions.find((item) => item.value === product.status)?.label}</p>
              </div>
              <button type="button" onClick={() => handleEdit(product)} className="h-9 rounded-full bg-[#a05f62] px-4 text-sm text-white">ویرایش</button>
            </article>
          );
        })}
      </div>

      {isOpen ? (
        <form onSubmit={handleSave} className="mt-6 grid gap-4 border-t border-[#eee7df] pt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[#3f352f]">{selectedId ? "ویرایش محصول" : "محصول جدید"}</h3>
            <button type="button" onClick={() => setIsOpen(false)} className="h-9 rounded-md border border-[#d9cfc5] px-3 text-sm text-[#807269]">بستن</button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[["id", "شناسه"], ["slug", "آدرس"], ["title", "نام محصول"], ["category", "دسته‌بندی"], ["usageLabel", "توضیح کوتاه کاربرد"], ["diameterCm", "قطر (سانتی‌متر)"], ["basePriceToman", "قیمت پایه (تومان)"], ["preparationDays", "آماده‌سازی (روز کاری)"], ["featuredOrder", "ترتیب منتخب"], ["sortOrder", "ترتیب کاتالوگ"]].map(([field, label]) => (
              <label key={field} className="grid gap-2 text-sm text-[#5f544d]">
                {label}
                <input value={form[field]} onChange={update(field)} disabled={field === "id" && Boolean(selectedId)} className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 outline-none focus:border-[#c08081] disabled:bg-[#f3f0ec]" />
              </label>
            ))}
            <label className="grid gap-2 text-sm text-[#5f544d]">موجودی
              <select value={form.availability} onChange={update("availability")} className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3">
                {availabilityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-[#5f544d]">وضعیت انتشار
              <select value={form.status} onChange={update("status")} className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3">
                {productStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-[#5f544d]">تصویر محصول
              <select value={form.coverImageId} onChange={update("coverImageId")} className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3">
                <option value="">انتخاب تصویر</option>
                {projectImages.map((image) => <option key={image.id} value={image.id}>{image.alt} · {image.filename}</option>)}
              </select>
            </label>
          </div>

          {selectedImage ? <img src={selectedImage.url} alt={selectedImage.alt} className="h-28 w-28 rounded-md object-cover" /> : null}

          {[["shortDescription", "توضیح کوتاه", 2], ["description", "توضیحات کامل و یکتا", 5], ["seoTitle", "عنوان SEO اختیاری (حداکثر ۷۰ کاراکتر)", 2], ["seoDescription", "توضیح SEO اختیاری (حداکثر ۱۸۰ کاراکتر)", 3]].map(([field, label, rows]) => (
            <label key={field} className="grid gap-2 text-sm text-[#5f544d]">{label}
              <textarea value={form[field]} onChange={update(field)} rows={rows} className="rounded-md border border-[#d9cfc5] bg-white px-3 py-2 outline-none focus:border-[#c08081]" />
            </label>
          ))}

          <div className="grid gap-4 md:grid-cols-2">
            {productTaxonomyFields.map(({ field, label, options }) => (
              <fieldset key={field} className="rounded-lg border border-[#e5ddd4] p-4">
                <legend className="px-2 text-sm font-medium text-[#5f544d]">{label}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {options.map((option) => {
                    const checked = (form[field] || []).includes(option.value);
                    return (
                      <label key={option.value} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${checked ? "border-[#a05f62] bg-[#f8eeee] text-[#824b4e]" : "border-[#ddd4ca] bg-white text-[#6f6259]"}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleTaxonomyValue(field, option.value)} className="accent-[#a05f62]" />
                        {option.swatch ? <span aria-hidden="true" className="h-4 w-4 rounded-full border border-black/10" style={{ background: option.swatch }} /> : null}
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="flex flex-wrap gap-5 text-sm text-[#5f544d]">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isCustomizable} onChange={update("isCustomizable")} /> قابل شخصی‌سازی</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.customizableColor} onChange={update("customizableColor")} /> رنگ قابل تغییر</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.customizableSize} onChange={update("customizableSize")} /> اندازه قابل تغییر</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.customizableMaterial} onChange={update("customizableMaterial")} /> جنس قابل تغییر</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={update("isFeatured")} /> نمایش در سه محصول منتخب</label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-[#a05f62] px-5 text-sm text-white disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} ذخیره محصول
            </button>
            {saveStatus.message ? (
              <p
                role="status"
                className={`text-sm ${saveStatus.type === "error" ? "text-[#b85d60]" : "text-[#4f7659]"}`}
              >
                {saveStatus.message}
              </p>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}

const emptyCourseForm = {
  id: "",
  slug: "",
  title: "",
  subtitle: "",
  term: "",
  level: "",
  format: "",
  duration: "",
  summary: "",
  description: "",
  status: "recording",
  priceLabel: "",
  basePriceToman: "",
  priceCurrency: "IRR",
  accessDuration: "",
  supportType: "",
  imageId: "",
  sortOrder: 0,
  outcomes: [""],
  audience: [""],
  prerequisites: [""],
  lessons: [],
};

function emptyLesson(index = 0) {
  const id = String(index + 1).padStart(2, "0");
  return {
    id,
    chapterId: "chapter-01",
    chapterTitle: "فصل اول",
    title: "",
    level: "",
    type: "",
    duration: "",
    summary: "",
    body: "",
    videoUrl: "",
    imageId: "",
    materialsText: "",
  };
}

function courseToForm(course) {
  if (!course) return { ...emptyCourseForm, lessons: [emptyLesson()] };
  return {
    id: course.id || "",
    slug: course.slug || "",
    title: course.title || "",
    subtitle: course.subtitle || "",
    term: course.term || "",
    level: course.level || "",
    format: course.format || "",
    duration: course.duration || "",
    summary: course.summary || "",
    description: course.description || "",
    status: course.status === "published" ? "in_progress" : course.status || "recording",
    priceLabel: course.priceLabel || "",
    basePriceToman: course.basePriceRial > 0 ? String(Math.round(course.basePriceRial / 10)) : "",
    priceCurrency: course.priceCurrency || "IRR",
    accessDuration: course.accessDuration || "",
    supportType: course.supportType || "",
    imageId: course.imageId || "",
    sortOrder: course.sortOrder || 0,
    outcomes: course.outcomes && course.outcomes.length > 0 ? course.outcomes : [""],
    audience: course.audience && course.audience.length > 0 ? course.audience : [""],
    prerequisites: course.prerequisites && course.prerequisites.length > 0 ? course.prerequisites : [""],
    lessons: (course.lessons && course.lessons.length > 0 ? course.lessons : [emptyLesson()]).map((lesson, index) => ({
      id: lesson.id || String(index + 1).padStart(2, "0"),
      chapterId: lesson.chapterId || `chapter-${String(index + 1).padStart(2, "0")}`,
      chapterTitle: lesson.chapterTitle || "فصل اول",
      title: lesson.title || "",
      level: lesson.level || "",
      type: lesson.type || "",
      duration: lesson.duration || "",
      summary: lesson.summary || "",
      body: lesson.body || "",
      videoUrl: lesson.videoUrl || "",
      imageId: lesson.imageId || "",
      materialsText: (lesson.materials || []).join("\n"),
    })),
  };
}

function courseFromForm(form) {
  const compactTextList = (items) => items.map((item) => item.trim()).filter(Boolean);

  return {
    id: form.id.trim(),
    slug: form.slug.trim(),
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    term: form.term.trim(),
    level: form.level.trim(),
    format: form.format.trim(),
    duration: form.duration.trim(),
    summary: form.summary.trim(),
    description: form.description.trim(),
    status: form.status,
    priceLabel: form.priceLabel.trim(),
    basePriceRial: tomanToRial(form.basePriceToman),
    priceCurrency: "IRR",
    accessDuration: form.accessDuration.trim(),
    supportType: form.supportType.trim(),
    imageId: form.imageId,
    sortOrder: Number(form.sortOrder) || 0,
    outcomes: compactTextList(form.outcomes),
    audience: compactTextList(form.audience),
    prerequisites: compactTextList(form.prerequisites),
    lessons: form.lessons
      .map((lesson, index) => ({
        id: lesson.id.trim() || String(index + 1).padStart(2, "0"),
        chapterId: lesson.chapterId.trim() || `chapter-${String(index + 1).padStart(2, "0")}`,
        chapterTitle: lesson.chapterTitle.trim() || "فصل اول",
        title: lesson.title.trim(),
        level: lesson.level.trim(),
        type: lesson.type.trim(),
        duration: lesson.duration.trim(),
        summary: lesson.summary.trim(),
        body: lesson.body.trim(),
        videoUrl: lesson.videoUrl.trim(),
        imageId: lesson.imageId,
        materials: compactTextList(lesson.materialsText.split("\n")),
      }))
      .filter((lesson) => lesson.title || lesson.summary),
  };
}

function CourseManager({ courses, token, onReload, onStatus }) {
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(() => courseToForm(null));
  const [images, setImages] = useState([]);
  const [accesses, setAccesses] = useState([]);
  const [accessPhone, setAccessPhone] = useState("");
  const [busy, setBusy] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const imageById = useMemo(() => new Map(images.map((image) => [image.id, image])), [images]);
  const selectedCourse = selectedId ? courses.find((course) => course.id === selectedId) : null;

  useEffect(() => {
    if (!isFormOpen || !selectedId) return;

    const nextCourse = courses.find((course) => course.id === selectedId);
    if (!nextCourse) {
      setIsFormOpen(false);
      setSelectedId("");
      setForm(courseToForm(null));
      return;
    }
    setForm(courseToForm(nextCourse));
  }, [courses, selectedId, isFormOpen]);

  useEffect(() => {
    if (!isFormOpen || !selectedId) {
      setImages([]);
      setAccesses([]);
      return;
    }

    let cancelled = false;
    Promise.all([
      apiRequest(`admin/courses/${selectedId}/images`, { token }),
      apiRequest(`admin/courses/${selectedId}/accesses`, { token }),
    ])
      .then(([imagesData, accessesData]) => {
        if (cancelled) return;
        setImages(imagesData.images || []);
        setAccesses(accessesData.accesses || []);
      })
      .catch((error) => onStatus({ type: "error", message: error.message }));

    return () => {
      cancelled = true;
    };
  }, [isFormOpen, selectedId, token, onStatus]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateTextList = (field, index, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const addTextListItem = (field) => {
    setForm((current) => ({ ...current, [field]: [...current[field], ""] }));
  };

  const removeTextListItem = (field, index) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].length > 1 ? current[field].filter((_, itemIndex) => itemIndex !== index) : current[field],
    }));
  };

  const updateLesson = (index, field, value) => {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.map((lesson, lessonIndex) => (
        lessonIndex === index ? { ...lesson, [field]: value } : lesson
      )),
    }));
  };

  const addLesson = () => {
    setForm((current) => ({ ...current, lessons: [...current.lessons, emptyLesson(current.lessons.length)] }));
  };

  const removeLesson = (index) => {
    setForm((current) => ({
      ...current,
      lessons: current.lessons.length > 1 ? current.lessons.filter((_, lessonIndex) => lessonIndex !== index) : current.lessons,
    }));
  };

  const refreshCourseImages = async (courseId) => {
    const refreshed = await apiRequest(`admin/courses/${courseId}/images`, { token });
    setImages(refreshed.images || []);
    return refreshed.images || [];
  };

  const persistExistingCourse = async (nextForm) => {
    if (!selectedId) return;
    const data = await apiRequest(`admin/courses/${selectedId}`, {
      method: "PUT",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(courseFromForm(nextForm)),
    });
    setForm(courseToForm(data.course));
    await onReload();
  };

  const uploadSingleCourseImage = async (file, busyKey) => {
    if (!selectedId) {
      onStatus({ type: "error", message: "برای آپلود تصویر، ابتدا دوره را ذخیره کنید و سپس ویرایش کنید." });
      return null;
    }

    setBusy(busyKey);
    try {
      const formData = new FormData();
      formData.append("images", file);
      const data = await apiRequest(`admin/courses/${selectedId}/images`, {
        method: "POST",
        token,
        body: formData,
      });
      const uploaded = (data.images || [])[0];
      await refreshCourseImages(selectedId);
      return uploaded || null;
    } catch (error) {
      onStatus({ type: "error", message: error.message });
      return null;
    } finally {
      setBusy("");
    }
  };

  const handleCourseImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const uploaded = await uploadSingleCourseImage(file, "course-image");
    if (!uploaded) return;

    const nextForm = { ...form, imageId: uploaded.id };
    setForm(nextForm);
    await persistExistingCourse(nextForm);
  };

  const handleLessonImageChange = (index) => async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const uploaded = await uploadSingleCourseImage(file, `lesson-image-${index}`);
    if (!uploaded) return;

    const nextForm = {
      ...form,
      lessons: form.lessons.map((lesson, lessonIndex) => (
        lessonIndex === index ? { ...lesson, imageId: uploaded.id } : lesson
      )),
    };
    setForm(nextForm);
    await persistExistingCourse(nextForm);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setBusy("save");
    try {
      const payload = courseFromForm(form);
      const data = selectedId
        ? await apiRequest(`admin/courses/${selectedId}`, {
          method: "PUT",
          token,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        : await apiRequest("admin/courses", {
          method: "POST",
          token,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

      const savedCourse = data.course;
      setSelectedId(savedCourse.id);
      setForm(courseToForm(savedCourse));
      setIsFormOpen(true);
      await onReload();
      onStatus({ type: "idle", message: "" });
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const handleNew = () => {
    const timestamp = Date.now();
    setSelectedId("");
    setImages([]);
    setForm({
      ...emptyCourseForm,
      id: `course-${timestamp}`,
      slug: `course-${timestamp}`,
      outcomes: [""],
      audience: [""],
      prerequisites: [""],
      lessons: [emptyLesson()],
    });
    setIsFormOpen(true);
  };

  const handleEdit = (course) => {
    setSelectedId(course.id);
    setForm(courseToForm(course));
    setIsFormOpen(true);
  };

  const handleCancelEdit = () => {
    setIsFormOpen(false);
    setSelectedId("");
    setImages([]);
    setAccesses([]);
    setAccessPhone("");
    setForm(courseToForm(null));
  };

  const handleDelete = async (courseId = selectedId) => {
    if (!courseId || !window.confirm("این دوره حذف شود؟")) return;
    setBusy(`delete-${courseId}`);
    try {
      await apiRequest(`admin/courses/${courseId}`, { method: "DELETE", token });
      if (courseId === selectedId) handleCancelEdit();
      await onReload();
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!selectedId || !window.confirm("این تصویر حذف شود؟")) return;
    try {
      await apiRequest(`admin/courses/${selectedId}/images/${imageId}`, { method: "DELETE", token });
      setImages((current) => current.filter((image) => image.id !== imageId));
      const nextForm = {
        ...form,
        imageId: form.imageId === imageId ? "" : form.imageId,
        lessons: form.lessons.map((lesson) => (
          lesson.imageId === imageId ? { ...lesson, imageId: "" } : lesson
        )),
      };
      setForm(nextForm);
      await persistExistingCourse(nextForm);
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    }
  };

  const refreshAccesses = async (courseId = selectedId) => {
    if (!courseId) return;
    const data = await apiRequest(`admin/courses/${courseId}/accesses`, { token });
    setAccesses(data.accesses || []);
  };

  const handleGrantAccess = async (event) => {
    event.preventDefault();
    if (!selectedId || !accessPhone.trim()) return;

    setBusy("grant-access");
    try {
      await apiRequest(`admin/courses/${selectedId}/accesses`, {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: accessPhone.trim() }),
      });
      setAccessPhone("");
      await refreshAccesses();
      onStatus({ type: "idle", message: "" });
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const handleRevokeAccess = async (accessId) => {
    if (!selectedId || !accessId || !window.confirm("دسترسی این کاربر به دوره حذف شود؟")) return;

    setBusy(`revoke-access-${accessId}`);
    try {
      await apiRequest(`admin/courses/${selectedId}/accesses/${accessId}`, {
        method: "DELETE",
        token,
      });
      await refreshAccesses();
    } catch (error) {
      onStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const currentCourseImage = imageById.get(form.imageId);

  return (
    <section className="rounded-lg border border-[#e0d7cd] bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#3f352f]">مدیریت دوره‌ها</h2>
          <p className="mt-1 text-sm leading-6 text-[#807269]">دوره‌ها ابتدا به شکل لیست نمایش داده می‌شوند؛ برای ویرایش، فرم کامل را باز کنید.</p>
        </div>
        <button type="button" onClick={handleNew} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#c08081] px-4 text-sm text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]">
          <Plus className="h-4 w-4" />
          دوره جدید
        </button>
      </div>

      <div className="grid gap-3">
        {courses.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#d9cfc5] bg-[#fbf9f6] p-6 text-center text-sm text-[#807269]">هنوز دوره‌ای ثبت نشده است.</div>
        ) : courses.map((course) => (
          <article key={course.id} className="flex flex-col gap-3 rounded-lg border border-[#eee7df] bg-[#fbf9f6] p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#3f352f]">{course.title}</h3>
                <span className="rounded-full bg-[#fff2f2] px-3 py-1 text-xs text-[#b06d6f]">
                  {courseStatusOptions.find((item) => item.value === course.status)?.label || course.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#807269]">
                {course.slug} · {course.lessons?.length || 0} قسمت
                {` · ${formatToman(course.basePriceRial)}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleEdit(course)} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#c08081] px-4 text-sm text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]">
                ویرایش
              </button>
              <button type="button" onClick={() => handleDelete(course.id)} disabled={busy === `delete-${course.id}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e4c6c8] bg-white px-3 text-sm text-[#b85d60] disabled:opacity-50">
                {busy === `delete-${course.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                حذف
              </button>
            </div>
          </article>
        ))}
      </div>

      {isFormOpen ? (
        <form className="mt-6 grid gap-4 border-t border-[#eee7df] pt-5" onSubmit={handleSave}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#3f352f]">{selectedCourse ? `ویرایش ${selectedCourse.title}` : "دوره جدید"}</h3>
              <p className="mt-1 text-sm text-[#807269]">برای آپلود تصویر، دوره باید یک‌بار ذخیره شده باشد.</p>
            </div>
            <button type="button" onClick={handleCancelEdit} className="inline-flex h-9 items-center gap-2 rounded-full border border-[#e7c2c3] bg-white px-3 text-sm text-[#9b696b] shadow-[0_10px_24px_rgba(192,128,129,0.12)]">
              بستن فرم
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["id", "شناسه"],
              ["slug", "آدرس"],
              ["term", "ترم"],
              ["level", "سطح"],
              ["format", "فرمت"],
              ["duration", "مدت"],
              ["basePriceToman", "قیمت (تومان)"],
              ["accessDuration", "مدت دسترسی"],
              ["supportType", "نوع پشتیبانی"],
              ["sortOrder", "ترتیب"],
            ].map(([field, label]) => (
              <label key={field} className="grid gap-2 text-sm text-[#5f544d]">
                {label}
                <input
                  value={form[field]}
                  onChange={updateField(field)}
                  className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#c08081]"
                />
              </label>
            ))}
            <label className="grid gap-2 text-sm text-[#5f544d]">
              وضعیت
              <select value={form.status} onChange={updateField("status")} className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none">
                {courseStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 rounded-lg border border-[#eee7df] bg-[#fbf9f6] p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h4 className="font-semibold text-[#3f352f]">تصویر کارت دوره</h4>
              <p className="mt-1 text-sm text-[#807269]">یک تصویر برای کل دوره انتخاب کنید.</p>
              {currentCourseImage ? <p className="mt-2 text-xs text-[#9b696b]">تصویر فعلی: {currentCourseImage.filename}</p> : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {currentCourseImage ? <img src={currentCourseImage.url} alt={currentCourseImage.alt} className="h-16 w-16 rounded-md object-cover" /> : null}
              <input type="file" accept="image/*" onChange={handleCourseImageChange} disabled={!selectedId || busy === "course-image"} className="rounded-md border border-[#d9cfc5] bg-white px-3 py-2 text-sm text-[#5f544d] disabled:opacity-50" />
              {busy === "course-image" ? <Loader2 className="h-4 w-4 animate-spin text-[#c08081]" /> : null}
            </div>
          </div>

          <label className="grid gap-2 text-sm text-[#5f544d]">
            عنوان
            <input value={form.title} onChange={updateField("title")} className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#c08081]" />
          </label>
          <label className="grid gap-2 text-sm text-[#5f544d]">
            زیرعنوان
            <input value={form.subtitle} onChange={updateField("subtitle")} className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#c08081]" />
          </label>
          <label className="grid gap-2 text-sm text-[#5f544d]">
            خلاصه کارت
            <textarea value={form.summary} onChange={updateField("summary")} rows={3} className="rounded-md border border-[#d9cfc5] bg-white px-3 py-2 text-[#3f352f] outline-none focus:border-[#c08081]" />
          </label>
          <label className="grid gap-2 text-sm text-[#5f544d]">
            توضیحات صفحه جزئیات
            <textarea value={form.description} onChange={updateField("description")} rows={4} className="rounded-md border border-[#d9cfc5] bg-white px-3 py-2 text-[#3f352f] outline-none focus:border-[#c08081]" />
          </label><div className="grid gap-5 lg:grid-cols-2">
            {[
              ["outcomes", "آنچه در این دوره یاد می‌گیرید"],
              ["audience", "مناسب چه کسانی است؟"],
              ["prerequisites", "پیش‌نیازها"],
            ].map(([field, title]) => (
              <div key={field} className="grid gap-3 rounded-lg border border-[#eee7df] bg-[#fbf9f6] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#3f352f]">{title}</h3>
                  <button type="button" onClick={() => addTextListItem(field)} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#c08081] px-4 text-sm text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]">
                    <Plus className="h-4 w-4" />
                    افزودن
                  </button>
                </div>
                {form[field].map((item, index) => (
                  <div key={`${field}-${index}`} className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <input
                      value={item}
                      onChange={(event) => updateTextList(field, index, event.target.value)}
                      className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#c08081]"
                      placeholder={`مورد ${index + 1}`}
                    />
                    <button type="button" onClick={() => removeTextListItem(field, index)} className="inline-flex h-10 items-center justify-center rounded-md border border-[#e4c6c8] bg-white px-3 text-[#b85d60]" disabled={form[field].length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="grid gap-4 rounded-lg border border-[#eee7df] bg-[#fbf9f6] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#3f352f]">سرفصل‌ها</h3>
                <p className="mt-1 text-sm text-[#807269]">هر سرفصل ورودی تصویر مستقل خودش را دارد.</p>
              </div>
              <button type="button" onClick={addLesson} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#c08081] px-4 text-sm text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274]">
                <Plus className="h-4 w-4" />
                افزودن سرفصل
              </button>
            </div>

            {form.lessons.map((lesson, index) => {
              const lessonImage = imageById.get(lesson.imageId);
              return (
                <article key={`lesson-${index}`} className="grid gap-3 rounded-lg border border-[#e5ddd5] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-[#3f352f]">سرفصل {index + 1}</h4>
                    <button type="button" onClick={() => removeLesson(index)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e4c6c8] bg-white px-3 text-sm text-[#b85d60]" disabled={form.lessons.length === 1}>
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    {[
                      ["id", "شناسه"],
                      ["chapterId", "شناسه فصل"],
                      ["chapterTitle", "نام فصل"],
                      ["title", "عنوان"],
                      ["level", "سطح"],
                      ["type", "نوع"],
                      ["duration", "مدت"],
                    ].map(([field, label]) => (
                      <label key={field} className="grid gap-2 text-sm text-[#5f544d]">
                        {label}
                        <input value={lesson[field]} onChange={(event) => updateLesson(index, field, event.target.value)} className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#c08081]" />
                      </label>
                    ))}
                  </div>
                  <label className="grid gap-2 text-sm text-[#5f544d]">
                    لینک ویدئو
                    <div className="flex items-center gap-2 rounded-md border border-[#d9cfc5] bg-white px-3 focus-within:border-[#c08081]">
                      <Video className="h-4 w-4 shrink-0 text-[#9b867d]" />
                      <input
                        value={lesson.videoUrl}
                        onChange={(event) => updateLesson(index, "videoUrl", event.target.value)}
                        dir="ltr"
                        className="h-10 min-w-0 flex-1 bg-transparent text-left text-[#3f352f] outline-none"
                        placeholder="https://..."
                      />
                    </div>
                  </label>
                  <div className="grid gap-3 rounded-md border border-[#eee7df] bg-[#fbf9f6] p-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <h5 className="text-sm font-medium text-[#3f352f]">تصویر سرفصل</h5>
                      {lessonImage ? <p className="mt-1 text-xs text-[#9b696b]">تصویر فعلی: {lessonImage.filename}</p> : <p className="mt-1 text-xs text-[#807269]">بدون تصویر</p>}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      {lessonImage ? <img src={lessonImage.url} alt={lessonImage.alt} className="h-14 w-14 rounded-md object-cover" /> : null}
                      <input type="file" accept="image/*" onChange={handleLessonImageChange(index)} disabled={!selectedId || busy === `lesson-image-${index}`} className="rounded-md border border-[#d9cfc5] bg-white px-3 py-2 text-sm text-[#5f544d] disabled:opacity-50" />
                      {busy === `lesson-image-${index}` ? <Loader2 className="h-4 w-4 animate-spin text-[#c08081]" /> : null}
                    </div>
                  </div>
                  <label className="grid gap-2 text-sm text-[#5f544d]">
                    توضیح سرفصل
                    <textarea value={lesson.summary} onChange={(event) => updateLesson(index, "summary", event.target.value)} rows={3} className="rounded-md border border-[#d9cfc5] bg-white px-3 py-2 text-[#3f352f] outline-none focus:border-[#c08081]" />
                  </label>
                  <label className="grid gap-2 text-sm text-[#5f544d]">
                    متن کامل قسمت
                    <textarea value={lesson.body} onChange={(event) => updateLesson(index, "body", event.target.value)} rows={4} className="rounded-md border border-[#d9cfc5] bg-white px-3 py-2 text-[#3f352f] outline-none focus:border-[#c08081]" />
                  </label>
                  <label className="grid gap-2 text-sm text-[#5f544d]">
                    متریال‌ها، هر مورد در یک خط
                    <textarea value={lesson.materialsText} onChange={(event) => updateLesson(index, "materialsText", event.target.value)} rows={3} className="rounded-md border border-[#d9cfc5] bg-white px-3 py-2 text-[#3f352f] outline-none focus:border-[#c08081]" />
                  </label>
                </article>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy === "save"} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#c08081] px-4 text-sm font-medium text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:opacity-70">
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره دوره
            </button>
            <button type="button" onClick={() => handleDelete(selectedId)} disabled={!selectedId || busy === `delete-${selectedId}`} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e4c6c8] bg-white px-4 text-sm text-[#b85d60] disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
              حذف دوره
            </button>
          </div>

          {selectedId ? (
            <div className="mt-2 grid gap-5 border-t border-[#eee7df] pt-5">
              <section className="rounded-lg border border-[#eee7df] bg-[#fbf9f6] p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#c08081]" />
                      <h4 className="font-semibold text-[#3f352f]">دسترسی کاربران به این دوره</h4>
                    </div>
                    <p className="mt-1 text-sm text-[#807269]">شماره تلفن کاربر ثبت‌نام‌شده را وارد کنید تا دوره در پنل او فعال شود.</p>
                  </div>
                  <form onSubmit={handleGrantAccess} className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[340px] sm:flex-row">
                    <input
                      value={accessPhone}
                      onChange={(event) => setAccessPhone(event.target.value)}
                      className="h-10 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#c08081]"
                      placeholder="شماره تلفن کاربر"
                      inputMode="tel"
                    />
                    <button
                      type="submit"
                      disabled={busy === "grant-access" || !accessPhone.trim()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#c08081] px-4 text-sm text-white shadow-[0_14px_32px_rgba(192,128,129,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ad7274] disabled:opacity-60"
                    >
                      {busy === "grant-access" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      فعال‌سازی
                    </button>
                  </form>
                </div>

                {accesses.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#d9cfc5] bg-white p-5 text-center text-sm text-[#807269]">
                    هنوز کاربری به این دوره دسترسی ندارد.
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {accesses.map((access) => (
                      <article key={access.id} className="flex items-center justify-between gap-3 rounded-md border border-[#e5ddd5] bg-white px-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[#3f352f]">{access.userName || "کاربر گلملو"}</p>
                          <p className="mt-1 text-sm text-[#807269]">{access.userPhone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeAccess(access.id)}
                          disabled={busy === `revoke-access-${access.id}`}
                          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-[#e4c6c8] bg-white px-3 text-sm text-[#b85d60] disabled:opacity-50"
                        >
                          {busy === `revoke-access-${access.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          حذف دسترسی
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section>
              <h4 className="mb-3 font-semibold text-[#3f352f]">تصاویر آپلودشده این دوره</h4>
              {images.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#d9cfc5] bg-[#fbf9f6] p-5 text-center text-sm text-[#807269]">فعلاً تصویری برای این دوره ثبت نشده است.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                  {images.map((image) => (
                    <article key={image.id} className="overflow-hidden rounded-lg border border-[#e5ddd5] bg-[#fbf9f6]">
                      <div className="aspect-square bg-[#efe8df]">
                        <img src={image.url} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2">
                        <span className="min-w-0 truncate text-xs text-[#807269]" title={image.filename}>{image.filename}</span>
                        <button type="button" onClick={() => handleDeleteImage(image.id)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#b85d60] hover:bg-[#f4e6e7]" aria-label="حذف تصویر">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              </section>
            </div>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}

function Dashboard({ token, onLogout }) {
  const [contactRequests, setContactRequests] = useState([]);
  const [courseSignups, setCourseSignups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [projectImages, setProjectImages] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const [uploading, setUploading] = useState("");
  const [deleting, setDeleting] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [optimizingImages, setOptimizingImages] = useState(false);

  const headers = useMemo(() => ({ token }), [token]);

  const loadData = async () => {
    setStatus({ type: "loading", message: "" });
    try {
      const [contactsData, courseData, coursesData, productsData, ordersData, projectData, heroData] = await Promise.all([
        apiRequest("admin/contact-requests", headers),
        apiRequest("admin/course-signups", headers),
        apiRequest("admin/courses", headers),
        apiRequest("admin/products", headers),
        apiRequest("admin/orders", headers),
        apiRequest("admin/project-images", headers),
        apiRequest("admin/hero-slides", headers),
      ]);

      setContactRequests(contactsData.contactRequests || []);
      setCourseSignups(courseData.courseSignups || []);
      setCourses(coursesData.courses || []);
      setProducts(productsData.products || []);
      setOrders(ordersData.orders || []);
      setProjectImages(projectData.images || []);
      setHeroSlides(heroData.images || []);
      setStatus({ type: "idle", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
      if (error.message.includes("ادمین")) {
        onLogout();
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const uploadImages = async (path, files, busyKey) => {
    setUploading(busyKey);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("images", file));
      await apiRequest(path, {
        method: "POST",
        token,
        body: formData,
      });
      await loadData();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setUploading("");
    }
  };

  const deleteImage = async (path, id) => {
    const confirmed = window.confirm("این تصویر حذف شود؟");
    if (!confirmed) return;

    try {
      await apiRequest(`${path}/${id}`, {
        method: "DELETE",
        token,
      });
      await loadData();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const deleteAdminItem = async (path, id, confirmMessage, busyPrefix) => {
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setDeleting(`${busyPrefix}-${id}`);
    try {
      await apiRequest(`${path}/${id}`, {
        method: "DELETE",
        token,
      });
      await loadData();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setDeleting("");
    }
  };

  const updateOrderStatus = async (id, nextStatus, adminNote) => {
    setUpdatingOrderId(id);
    try {
      await apiRequest(`admin/orders/${id}/status`, {
        method: "PATCH",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, adminNote }),
      });
      await loadData();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setUpdatingOrderId("");
    }
  };

  const rebuildImageVariants = async () => {
    setOptimizingImages(true);
    try {
      const data = await apiRequest("admin/image-variants/rebuild", { method: "POST", token });
      await loadData();
      setStatus({ type: "success", message: `${data.optimizedImages || 0} تصویر بهینه شد.` });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setOptimizingImages(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f3ef]">
      <header className="sticky top-0 z-20 border-b border-[#e0d7cd] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-[#c08081] text-white">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#3f352f]">مدیریت golmelo</h1>
              <p className="text-sm text-[#807269]">محتوا، دوره‌ها، سفارش‌ها و دسترسی کاربران</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={rebuildImageVariants}
              disabled={optimizingImages}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d9cfc5] bg-white px-3 text-sm text-[#51645a] disabled:opacity-60"
            >
              {optimizingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              بهینه‌سازی تصاویر
            </button>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e7c2c3] bg-white px-3 text-sm text-[#9b696b] shadow-[0_10px_24px_rgba(192,128,129,0.12)] transition hover:bg-[#f7f1eb]"
            >
              <RefreshCw className="h-4 w-4" />
              به‌روزرسانی
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d9cfc5] bg-white px-3 text-sm text-[#b85d60] transition hover:bg-[#f4e6e7]"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6">
        {status.type === "error" ? (
          <div className="rounded-lg border border-[#efb8ba] bg-[#fff6f6] px-4 py-3 text-sm text-[#b85d60]">{status.message}</div>
        ) : null}
        {status.type === "success" ? (
          <div className="rounded-lg border border-[#bfd7c5] bg-[#f4faf5] px-4 py-3 text-sm text-[#4f7659]">{status.message}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
          <StatBox label="پیام ثبت‌شده" value={contactRequests.length} icon={MessageSquareText} />
          <StatBox label="درخواست دوره" value={courseSignups.length} icon={Send} />
          <StatBox label="دوره آموزشی" value={courses.length} icon={BookOpen} />
          <StatBox label="محصول" value={products.length} icon={PackageSearch} />
          <StatBox label="سفارش مشتری" value={orders.length} icon={Save} />
          <StatBox label="تصویر محصول" value={projectImages.length} icon={ImagePlus} />
          <StatBox label="اسلاید بخش اول" value={heroSlides.length} icon={LayoutDashboard} />
        </section>

        <BlogManager token={token} onStatus={setStatus} />

        <OrdersTable orders={orders} onUpdateStatus={updateOrderStatus} updatingId={updatingOrderId} />

        <ProductManager products={products} projectImages={projectImages} token={token} onReload={loadData} onStatus={setStatus} />

        <CourseManager courses={courses} token={token} onReload={loadData} onStatus={setStatus} />

        <ContactRequestsTable
          requests={contactRequests}
          deletingId={deleting.startsWith("contact-") ? deleting.replace("contact-", "") : ""}
          onDelete={(id) => deleteAdminItem("admin/contact-requests", id, "این پیام حذف شود؟", "contact")}
        />

        <CourseSignupsTable
          signups={courseSignups}
          deletingId={deleting.startsWith("signup-") ? deleting.replace("signup-", "") : ""}
          onDelete={(id) => deleteAdminItem("admin/course-signups", id, "این ثبت‌نام حذف شود؟", "signup")}
        />

        <ImageManager
          title="تصاویر محصولات"
          description="تصاویر کاتالوگ را اینجا بارگذاری کنید و سپس در فرم هر محصول انتخاب کنید."
          images={projectImages}
          uploadLabel="افزودن تصویر محصول"
          busy={uploading === "project"}
          onUpload={(files) => uploadImages("admin/project-images", files, "project")}
          onDelete={(id) => deleteImage("admin/project-images", id)}
        />

        <ImageManager
          title="اسلایدشو بخش اول"
          description="این تصاویر در hero/اولین section سایت به صورت اسلایدشو نمایش داده می‌شوند."
          images={heroSlides}
          uploadLabel="افزودن اسلاید"
          busy={uploading === "hero"}
          onUpload={(files) => uploadImages("admin/hero-slides", files, "hero")}
          onDelete={(id) => deleteImage("admin/hero-slides", id)}
        />
      </div>
    </main>
  );
}

export default function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || "");

  const handleLogin = (nextToken) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken("");
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}
