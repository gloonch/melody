import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AtSign,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MonitorPlay,
  Phone,
  Play,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import logoImage from "../assets/Logo.webp";
import { PanelField, PanelInput, PanelSection, PanelSwitch, PasswordInput } from "../components/panel/PanelForm";
import { Button, ButtonLink, buttonClassName } from "../components/ui/Button";
import { trackEvent } from "../lib/analytics";
import {
  CUSTOM_USAGE_OPTIONS,
  ORDER_STATUS_LABELS,
  apiRequest,
  defaultAddressId,
  displayUserName,
  durationToSeconds,
  formatPersianDate,
  formatPlaybackTime,
  formatTomanPrice,
  getCourseChapters,
  getCourseLessons,
  getCourseProgress,
  getCourseStatusLabel,
  getPanelProgressRecord,
  getWatchedLessonIds,
  normalizeCourseForPanel,
  normalizeDigits,
  normalizePanelProgressRecord,
  orderCoverImage,
  orderDisplayTitle,
  orderSummaryText,
  panelCourses,
  readPanelProgress,
  resolveApiURL,
  toPersianDigits,
  updateStoredPanelProgress,
  usageLabel,
  usePanelSEO,
  userHasPanelCourseAccess,
} from "../App";

function PanelRoute({ authStatus, user, children }) {
  const location = useLocation();

  if (authStatus === "checking") {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-[#f3f7fb] text-[#708097]">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-[0_18px_44px_rgba(70,88,116,0.08)]">
          <Loader2 className="h-5 w-5 animate-spin text-[#c08081]" />
          در حال بررسی نشست کاربری...
        </div>
      </div>
    );
  }

  if (authStatus !== "authenticated" || !user) {
    const redirectPath = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?mode=login&redirect=${encodeURIComponent(redirectPath)}`} replace state={{ from: location }} />;
  }

  return children;
}

const panelNavItems = [
  { to: "/panel/orders", label: "سفارش‌ها", icon: Send },
  { to: "/panel/courses", label: "دوره‌ها", icon: MonitorPlay },
  { to: "/panel/profile", label: "پروفایل من", icon: User },
];

function PanelSidebar({ user, onNavigate, onLogout, isLoggingOut }) {
  const userName = displayUserName(user);
  const userPhone = user?.phone || "";

  return (
    <div className="flex h-full flex-col bg-white px-7 py-8 text-[#35445b]">
      <Link to="/" className="mb-12 inline-flex items-center gap-3 text-right" onClick={onNavigate} aria-label="بازگشت به گلملو">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#51645a] shadow-[0_14px_30px_rgba(81,100,90,0.22)]">
          <img src={logoImage} alt="نشان گلملو" width="128" height="128" className="h-8 w-8 object-contain" />
        </span>
        <span>
          <span className="block text-lg font-black text-[#26364c]">Golmelo</span>
          <span className="block text-xs text-[#8a98ad]">پنل مشتری</span>
        </span>
      </Link>

      <nav className="grid gap-2">
        {panelNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `relative flex h-14 items-center gap-3 rounded-2xl px-4 text-sm transition ${isActive
                  ? "bg-[#f7f9fc] font-bold text-[#1e2b3d]"
                  : "text-[#6f7e96] hover:bg-[#f8fafc] hover:text-[#2d3b52]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full transition ${isActive ? "bg-[#c08081]" : "bg-transparent"
                      }`}
                  />
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-[22px] border border-[#eef2f7] bg-[#f8fafc] p-4 text-right">
          <p className="text-sm font-bold text-[#2f3f55]">{userName}</p>
          <p className="mt-1 text-xs text-[#7c8aa1]">{userPhone ? toPersianDigits(userPhone) : "شماره ثبت نشده"}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#f0d7d8] bg-white text-sm font-bold text-[#b85d60] transition hover:bg-[#fff7f7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          خروج
        </button>
      </div>
    </div>
  );
}

function PanelLayout({ user, onLogout, isLoggingOut, children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const userPhone = user?.phone || "";

  useEffect(() => {
    if (!isDrawerOpen) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [isDrawerOpen]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f3f7fb] text-[#27364d]">
      <aside className="fixed bottom-0 right-0 top-0 z-40 hidden w-[300px] rounded-l-[34px] border-l border-[#edf1f6] bg-white shadow-[0_24px_70px_rgba(70,88,116,0.08)] lg:block">
        <PanelSidebar user={user} onLogout={onLogout} isLoggingOut={isLoggingOut} />
      </aside>

      <AnimatePresence>
        {isDrawerOpen ? (
          <motion.div
            className="fixed inset-0 z-[80] bg-[#142033]/35 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDrawerOpen(false)}
          >
            <motion.aside
              className="absolute bottom-0 right-0 top-0 w-[82vw] max-w-[320px] rounded-l-[30px] bg-white shadow-[0_24px_80px_rgba(26,39,59,0.2)]"
              initial={{ x: 80, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 330, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="absolute left-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e7edf5] text-[#65748c]"
                aria-label="بستن منو"
              >
                <X className="h-5 w-5" />
              </button>
              <PanelSidebar
                user={user}
                onNavigate={() => setIsDrawerOpen(false)}
                onLogout={onLogout}
                isLoggingOut={isLoggingOut}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="lg:pr-[300px]">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pb-4 pt-5 sm:px-6 lg:px-10 lg:pt-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e5ecf5] bg-white text-[#40516a] shadow-[0_12px_28px_rgba(70,88,116,0.08)] lg:hidden"
              aria-label="باز کردن منو"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="inline-flex items-center gap-2 lg:hidden" aria-label="بازگشت به گلملو">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#51645a] shadow-[0_12px_26px_rgba(81,100,90,0.2)]">
                <img src={logoImage} alt="نشان گلملو" width="128" height="128" className="h-7 w-7 object-contain" />
              </span>
              <span className="text-sm font-black text-[#26364c]">Golmelo</span>
            </Link>
          </div>

          <div className="hidden items-center gap-3 rounded-full border border-[#e5ecf5] bg-white px-4 py-2 text-sm text-[#708097] shadow-[0_12px_28px_rgba(70,88,116,0.06)] sm:flex">
            <Phone className="h-4 w-4 text-[#c08081]" />
            <span dir="ltr">{userPhone ? toPersianDigits(userPhone) : "بدون شماره"}</span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

const emptyAddressForm = {
  title: "",
  fullAddress: "",
  receiverName: "",
  receiverPhone: "",
  isDefault: false,
};

function AddressEditor({ initialValue, onCancel, onSave, isSaving }) {
  const [form, setForm] = useState(() => ({
    ...emptyAddressForm,
    ...(initialValue || {}),
  }));

  useEffect(() => {
    setForm({
      ...emptyAddressForm,
      ...(initialValue || {}),
    });
  }, [initialValue]);

  const updateField = (field) => (event) => {
    const value = field === "isDefault" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({
      title: form.title.trim(),
      fullAddress: form.fullAddress.trim(),
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim(),
      isDefault: Boolean(form.isDefault),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-[22px] border border-[#dfe7f1] bg-[#f8fafc] p-4 text-right">
      <div className="grid gap-4 md:grid-cols-2">
        <PanelField label="عنوان آدرس">
          <PanelInput value={form.title} onChange={updateField("title")} placeholder="خانه، محل کار..." required />
        </PanelField>
        <PanelField label="شماره تماس تحویل‌گیرنده">
          <PanelInput value={form.receiverPhone} onChange={updateField("receiverPhone")} placeholder="اختیاری" type="tel" />
        </PanelField>
        <PanelField label="نام تحویل‌گیرنده">
          <PanelInput value={form.receiverName} onChange={updateField("receiverName")} placeholder="اختیاری" />
        </PanelField>
      </div>

      <label className="grid gap-2 text-right text-sm text-[#7f8ea5]">
        متن آدرس
        <textarea
          value={form.fullAddress}
          onChange={updateField("fullAddress")}
          required
          rows={4}
          className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm leading-7 text-[#2e3d54] outline-none transition placeholder:text-[#a8b4c5] focus:border-[#c08081]/60"
          placeholder="آدرس کامل را وارد کنید"
        />
      </label>

      <label className="flex items-center gap-3 text-sm font-bold text-[#607089]">
        <input type="checkbox" checked={form.isDefault} onChange={updateField("isDefault")} className="h-4 w-4 accent-[#c08081]" />
        این آدرس پیش‌فرض باشد
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={isSaving}
          variant="primary"
          size="panelSm"
          shape="panel"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره آدرس
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe7f1] bg-white px-5 text-sm font-bold text-[#617088]"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}

function AddressCard({ address, selected, selectable = false, onSelect, onEdit, onDelete, onSetDefault, busy }) {
  return (
    <article
      className={`rounded-[20px] border bg-white p-4 text-right transition ${selected ? "border-[#c08081] shadow-[0_14px_34px_rgba(192,128,129,0.14)]" : "border-[#edf1f6]"
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[#2f3f55]">{address.title}</h3>
            {address.isDefault ? <span className="rounded-full bg-[#edf7f0] px-2.5 py-1 text-xs font-bold text-[#4d9a61]">پیش‌فرض</span> : null}
          </div>
          <p className="mt-2 text-sm leading-7 text-[#617088]">{address.fullAddress}</p>
          {(address.receiverName || address.receiverPhone) ? (
            <p className="mt-2 text-xs text-[#9aa8ba]">
              {[address.receiverName, address.receiverPhone].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {selectable ? (
          <button
            type="button"
            onClick={() => onSelect(address.id)}
            className={`h-5 w-5 shrink-0 rounded-full border ${selected ? "border-[#c08081] bg-[#c08081]" : "border-[#ccd6e4]"}`}
            aria-label="انتخاب آدرس"
          />
        ) : null}
      </div>

      {(onEdit || onDelete || onSetDefault) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onEdit ? (
            <button type="button" onClick={() => onEdit(address)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe7f1] bg-white px-3 text-xs font-bold text-[#617088]">
              ویرایش
            </button>
          ) : null}
          {onSetDefault && !address.isDefault ? (
            <button type="button" onClick={() => onSetDefault(address.id)} disabled={busy === `default-${address.id}`} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe7f1] bg-white px-3 text-xs font-bold text-[#617088] disabled:opacity-60">
              {busy === `default-${address.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              پیش‌فرض
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" onClick={() => onDelete(address.id)} disabled={busy === `delete-${address.id}`} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#f0d7d8] bg-white px-3 text-xs font-bold text-[#b85d60] disabled:opacity-60">
              {busy === `delete-${address.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              حذف
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function AddressManager({ selectable = false, selectedId = "", onSelect, compact = false, onAddressesChange }) {
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const [busy, setBusy] = useState("");
  const isSaving = busy === "save";

  const notifyAddresses = useCallback((nextAddresses) => {
    onAddressesChange?.(nextAddresses);
    if (selectable && !selectedId && nextAddresses.length > 0) {
      onSelect?.(defaultAddressId(nextAddresses));
    }
  }, [onAddressesChange, onSelect, selectable, selectedId]);

  const loadAddresses = useCallback(async () => {
    setStatus({ type: "loading", message: "" });
    try {
      const data = await apiRequest("me/addresses");
      const nextAddresses = data.addresses || [];
      setAddresses(nextAddresses);
      notifyAddresses(nextAddresses);
      setStatus({ type: "idle", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }, [notifyAddresses]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openNew = () => {
    setEditingAddress(null);
    setIsEditorOpen(true);
    setStatus({ type: "idle", message: "" });
  };

  const openEdit = (address) => {
    setEditingAddress(address);
    setIsEditorOpen(true);
    setStatus({ type: "idle", message: "" });
  };

  const closeEditor = () => {
    setEditingAddress(null);
    setIsEditorOpen(false);
  };

  const saveAddress = async (payload) => {
    if (!payload.title || !payload.fullAddress) {
      setStatus({ type: "error", message: "عنوان و متن آدرس الزامی است." });
      return;
    }

    setBusy("save");
    try {
      const path = editingAddress ? `me/addresses/${editingAddress.id}` : "me/addresses";
      const data = await apiRequest(path, {
        method: editingAddress ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      closeEditor();
      await loadAddresses();
      if (selectable) {
        onSelect?.(data.address.id);
      }
      setStatus({ type: "success", message: "آدرس ذخیره شد." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const deleteAddress = async (addressId) => {
    if (!window.confirm("آیا از حذف این آدرس مطمئن هستید؟")) return;
    setBusy(`delete-${addressId}`);
    try {
      await apiRequest(`me/addresses/${addressId}`, { method: "DELETE" });
      if (selectedId === addressId) {
        onSelect?.("");
      }
      await loadAddresses();
      setStatus({ type: "success", message: "آدرس حذف شد." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const setDefaultAddress = async (addressId) => {
    setBusy(`default-${addressId}`);
    try {
      await apiRequest(`me/addresses/${addressId}/default`, { method: "PATCH" });
      await loadAddresses();
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  return (
    <section className={`${compact ? "" : "border-t border-dashed border-[#dfe7f1] px-5 py-8 sm:px-7 lg:px-9"}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-right">
          <h2 className="text-xl text-[#2f3f55]">آدرس‌های من</h2>
          <p className="mt-1 text-sm text-[#7d8ca3]">فعلاً آدرس‌ها به صورت متن ذخیره می‌شوند و برای نقشه آینده آماده‌اند.</p>
        </div>
        <Button
          type="button"
          onClick={openNew}
          variant="primary"
          size="panelSm"
          shape="panel"
        >
          <Plus className="h-4 w-4" />
          افزودن آدرس
        </Button>
      </div>

      {status.type === "loading" ? <p className="text-sm text-[#7d8ca3]">در حال بارگذاری آدرس‌ها...</p> : null}
      {status.type !== "loading" && addresses.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#dfe7f1] bg-[#f8fafc] p-6 text-center text-sm text-[#7d8ca3]">
          هنوز آدرسی ثبت نکرده‌اید.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            selected={selectedId === address.id}
            selectable={selectable}
            onSelect={onSelect}
            onEdit={openEdit}
            onDelete={deleteAddress}
            onSetDefault={setDefaultAddress}
            busy={busy}
          />
        ))}
      </div>

      {isEditorOpen ? (
        <div className="mt-5">
          <AddressEditor
            initialValue={editingAddress}
            onCancel={closeEditor}
            onSave={saveAddress}
            isSaving={isSaving}
          />
        </div>
      ) : null}

      {status.message ? (
        <p className={`mt-3 text-sm ${status.type === "error" ? "text-[#b85d60]" : "text-[#5b8c67]"}`}>{status.message}</p>
      ) : null}
    </section>
  );
}

function PanelProfilePage({ user, onProfileUpdate }) {
  usePanelSEO("پروفایل من");

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    birthDate: user?.birthDate || "",
    instagram: user?.instagram || "",
    website: user?.website || "",
    newPassword: "",
    repeatPassword: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({ newPassword: false, repeatPassword: false });
  const [notifications, setNotifications] = useState({ email: true, sms: false });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const isSaving = status.type === "loading";

  useEffect(() => {
    setForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      birthDate: user?.birthDate || "",
      instagram: user?.instagram || "",
      website: user?.website || "",
      newPassword: "",
      repeatPassword: "",
    });
  }, [user]);

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setStatus({ type: "idle", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.newPassword.trim() || form.repeatPassword.trim()) {
      if (form.newPassword.trim().length < 6) {
        setStatus({ type: "error", message: "رمز جدید باید حداقل ۶ کاراکتر باشد." });
        return;
      }
      if (form.newPassword.trim() !== form.repeatPassword.trim()) {
        setStatus({ type: "error", message: "تکرار رمز جدید با رمز جدید یکسان نیست." });
        return;
      }
    }

    setStatus({ type: "loading", message: "" });
    try {
      const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
      const data = await apiRequest("me", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          fullName,
        }),
      });
      onProfileUpdate(data.user);
      setForm((current) => ({ ...current, newPassword: "", repeatPassword: "" }));
      setStatus({ type: "success", message: "تغییرات پروفایل ذخیره شد." });
      window.setTimeout(() => setStatus({ type: "idle", message: "" }), 2600);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const userName = displayUserName(user);
  const userPhone = user?.phone || form.phone;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <form onSubmit={handleSubmit} className="overflow-hidden rounded-[28px] bg-white shadow-[0_26px_70px_rgba(70,88,116,0.08)]">
        <div className="flex flex-col gap-5 bg-[#f8fbff] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-9">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#d8dde6] text-[#7b8492]">
              <User className="h-9 w-9" />
            </div>
            <div className="text-right">
              <h1 className="text-2xl text-[#2f3f55]">{userName}</h1>
              <p className="mt-1 text-sm text-[#8593a8]">{userPhone ? toPersianDigits(userPhone) : "شماره ثبت نشده"}</p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#c08081] bg-white px-5 text-sm font-bold text-[#c08081] transition hover:bg-[#fff7f7]"
          >
            <Upload className="h-4 w-4" />
            آپلود تصویر
          </button>
        </div>

        <PanelSection title="مشخصات اصلی">
          <div className="grid gap-5 md:grid-cols-2">
            <PanelField label="نام" icon={User}>
              <PanelInput value={form.firstName} onChange={updateForm("firstName")} placeholder="نام" />
            </PanelField>
            <PanelField label="نام خانوادگی" icon={User}>
              <PanelInput value={form.lastName} onChange={updateForm("lastName")} placeholder="نام خانوادگی" />
            </PanelField>
            <PanelField label="ایمیل" icon={Mail}>
              <PanelInput value={form.email} onChange={updateForm("email")} type="email" placeholder="ایمیل" dir="ltr" />
            </PanelField>
            <PanelField label="تاریخ تولد">
              <PanelInput value={form.birthDate} onChange={updateForm("birthDate")} placeholder="تاریخ تولد" />
            </PanelField>
            <PanelField label="شماره تماس" icon={Phone}>
              <PanelInput value={form.phone} onChange={updateForm("phone")} type="tel" placeholder="شماره تماس" />
            </PanelField>
          </div>
        </PanelSection>

        <PanelSection title="تنظیمات رمز">
          <div className="grid gap-5 md:grid-cols-2">
            <PanelField label="رمز جدید">
              <PasswordInput
                value={form.newPassword}
                onChange={updateForm("newPassword")}
                placeholder="رمز جدید"
                visible={visiblePasswords.newPassword}
                onToggleVisibility={() =>
                  setVisiblePasswords((current) => ({ ...current, newPassword: !current.newPassword }))
                }
              />
            </PanelField>
            <PanelField label="تکرار رمز جدید">
              <PasswordInput
                value={form.repeatPassword}
                onChange={updateForm("repeatPassword")}
                placeholder="تکرار رمز جدید"
                visible={visiblePasswords.repeatPassword}
                onToggleVisibility={() =>
                  setVisiblePasswords((current) => ({ ...current, repeatPassword: !current.repeatPassword }))
                }
              />
            </PanelField>
          </div>
        </PanelSection>

        <PanelSection title="سایر مشخصات">
          <div className="grid gap-5 md:grid-cols-2">
            <PanelField label="صفحه اینستاگرام" icon={AtSign}>
              <PanelInput value={form.instagram} onChange={updateForm("instagram")} placeholder="صفحه اینستاگرام" dir="ltr" />
            </PanelField>
            <PanelField label="آدرس وب‌سایت" icon={Globe2}>
              <PanelInput value={form.website} onChange={updateForm("website")} placeholder="آدرس وب‌سایت" dir="ltr" />
            </PanelField>
          </div>
        </PanelSection>

        <PanelSection title="تنظیمات اطلاع‌رسانی">
          <div className="grid gap-4 md:grid-cols-2">
            <PanelSwitch
              checked={notifications.email}
              onChange={(value) => setNotifications((current) => ({ ...current, email: value }))}
              label="دریافت ایمیل اطلاع‌رسانی"
            />
            <PanelSwitch
              checked={notifications.sms}
              onChange={(value) => setNotifications((current) => ({ ...current, sms: value }))}
              label="دریافت پیامک تخفیف"
            />
          </div>
        </PanelSection>

        <div className="flex flex-col gap-3 border-t border-dashed border-[#dfe7f1] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-9">
          <p
            className={`min-h-6 text-sm ${status.type === "error" ? "text-[#b85d60]" : "text-[#5b8c67]"}`}
            aria-live="polite"
          >
            {status.message}
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2ecf7f] px-6 text-sm font-bold text-white shadow-[0_14px_32px_rgba(46,207,127,0.22)] transition hover:-translate-y-0.5 hover:bg-[#25bd72] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isSaving ? "در حال ذخیره" : "ثبت تغییرات"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_26px_70px_rgba(70,88,116,0.08)]">
        <AddressManager />
      </div>
    </div>
  );
}

function PanelCourseCard({ course, progress }) {
  const lessonsCount = getCourseLessons(course).length;
  const statusLabel = getCourseStatusLabel(progress);

  return (
    <motion.article whileHover={{ y: -8 }} transition={{ duration: 0.28 }} className="h-full">
      <Link
        to={`/panel/courses/${course.id}`}
        className="group relative flex aspect-[0.76] min-h-[360px] overflow-hidden rounded-[24px] bg-[#172235] text-white shadow-[0_22px_52px_rgba(39,54,77,0.15)]"
      >
        <img
          src={course.cover}
          alt={course.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,28,45,0.5)_0%,rgba(16,28,45,0.18)_38%,rgba(16,28,45,0.9)_100%)]" />

        <div className="relative z-10 flex w-full flex-col justify-between p-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3 text-sm font-bold">
              <span>{statusLabel}</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff5b75] text-white">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
              <div className="h-full rounded-full bg-[#ff6b78]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl leading-9 text-white drop-shadow-md">{course.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-white/78">{course.subtitle}</p>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-white/78">
              <span>{toPersianDigits(lessonsCount)} درس</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/14 px-3 py-1.5 text-white backdrop-blur">
                ورود به دوره
                <ChevronLeft className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function PanelCoursesPage({ user }) {
  usePanelSEO("دوره‌های من");

  const [progressByCourse, setProgressByCourse] = useState(() => readPanelProgress(user?.id));
  const [availableCourses, setAvailableCourses] = useState(panelCourses);
  const accessibleCourses = availableCourses.filter((course) => userHasPanelCourseAccess(user, course));

  useEffect(() => {
    setProgressByCourse(readPanelProgress(user?.id));
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        const data = await apiRequest("courses");
        if (cancelled) return;
        const normalizedCourses = (data.courses || []).map(normalizeCourseForPanel).filter(Boolean);
        setAvailableCourses(normalizedCourses.length > 0 ? normalizedCourses : panelCourses);
      } catch {
        if (!cancelled) setAvailableCourses(panelCourses);
      }
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-8 text-right">
        <h1 className="text-3xl leading-tight text-[#2f3f55] md:text-4xl">دوره‌هایی که خریدید</h1>
        <p className="mt-2 text-sm text-[#7d8ca3]">دسترسی‌های فعال حساب شما در گلملو</p>
      </div>

      {accessibleCourses.length > 0 ? (
        <div className="grid max-w-4xl gap-6 md:grid-cols-2">
          {accessibleCourses.map((course) => (
            <PanelCourseCard key={course.id} course={course} progress={getCourseProgress(course, progressByCourse)} />
          ))}
        </div>
      ) : (
        <div className="mx-auto grid min-h-[320px] max-w-xl place-items-center rounded-[28px] bg-white p-8 text-center shadow-[0_22px_58px_rgba(70,88,116,0.08)]">
          <div>
            <BookOpen className="mx-auto h-10 w-10 text-[#c08081]" />
            <h2 className="mt-5 text-2xl text-[#2f3f55]">هنوز به دوره‌ای دسترسی ندارید.</h2>
            <ButtonLink
              to="/#courses"
              variant="primary"
              size="panelMd"
              shape="panel"
              className="mt-6"
            >
              مشاهده دوره‌ها
            </ButtonLink>
          </div>
        </div>
      )}
    </section>
  );
}

function PanelVideoFrame({
  course,
  lesson,
  isPlaying,
  onPlay,
  onTimeChange,
  onEnded,
  currentSecond = 0,
  durationSeconds = 600,
}) {
  const videoRef = useRef(null);
  const progress = durationSeconds > 0 ? Math.min(100, Math.max(0, (currentSecond / durationSeconds) * 100)) : 0;

  useEffect(() => {
    if (!lesson.videoUrl || !videoRef.current) return;
    videoRef.current.currentTime = currentSecond;
  }, [lesson.id, lesson.videoUrl]);

  useEffect(() => {
    if (!lesson.videoUrl || !videoRef.current) return;

    if (isPlaying) {
      videoRef.current.play().catch(() => { });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, lesson.videoUrl]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-[26px] bg-[#101a2a] shadow-[0_26px_70px_rgba(39,54,77,0.14)]">
      {lesson.videoUrl ? (
        <video
          ref={videoRef}
          src={lesson.videoUrl}
          poster={lesson.thumbnail || course.cover}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          onTimeUpdate={(event) => onTimeChange?.(event.currentTarget.currentTime)}
          onEnded={onEnded}
        />
      ) : (
        <img src={lesson.thumbnail || course.cover} alt={lesson.title} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,22,35,0.75)_0%,rgba(13,22,35,0.2)_52%,rgba(13,22,35,0.68)_100%)]" />
      <button
        type="button"
        onClick={onPlay}
        className="absolute left-1/2 top-1/2 inline-flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[24px] bg-[#ff7448] text-white shadow-[0_18px_42px_rgba(255,116,72,0.34)] transition hover:scale-105"
        aria-label="پخش درس"
      >
        <Play className="h-9 w-9 fill-current" />
      </button>
      <div className="absolute bottom-6 right-6 max-w-sm text-right">
        <p className="text-sm font-bold text-[#ffd0c2]">{lesson.chapterTitle}</p>
        <h2 className="mt-2 text-3xl leading-10 text-white">{lesson.title}</h2>
        <p className="mt-2 text-sm text-white/75">
          {isPlaying ? "در حال پخش" : "آماده پخش"} از {formatPlaybackTime(currentSecond)}
        </p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/18">
        <div className="h-full bg-[#ff7448]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function PanelLessonButton({ lesson, isActive, isWatched, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm transition ${isActive ? "bg-[#f4f7fb] text-[#26364c]" : "text-[#64748b] hover:bg-[#f8fafc]"
        }`}
    >
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isActive ? "bg-[#ff6b78] text-white" : isWatched ? "bg-[#edf7f0] text-[#50a568]" : "bg-[#eef3f9] text-[#91a0b5]"
          }`}
      >
        {isWatched ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
      <span className="shrink-0 text-xs text-[#9aa8ba]">{lesson.duration}</span>
    </button>
  );
}

function PanelCourseSyllabus({
  course,
  progress,
  watchedLessonIds,
  activeLessonId,
  openChapterIds,
  onToggleChapter,
  onSelectLesson,
}) {
  return (
    <aside className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(70,88,116,0.08)] lg:sticky lg:top-7 lg:max-h-[calc(100vh-56px)] lg:self-start lg:[direction:rtl]">
      <div className="bg-[linear-gradient(135deg,#f1f3f6_0%,#ffffff_100%)] px-6 py-7">
        <h2 className="text-2xl leading-9 text-[#2f3f55]">{course.title}</h2>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-[#7d8ca3]">
            <span>پیشرفت دوره</span>
            <span>{toPersianDigits(progress)}٪</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e8eef6]">
            <div className="h-full rounded-full bg-[#c08081]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="max-h-none space-y-3 overflow-y-auto p-5 lg:max-h-[calc(100vh-240px)]">
        {getCourseChapters(course).map((chapter, chapterIndex) => {
          const isOpen = openChapterIds.has(chapter.id);
          return (
            <section key={chapter.id} className="border-b border-[#edf1f6] pb-3 last:border-b-0">
              <button
                type="button"
                onClick={() => onToggleChapter(chapter.id)}
                className="flex w-full items-center gap-3 py-3 text-right"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f4f8] text-sm font-bold text-[#697890]">
                  {toPersianDigits(chapterIndex + 1)}
                </span>
                <span className="min-w-0 flex-1 font-bold text-[#2f3f55]">{chapter.title}</span>
                <ChevronDown className={`h-5 w-5 text-[#9aa8ba] transition ${isOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pb-2">
                      {chapter.lessons.map((lesson) => (
                        <PanelLessonButton
                          key={lesson.id}
                          lesson={lesson}
                          isActive={activeLessonId === lesson.id}
                          isWatched={watchedLessonIds.has(lesson.id)}
                          onClick={() => onSelectLesson(lesson.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function PanelCourseDetailPage({ user }) {
  const { id } = useParams();
  const staticCourse = panelCourses.find((item) => item.id === id || (item.accessIds || []).includes(id));
  const [remoteCourse, setRemoteCourse] = useState(null);
  const [loadStatus, setLoadStatus] = useState({ type: staticCourse ? "idle" : "loading", message: "" });
  const course = remoteCourse || staticCourse;
  const lessons = useMemo(() => (course ? getCourseLessons(course) : []), [course]);
  const [progressByCourse, setProgressByCourse] = useState(() => readPanelProgress(user?.id));
  const initialRecord = course ? getPanelProgressRecord(progressByCourse, course.id) : normalizePanelProgressRecord(null);
  const initialWatchedLessonIds = course ? getWatchedLessonIds(course, progressByCourse) : new Set();
  const savedLesson = lessons.find((lesson) => lesson.id === initialRecord.lastLessonId);
  const firstOpenLesson = savedLesson || lessons.find((lesson) => !initialWatchedLessonIds.has(lesson.id)) || lessons[0];
  const [activeLessonId, setActiveLessonId] = useState(firstOpenLesson?.id || "");
  const [openChapterIds, setOpenChapterIds] = useState(() => new Set(firstOpenLesson ? [firstOpenLesson.chapterId] : []));
  const [currentSecond, setCurrentSecond] = useState(savedLesson ? initialRecord.currentTime : 0);
  const [isPlaying, setIsPlaying] = useState(Boolean(savedLesson && initialRecord.currentTime > 0));
  const progressRuntimeRef = useRef({});

  usePanelSEO(course?.title || "دوره");

  const hasAccess = userHasPanelCourseAccess(user, course);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) || lessons[0];
  const activeLessonIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
  const activeLessonDuration = durationToSeconds(activeLesson?.duration, 600);
  const progress = course ? getCourseProgress(course, progressByCourse) : 0;
  const watchedLessonIds = course ? getWatchedLessonIds(course, progressByCourse) : new Set();
  const previousLesson = activeLessonIndex > 0 ? lessons[activeLessonIndex - 1] : null;
  const nextLesson = activeLessonIndex >= 0 && activeLessonIndex < lessons.length - 1 ? lessons[activeLessonIndex + 1] : null;
  const isComplete = course && progress >= 100;

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      setRemoteCourse(null);
      setLoadStatus({ type: staticCourse ? "idle" : "loading", message: "" });
      try {
        const data = await apiRequest(`courses/${id}`);
        if (cancelled) return;
        setRemoteCourse(normalizeCourseForPanel(data.course));
        setLoadStatus({ type: "idle", message: "" });
      } catch (error) {
        if (cancelled) return;
        if (!staticCourse) {
          setLoadStatus({ type: "error", message: error.message });
        }
      }
    }

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [id, staticCourse]);

  useEffect(() => {
    if (!course || !firstOpenLesson) return;

    const nextProgress = readPanelProgress(user?.id);
    const nextRecord = getPanelProgressRecord(nextProgress, course.id);
    const nextSavedLesson = lessons.find((lesson) => lesson.id === nextRecord.lastLessonId);
    const nextLesson = nextSavedLesson || lessons.find((lesson) => !getWatchedLessonIds(course, nextProgress).has(lesson.id)) || lessons[0];

    setProgressByCourse(nextProgress);
    setActiveLessonId(nextLesson?.id || "");
    setOpenChapterIds(new Set(nextLesson ? [nextLesson.chapterId] : []));
    setCurrentSecond(nextSavedLesson && nextLesson?.id === nextSavedLesson.id ? nextRecord.currentTime : 0);
    setIsPlaying(Boolean(nextSavedLesson && nextRecord.currentTime > 0));
  }, [course?.id, user?.id]);

  useEffect(() => {
    progressRuntimeRef.current = {
      courseID: course?.id || "",
      lessonID: activeLesson?.id || "",
      currentSecond,
      durationSeconds: activeLessonDuration,
    };
  }, [activeLesson?.id, activeLessonDuration, course?.id, currentSecond]);

  const persistRuntimeProgress = useCallback(
    ({ markWatched = false } = {}) => {
      const runtime = progressRuntimeRef.current;
      if (!runtime.courseID || !runtime.lessonID) return;

      const shouldMarkWatched =
        markWatched || runtime.currentSecond >= Math.min(runtime.durationSeconds * 0.85, runtime.durationSeconds - 8);
      const nextProgress = updateStoredPanelProgress(user?.id, runtime.courseID, (record) => {
        const watchedLessonIds = new Set(record.watchedLessonIds);
        if (shouldMarkWatched) watchedLessonIds.add(runtime.lessonID);

        return {
          ...record,
          watchedLessonIds: [...watchedLessonIds],
          lastLessonId: runtime.lessonID,
          currentTime: shouldMarkWatched ? 0 : runtime.currentSecond,
        };
      });
      setProgressByCourse(nextProgress);
    },
    [user?.id],
  );

  useEffect(() => {
    if (!activeLesson || !isPlaying || activeLesson.videoUrl) return undefined;

    const intervalId = window.setInterval(() => {
      setCurrentSecond((current) => {
        const next = Math.min(current + 1, activeLessonDuration);
        if (next >= activeLessonDuration) {
          window.clearInterval(intervalId);
          setIsPlaying(false);
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeLesson?.id, activeLessonDuration, isPlaying]);

  useEffect(() => {
    if (!activeLesson) return;
    if (currentSecond < activeLessonDuration) return;

    persistRuntimeProgress({ markWatched: true });
  }, [activeLesson, activeLessonDuration, currentSecond, persistRuntimeProgress]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      persistRuntimeProgress();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      persistRuntimeProgress();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [persistRuntimeProgress]);

  useEffect(() => {
    if (!activeLesson) return;

    setOpenChapterIds((current) => {
      if (current.has(activeLesson.chapterId)) return current;
      const next = new Set(current);
      next.add(activeLesson.chapterId);
      return next;
    });
  }, [activeLesson]);

  const selectLesson = (lessonId) => {
    persistRuntimeProgress();

    const storedProgress = readPanelProgress(user?.id);
    const storedRecord = course ? getPanelProgressRecord(storedProgress, course.id) : normalizePanelProgressRecord(null);
    const resumeSecond = storedRecord.lastLessonId === lessonId ? storedRecord.currentTime : 0;

    setActiveLessonId(lessonId);
    setCurrentSecond(resumeSecond);
    setIsPlaying(false);
  };

  const toggleChapter = (chapterId) => {
    setOpenChapterIds((current) => {
      const next = new Set(current);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  if (loadStatus.type === "loading") {
    return <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">در حال بارگذاری دوره...</div>;
  }

  if (!course || !activeLesson) {
    return (
      <div className="grid min-h-[60vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <BookOpen className="mx-auto h-10 w-10 text-[#c08081]" />
          <h1 className="mt-5 text-2xl text-[#2f3f55]">{loadStatus.message || "دوره پیدا نشد."}</h1>
          <ButtonLink
            to="/panel/courses"
            variant="primary"
            size="panelMd"
            shape="panel"
            className="mt-6"
          >
            بازگشت به دوره‌ها
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="grid min-h-[60vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <Lock className="mx-auto h-10 w-10 text-[#c08081]" />
          <h1 className="mt-5 text-2xl text-[#2f3f55]">این دوره هنوز برای حساب شما فعال نیست.</h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-[#7d8ca3]">از صفحه معرفی دوره درخواست خرید را ثبت کنید تا بعد از فعال‌سازی از همین مسیر وارد دوره شوید.</p>
          <ButtonLink
            to={`/courses/${course.slug || course.id}`}
            variant="primary"
            size="panelMd"
            shape="panel"
            className="mt-6"
          >
            رفتن به صفحه دوره
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-6 flex flex-col gap-3 text-right sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#c08081]">{activeLesson.chapterTitle}</p>
          <h1 className="mt-1 text-3xl leading-tight text-[#2f3f55] md:text-4xl">{course.title}</h1>
        </div>
        <Link
          to="/panel/courses"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e1e8f2] bg-white px-4 text-sm text-[#617088] transition hover:border-[#c08081]/40 hover:text-[#c08081]"
        >
          <ChevronRight className="h-4 w-4" />
          دوره‌های من
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_370px] lg:[direction:ltr]">
        <div className="lg:[direction:rtl]">
          <PanelVideoFrame
            course={course}
            lesson={activeLesson}
            isPlaying={isPlaying}
            onPlay={() => setIsPlaying((current) => !current)}
            onTimeChange={(nextSecond) => setCurrentSecond(Math.floor(nextSecond))}
            onEnded={() => {
              setCurrentSecond(activeLessonDuration);
              setIsPlaying(false);
            }}
            currentSecond={currentSecond}
            durationSeconds={activeLessonDuration}
          />

          <div className="mt-5 rounded-[24px] bg-white p-5 text-center shadow-[0_18px_46px_rgba(70,88,116,0.06)]">
            <p className="text-sm font-bold text-[#94a2b7]">{activeLesson.chapterTitle}</p>
            <h2 className="mt-2 text-2xl text-[#2f3f55]">{activeLesson.title}</h2>
            {isComplete ? (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#edf7f0] px-4 py-2 text-sm font-bold text-[#4d9a61]">
                <CheckCircle2 className="h-4 w-4" />
                دوره تکمیل شد
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!previousLesson}
              onClick={() => previousLesson && selectLesson(previousLesson.id)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dfe7f1] bg-white px-4 text-sm font-bold text-[#6f7e96] transition hover:border-[#c08081]/40 hover:text-[#c08081] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#dfe7f1] disabled:hover:text-[#6f7e96]"
            >
              <ChevronRight className="h-4 w-4" />
              بخش قبلی
            </button>
            <Button
              type="button"
              disabled={!nextLesson}
              onClick={() => nextLesson && selectLesson(nextLesson.id)}
              variant="primary"
              size="panelMd"
              shape="panel"
              className="disabled:opacity-45"
            >
              بخش بعدی
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <PanelCourseSyllabus
          course={course}
          progress={progress}
          watchedLessonIds={watchedLessonIds}
          activeLessonId={activeLesson.id}
          openChapterIds={openChapterIds}
          onToggleChapter={toggleChapter}
          onSelectLesson={selectLesson}
        />
      </div>
    </section>
  );
}

function OrderStatusBadge({ status }) {
  const label = ORDER_STATUS_LABELS[status] || status || "نامشخص";
  const tone = {
    draft: "bg-[#f5f7fb] text-[#6f7e96]",
    delivered: "bg-[#edf7f0] text-[#4d9a61]",
    cancelled: "bg-[#fff1f1] text-[#b85d60]",
    ready: "bg-[#fff8e8] text-[#b07b28]",
    in_progress: "bg-[#eef6ff] text-[#4372a6]",
    confirmed: "bg-[#f1f4ff] text-[#5669b0]",
    need_more_info: "bg-[#fff7ed] text-[#b06d32]",
    pending_review: "bg-[#f5f7fb] text-[#6f7e96]",
  }[status] || "bg-[#f5f7fb] text-[#6f7e96]";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

function OrderThumbnail({ order, className = "aspect-square" }) {
  const cover = resolveApiURL(orderCoverImage(order));

  return (
    <div className={`${className} grid overflow-hidden rounded-2xl bg-[#f3f6fa]`}>
      {cover ? (
        <img src={cover} alt={orderDisplayTitle(order)} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-[#f8fafc] text-[#c08081]">
          <Send className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}

function PanelOrdersPage() {
  usePanelSEO("سفارش‌های من");

  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const [busyDraftId, setBusyDraftId] = useState("");

  const loadOrders = useCallback(async () => {
    setStatus({ type: "loading", message: "" });
    try {
      const data = await apiRequest("orders");
      setOrders(data.orders || []);
      setStatus({ type: "idle", message: "" });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const deleteDraft = async (orderId) => {
    if (!window.confirm("این پیش‌نویس حذف شود؟")) return;

    setBusyDraftId(orderId);
    try {
      await apiRequest(`orders/${orderId}`, { method: "DELETE" });
      setOrders((current) => current.filter((order) => order.id !== orderId));
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setBusyDraftId("");
    }
  };

  const drafts = orders.filter((order) => order.status === "draft");
  const submittedOrders = orders.filter((order) => order.status !== "draft");
  const isEmpty = status.type !== "loading" && orders.length === 0;

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-8 flex flex-col gap-4 text-right sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl leading-tight text-[#2f3f55] md:text-4xl">سفارش‌های من</h1>
          <p className="mt-2 text-sm text-[#7d8ca3]">وضعیت سفارش‌های گل پارچه‌ای خود را تا زمان تحویل پیگیری کنید.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink
            to="/panel/orders/new?type=custom"
            variant="primary"
            size="panelSm"
            shape="panel"
          >
            سفارش اختصاصی
          </ButtonLink>
          <Link
            to="/products"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe7f1] bg-white px-5 text-sm font-bold text-[#617088] transition hover:border-[#c08081]/40 hover:text-[#c08081]"
          >
            انتخاب از محصولات
          </Link>
        </div>
      </div>

      {status.type === "loading" ? (
        <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">در حال بارگذاری سفارش‌ها...</div>
      ) : null}
      {status.type === "error" ? (
        <div className="rounded-[28px] border border-[#efb8ba] bg-[#fff6f6] p-8 text-center text-[#b85d60]">
          <p>{status.message}</p>
          <button type="button" onClick={loadOrders} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-[#b85d60]">
            تلاش دوباره
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="mx-auto grid min-h-[320px] max-w-xl place-items-center rounded-[28px] bg-white p-8 text-center shadow-[0_22px_58px_rgba(70,88,116,0.08)]">
          <div>
            <Send className="mx-auto h-10 w-10 text-[#c08081]" />
            <h2 className="mt-5 text-2xl text-[#2f3f55]">هنوز سفارشی ثبت نشده است.</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <ButtonLink to="/products" variant="primary" size="panelMd" shape="panel">
                مشاهده محصولات
              </ButtonLink>
              <ButtonLink to="/panel/orders/new?type=custom" variant="outlineNeutral" size="panelMd" shape="panel">
                سفارش اختصاصی
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : null}

      {drafts.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-right text-xl text-[#2f3f55]">پیش‌نویس‌ها</h2>
          <div className="grid gap-4">
            {drafts.map((order) => (
              <article
                key={order.id}
                className="grid gap-4 rounded-[24px] border border-dashed border-[#dfe7f1] bg-white p-5 text-right shadow-[0_18px_46px_rgba(70,88,116,0.05)] md:grid-cols-[96px_1fr_auto] md:items-center"
              >
                <OrderThumbnail order={order} />
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl text-[#2f3f55]">{orderDisplayTitle(order)}</h3>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="line-clamp-2 text-sm leading-7 text-[#708097]">
                    {orderSummaryText(order, "می‌توانید ثبت سفارش را ادامه دهید.")}
                  </p>
                  <p className="mt-2 text-xs text-[#9aa8ba]">آخرین تغییر: {formatPersianDate(order.updatedAt || order.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <ButtonLink
                    to={`/panel/orders/drafts/${order.id}`}
                    variant="primary"
                    size="sm"
                    shape="panel"
                  >
                    ادامه ثبت سفارش
                  </ButtonLink>
                  <button
                    type="button"
                    onClick={() => deleteDraft(order.id)}
                    disabled={busyDraftId === order.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#f0d7d8] bg-white px-4 text-sm font-bold text-[#b85d60] disabled:opacity-60"
                  >
                    {busyDraftId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {submittedOrders.length > 0 ? (
        <section>
          <h2 className="mb-3 text-right text-xl text-[#2f3f55]">سفارش‌های ثبت‌شده</h2>
          <div className="grid gap-4">
            {submittedOrders.map((order) => (
              <Link
                key={order.id}
                to={`/panel/orders/${order.id}`}
                className="grid gap-4 rounded-[24px] bg-white p-5 text-right shadow-[0_18px_46px_rgba(70,88,116,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_56px_rgba(70,88,116,0.1)] md:grid-cols-[96px_1fr_auto] md:items-center"
              >
                <OrderThumbnail order={order} />
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl text-[#2f3f55]">{orderDisplayTitle(order)}</h2>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="line-clamp-2 text-sm leading-7 text-[#708097]">
                    {orderSummaryText(order)}
                  </p>
                  <p className="mt-2 text-xs text-[#9aa8ba]">ثبت: {formatPersianDate(order.submittedAt || order.createdAt)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-[#c08081]">
                  مشاهده جزئیات
                  <ChevronLeft className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function PanelNewOrderPage() {
  usePanelSEO("ثبت سفارش");

  const navigate = useNavigate();
  const location = useLocation();
  const startedRef = useRef(false);
  const query = new URLSearchParams(location.search);
  const productId = query.get("productId") || "";
  const requestedType = query.get("type") === "custom" ? "custom" : "product";
  const [status, setStatus] = useState({ type: "loading", message: "در حال آماده‌سازی پیش‌نویس سفارش..." });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (requestedType === "product" && !productId) {
      setStatus({ type: "error", message: "محصول انتخاب نشده است." });
      return;
    }

    async function createDraft() {
      setStatus({ type: "loading", message: "در حال آماده‌سازی پیش‌نویس سفارش..." });
      try {
        const data = await apiRequest("orders", {
          method: "POST",
          body: JSON.stringify({
            type: requestedType,
            productId: requestedType === "product" ? productId : "",
            status: "draft",
            quantity: 1,
          }),
        });
        trackEvent("order_started", {
          order_type: requestedType,
          product_id: requestedType === "product" ? productId : "",
          source: "panel_order_form",
        });
        navigate(`/panel/orders/drafts/${data.order.id}`, { replace: true });
      } catch (error) {
        setStatus({ type: "error", message: error.message });
      }
    }

    createDraft();
  }, [navigate, productId, requestedType]);

  return (
    <section className="py-6 lg:py-10">
      <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">
        {status.type === "loading" ? <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-[#c08081]" /> : null}
        <p className={status.type === "error" ? "text-[#b85d60]" : ""}>{status.message}</p>
        {status.type === "error" ? (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <ButtonLink to="/products" variant="primary" size="panelSm" shape="panel">
              مشاهده محصولات
            </ButtonLink>
            <ButtonLink to="/panel/orders/new?type=custom" variant="outlineNeutral" size="panelSm" shape="panel">
              سفارش اختصاصی
            </ButtonLink>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function orderFormFromOrder(order) {
  return {
    type: order?.type || "custom",
    productId: order?.productId || "",
    usage: order?.usage || "",
    usageOtherText: order?.usageOtherText || "",
    preferredColor: order?.preferredColor || "",
    styleNote: order?.styleNote || "",
    quantity: String(order?.quantity || 1),
    neededBy: order?.neededBy || "",
    customerNote: order?.customerNote || "",
    deliveryAddressId: order?.deliveryAddressId || "",
  };
}

function orderPayloadFromForm(form) {
  const quantity = Number.parseInt(normalizeDigits(String(form.quantity || "1")), 10);

  return {
    type: form.type,
    productId: form.productId,
    status: "draft",
    usage: form.usage,
    usageOtherText: form.usage === "other" ? form.usageOtherText : "",
    preferredColor: form.preferredColor,
    styleNote: form.styleNote,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    neededBy: form.neededBy,
    customerNote: form.customerNote,
    deliveryAddressId: form.deliveryAddressId,
  };
}

function ReferenceImagesField({ orderId, images = [], onImagesChange }) {
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const isUploading = status.type === "uploading";
  const resolvedImages = images.map((image) => ({ ...image, url: resolveApiURL(image.url) }));

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;
    if (images.length + files.length > 5) {
      setStatus({ type: "error", message: "حداکثر ۵ تصویر مرجع قابل آپلود است." });
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    setStatus({ type: "uploading", message: "" });
    try {
      const data = await apiRequest(`orders/${orderId}/reference-images`, {
        method: "POST",
        body: formData,
      });
      onImagesChange([...(images || []), ...(data.images || [])]);
      setStatus({ type: "success", message: "تصویر مرجع اضافه شد." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const deleteImage = async (imageId) => {
    setStatus({ type: "uploading", message: "" });
    try {
      await apiRequest(`orders/${orderId}/reference-images/${imageId}`, { method: "DELETE" });
      onImagesChange(images.filter((image) => image.id !== imageId));
      setStatus({ type: "success", message: "تصویر حذف شد." });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  return (
    <section className="rounded-[24px] border border-[#edf1f6] bg-white p-5 text-right">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl text-[#2f3f55]">تصاویر مرجع</h2>
          <p className="mt-1 text-sm text-[#7d8ca3]">برای توضیح رنگ، فرم یا نمونه مشابه، تا ۵ تصویر اضافه کنید.</p>
        </div>
        <label className={buttonClassName({ variant: "primary", size: "panelSm", shape: "panel", className: `cursor-pointer ${isUploading ? "pointer-events-none opacity-70" : ""}` })}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          افزودن تصویر
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="sr-only" disabled={isUploading} />
        </label>
      </div>

      {resolvedImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {resolvedImages.map((image) => (
            <div key={image.id} className="relative overflow-hidden rounded-2xl bg-[#f3f6fa]">
              <img src={image.url} alt="تصویر مرجع سفارش" className="aspect-square h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => deleteImage(image.id)}
                disabled={isUploading}
                className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-[#b85d60] shadow-[0_8px_20px_rgba(70,88,116,0.12)] disabled:opacity-60"
                aria-label="حذف تصویر"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-[#dfe7f1] bg-[#f8fafc] p-6 text-center text-sm text-[#7d8ca3]">
          هنوز تصویر مرجعی اضافه نشده است.
        </div>
      )}

      {status.message ? (
        <p className={`mt-3 min-h-5 text-sm ${status.type === "error" ? "text-[#b85d60]" : "text-[#5b8c67]"}`}>{status.message}</p>
      ) : null}
    </section>
  );
}

function DraftOrderEditor({ order, onOrderChange }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => orderFormFromOrder(order));
  const [images, setImages] = useState(order.referenceImages || []);
  const [saveStatus, setSaveStatus] = useState({ type: "idle", message: "" });
  const [submitStatus, setSubmitStatus] = useState({ type: "idle", message: "" });
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const autosaveTimerRef = useRef(null);
  const isProductOrder = form.type === "product";
  const isSaving = saveStatus.type === "saving";
  const isSubmitting = submitStatus.type === "submitting";

  useEffect(() => {
    setForm(orderFormFromOrder(order));
    setImages(order.referenceImages || []);
    setHasUserEdited(false);
  }, [order.id]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setHasUserEdited(true);
    setSaveStatus((current) => (current.type === "error" ? { type: "idle", message: "" } : current));
    setSubmitStatus((current) => (current.type === "error" ? { type: "idle", message: "" } : current));
  };

  const updateValue = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setHasUserEdited(true);
  };

  const saveDraft = useCallback(async ({ silent = false } = {}) => {
    if (!order.id) return null;
    if (!silent) setSaveStatus({ type: "saving", message: "" });

    const data = await apiRequest(`orders/${order.id}`, {
      method: "PATCH",
      body: JSON.stringify(orderPayloadFromForm(form)),
    });

    onOrderChange(data.order);
    setImages(data.order.referenceImages || images);
    setSaveStatus({ type: "success", message: "پیش‌نویس ذخیره شد." });
    return data.order;
  }, [form, images, onOrderChange, order.id]);

  useEffect(() => {
    if (!hasUserEdited || !order.id) return undefined;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = window.setTimeout(() => {
      saveDraft({ silent: true }).catch((error) => {
        setSaveStatus({ type: "error", message: error.message });
      });
    }, 1600);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [form, hasUserEdited, order.id, saveDraft]);

  const validateForSubmit = () => {
    if (!form.deliveryAddressId) return "انتخاب آدرس تحویل الزامی است.";
    if (form.type === "custom" && !form.usage) return "نوع استفاده را انتخاب کنید.";
    if (form.type === "custom" && !form.customerNote.trim()) return "توضیح سفارش اختصاصی الزامی است.";
    return "";
  };

  const handleManualSave = async () => {
    try {
      await saveDraft();
      setHasUserEdited(false);
    } catch (error) {
      setSaveStatus({ type: "error", message: error.message });
    }
  };

  const handleSubmitOrder = async () => {
    const validationError = validateForSubmit();
    if (validationError) {
      setSubmitStatus({ type: "error", message: validationError });
      return;
    }

    setSubmitStatus({ type: "submitting", message: "" });
    try {
      await saveDraft({ silent: true });
      const data = await apiRequest(`orders/${order.id}/submit`, { method: "POST" });
      trackEvent("order_submitted", {
        order_type: data.order.type || form.type,
        product_id: data.order.productId || form.productId || "",
      });
      navigate(`/panel/orders/${data.order.id}`, { replace: true });
    } catch (error) {
      setSubmitStatus({ type: "error", message: error.message });
    }
  };

  const productSnapshot = order.productSnapshot || {};

  return (
    <section className="grid gap-6 rounded-[28px] bg-white p-5 text-right shadow-[0_26px_70px_rgba(70,88,116,0.08)] lg:grid-cols-[300px_1fr] lg:p-7">
      <aside className="overflow-hidden rounded-[24px] border border-[#edf1f6] bg-[#f8fafc] lg:self-start">
        {isProductOrder ? (
          <>
            <div className="aspect-square overflow-hidden bg-[#eef3f9]">
              {productSnapshot.coverImageUrl ? (
                <img src={resolveApiURL(productSnapshot.coverImageUrl)} alt={productSnapshot.title} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="text-xl text-[#2f3f55]">{productSnapshot.title || "محصول انتخاب‌شده"}</h2>
              <p className="mt-2 text-sm leading-7 text-[#708097]">{productSnapshot.shortDescription}</p>
              <p className="mt-3 text-sm font-bold text-[#c08081]">{formatTomanPrice(productSnapshot.basePriceRial, productSnapshot.priceLabel || "پس از بررسی اعلام می‌شود")}</p>
              {order.productId ? (
                <Link to={`/products/${productSnapshot.slug || order.productId}`} className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-[#dfe7f1] bg-white px-4 text-xs font-bold text-[#617088]">
                  مشاهده محصول
                </Link>
              ) : null}
            </div>
          </>
        ) : (
          <div className="grid min-h-[260px] place-items-center p-6 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#fff1f1] text-[#c08081]">
                <Plus className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-2xl text-[#2f3f55]">سفارش اختصاصی</h2>
              <p className="mt-3 text-sm leading-7 text-[#708097]">جزئیات محصولی را که در ذهن دارید ثبت کنید تا بررسی و قیمت‌گذاری شود.</p>
            </div>
          </div>
        )}
      </aside>

      <div className="grid content-start gap-5">
        <section className="rounded-[24px] border border-[#edf1f6] bg-white p-5">
          <h2 className="mb-5 text-xl text-[#2f3f55]">جزئیات سفارش</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <PanelField label="کاربرد سفارش">
              <select
                value={form.usage}
                onChange={updateField("usage")}
                className="h-[52px] rounded-2xl border border-transparent bg-[#f8fafc] px-4 text-sm text-[#2e3d54] outline-none transition focus:border-[#c08081]/60 focus:bg-white"
              >
                <option value="">انتخاب کنید</option>
                {CUSTOM_USAGE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </PanelField>
            {form.usage === "other" ? (
              <PanelField label="توضیح کاربرد">
                <PanelInput value={form.usageOtherText} onChange={updateField("usageOtherText")} placeholder="مثلاً اکسسوری دکور یا کاربرد خاص" />
              </PanelField>
            ) : null}
            <PanelField label="رنگ ترجیحی">
              <PanelInput value={form.preferredColor} onChange={updateField("preferredColor")} placeholder="مثلاً سفید، کرم، قرمز" />
            </PanelField>
            <PanelField label="استایل یا حس موردنظر">
              <PanelInput value={form.styleNote} onChange={updateField("styleNote")} placeholder="مثلاً ظریف، مینیمال، پرحجم" />
            </PanelField>
            <PanelField label="تعداد">
              <PanelInput value={form.quantity} onChange={updateField("quantity")} type="number" min="1" inputMode="numeric" />
            </PanelField>
            <PanelField label="تاریخ موردنیاز">
              <PanelInput value={form.neededBy} onChange={updateField("neededBy")} placeholder="مثلاً ۱۴۰۵/۰۵/۲۰" />
            </PanelField>
          </div>

          <label className="mt-5 grid gap-2 text-right text-sm text-[#7f8ea5]">
            {form.type === "custom" ? "توضیحات سفارش اختصاصی" : "توضیحات تکمیلی"}
            <textarea
              value={form.customerNote}
              onChange={updateField("customerNote")}
              rows={7}
              className="rounded-2xl border border-transparent bg-[#f8fafc] px-4 py-3 text-sm leading-7 text-[#2e3d54] outline-none transition placeholder:text-[#a8b4c5] focus:border-[#c08081]/60 focus:bg-white"
              placeholder="ابعاد، کاربرد، رنگ، محدودیت زمانی یا هر جزئیات مهم دیگر را بنویسید."
            />
          </label>
        </section>

        <ReferenceImagesField orderId={order.id} images={images} onImagesChange={setImages} />

        <section className="rounded-[24px] border border-[#edf1f6] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-right">
            <MapPin className="h-5 w-5 text-[#c08081]" />
            <h2 className="text-xl text-[#2f3f55]">آدرس تحویل</h2>
          </div>
          <AddressManager
            selectable
            selectedId={form.deliveryAddressId}
            onSelect={(addressId) => updateValue("deliveryAddressId", addressId)}
            compact
          />
        </section>

        <div className="flex flex-col gap-3 rounded-[24px] border border-[#edf1f6] bg-[#f8fafc] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className={`min-h-6 text-sm ${saveStatus.type === "error" || submitStatus.type === "error" ? "text-[#b85d60]" : "text-[#708097]"}`}>
            {submitStatus.message || saveStatus.message || "تغییرات به صورت پیش‌نویس ذخیره می‌شود."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving || isSubmitting}
              variant="outlineNeutral"
              size="panelMd"
              shape="panel"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره پیش‌نویس
            </Button>
            <Button
              type="button"
              onClick={handleSubmitOrder}
              disabled={isSaving || isSubmitting}
              variant="primary"
              size="md"
              shape="panel"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              ثبت نهایی سفارش
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PanelDraftOrderPage() {
  usePanelSEO("تکمیل سفارش");

  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState({ type: "loading", message: "" });

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setStatus({ type: "loading", message: "" });
      try {
        const data = await apiRequest(`orders/${id}`);
        if (cancelled) return;
        setOrder(data.order);
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status.type === "loading") {
    return <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">در حال بارگذاری پیش‌نویس...</div>;
  }

  if (!order) {
    return (
      <div className="grid min-h-[50vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <h1 className="text-2xl text-[#2f3f55]">{status.message || "پیش‌نویس پیدا نشد."}</h1>
          <ButtonLink to="/panel/orders" variant="primary" size="panelMd" shape="panel" className="mt-6">
            بازگشت به سفارش‌ها
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (order.status !== "draft") {
    return (
      <div className="grid min-h-[50vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <OrderStatusBadge status={order.status} />
          <h1 className="mt-4 text-2xl text-[#2f3f55]">این سفارش قبلاً ثبت نهایی شده است.</h1>
          <ButtonLink to={`/panel/orders/${order.id}`} variant="primary" size="panelMd" shape="panel" className="mt-6">
            مشاهده جزئیات سفارش
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-6 flex flex-col gap-3 text-right sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl leading-tight text-[#2f3f55] md:text-4xl">
            {order.type === "custom" ? "تکمیل سفارش اختصاصی" : "تکمیل سفارش محصول"}
          </h1>
          <p className="mt-2 text-sm text-[#7d8ca3]">جزئیات، تصاویر مرجع و آدرس تحویل را ثبت کنید و سپس سفارش را نهایی کنید.</p>
        </div>
        <Link to="/panel/orders" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#e1e8f2] bg-white px-4 text-sm text-[#617088] transition hover:border-[#c08081]/40 hover:text-[#c08081]">
          بازگشت به سفارش‌ها
        </Link>
      </div>

      <DraftOrderEditor order={order} onOrderChange={setOrder} />
    </section>
  );
}

function PanelOrderDetailPage() {
  usePanelSEO("جزئیات سفارش");

  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState({ type: "loading", message: "" });

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setStatus({ type: "loading", message: "" });
      try {
        const data = await apiRequest(`orders/${id}`);
        if (cancelled) return;
        setOrder(data.order);
        setStatus({ type: "idle", message: "" });
      } catch (error) {
        if (!cancelled) setStatus({ type: "error", message: error.message });
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status.type === "loading") {
    return <div className="rounded-[28px] bg-white p-8 text-center text-[#7d8ca3] shadow-[0_22px_58px_rgba(70,88,116,0.08)]">در حال بارگذاری سفارش...</div>;
  }

  if (!order) {
    return (
      <div className="grid min-h-[50vh] place-items-center py-10">
        <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
          <h1 className="text-2xl text-[#2f3f55]">{status.message || "سفارش پیدا نشد."}</h1>
          <ButtonLink to="/panel/orders" variant="primary" size="panelMd" shape="panel" className="mt-6">
            بازگشت به سفارش‌ها
          </ButtonLink>
        </div>
      </div>
    );
  }

  const title = orderDisplayTitle(order);
  const cover = resolveApiURL(orderCoverImage(order));
  const address = order.deliveryAddressSnapshot || {};
  const referenceImages = order.referenceImages || [];

  return (
    <section className="py-6 lg:py-10">
      <div className="mb-6 flex flex-col gap-3 text-right sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl leading-tight text-[#2f3f55] md:text-4xl">{title}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-[#7d8ca3]">ثبت شده در {formatPersianDate(order.submittedAt || order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === "draft" ? (
            <ButtonLink to={`/panel/orders/drafts/${order.id}`} variant="primary" size="panelSm" shape="panel">
              ادامه پیش‌نویس
            </ButtonLink>
          ) : null}
          <Link to="/panel/orders" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#e1e8f2] bg-white px-4 text-sm text-[#617088] transition hover:border-[#c08081]/40 hover:text-[#c08081]">
            بازگشت به سفارش‌ها
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <section className="rounded-[28px] bg-white p-5 text-right shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
            <h2 className="text-xl text-[#2f3f55]">اطلاعات سفارش</h2>
            <div className="mt-5 grid gap-3 text-sm text-[#617088] md:grid-cols-2">
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">نوع سفارش</span>{order.type === "custom" ? "اختصاصی" : "محصول"}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">کاربرد</span>{order.usage === "other" ? order.usageOtherText || "سایر" : usageLabel(order.usage)}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">رنگ ترجیحی</span>{order.preferredColor || "-"}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">استایل</span>{order.styleNote || "-"}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">تعداد</span>{toPersianDigits(order.quantity || 1)}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">تاریخ موردنیاز</span>{order.neededBy || "-"}</div>
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-3"><span className="block text-xs text-[#9aa8ba]">قیمت پایه</span>{formatTomanPrice(order.productSnapshot?.basePriceRial, order.productSnapshot?.priceLabel || "پس از بررسی اعلام می‌شود")}</div>
            </div>
            <div className="mt-4 rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm leading-7 text-[#617088]">
              <span className="mb-1 block text-xs text-[#9aa8ba]">توضیحات شما</span>
              {order.customerNote || "-"}
            </div>
            {order.adminNote ? (
              <div className="mt-4 rounded-2xl border border-[#f0d7d8] bg-[#fff8f8] px-4 py-3 text-sm leading-7 text-[#8f5f61]">
                <span className="mb-1 block text-xs text-[#b06d6f]">یادداشت تیم گلملو</span>
                {order.adminNote}
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] bg-white p-5 text-right shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#c08081]" />
              <h2 className="text-xl text-[#2f3f55]">آدرس تحویل</h2>
            </div>
            {address.fullAddress ? (
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-4 text-sm leading-7 text-[#617088]">
                <p className="font-bold text-[#2f3f55]">{address.title || "آدرس تحویل"}</p>
                <p className="mt-2">{address.fullAddress}</p>
                {(address.receiverName || address.receiverPhone) ? (
                  <p className="mt-2 text-xs text-[#9aa8ba]">{[address.receiverName, address.receiverPhone].filter(Boolean).join(" · ")}</p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dfe7f1] bg-[#f8fafc] p-5 text-sm text-[#7d8ca3]">
                آدرس تحویل برای این سفارش ثبت نشده است.
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-5 text-right shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
            <h2 className="text-xl text-[#2f3f55]">تصاویر مرجع</h2>
            {referenceImages.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {referenceImages.map((image) => (
                  <a key={image.id} href={resolveApiURL(image.url)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl bg-[#f3f6fa]">
                    <img src={resolveApiURL(image.url)} alt="تصویر مرجع سفارش" className="aspect-square h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#dfe7f1] bg-[#f8fafc] p-5 text-center text-sm text-[#7d8ca3]">
                تصویر مرجعی برای این سفارش ثبت نشده است.
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-5 text-right shadow-[0_24px_64px_rgba(70,88,116,0.08)]">
            <h2 className="text-xl text-[#2f3f55]">روند وضعیت سفارش</h2>
            <div className="mt-5 grid gap-3">
              {(order.statusHistory || []).map((entry, index) => (
                <div key={`${entry.status}-${entry.createdAt}-${index}`} className="flex gap-3 rounded-2xl bg-[#f8fafc] p-4">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#c08081]" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusBadge status={entry.status} />
                      <span className="text-xs text-[#9aa8ba]">{formatPersianDate(entry.createdAt)}</span>
                    </div>
                    {entry.note ? <p className="mt-2 text-sm leading-7 text-[#617088]">{entry.note}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_rgba(70,88,116,0.08)] lg:self-start">
          <div className="aspect-square bg-[#eef3f9]">
            {cover ? (
              <img src={cover} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-[#c08081]">
                <Send className="h-14 w-14" />
              </div>
            )}
          </div>
          <div className="p-5 text-right">
            <h2 className="text-xl text-[#2f3f55]">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-[#708097]">
              {order.productSnapshot?.shortDescription || "سفارش اختصاصی شما بر اساس توضیحات و تصاویر مرجع بررسی می‌شود."}
            </p>
            {order.productId ? (
              <Link to={`/products/${order.productSnapshot?.slug || order.productId}`} className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-[#e1e8f2] bg-white px-4 text-sm font-bold text-[#c08081]">
                مشاهده محصول
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}


export default function PanelRoutes({ authStatus, user, onLogout, isLoggingOut, onProfileUpdate }) {
  const renderPanel = (content) => (
    <PanelRoute authStatus={authStatus} user={user}>
      <PanelLayout user={user} onLogout={onLogout} isLoggingOut={isLoggingOut}>
        {content}
      </PanelLayout>
    </PanelRoute>
  );

  return (
    <Routes>
      <Route path="/panel" element={<Navigate to="/panel/orders" replace />} />
      <Route path="/panel/login" element={<Navigate to="/auth" replace />} />
      <Route path="/panel/profile" element={renderPanel(<PanelProfilePage user={user} onProfileUpdate={onProfileUpdate} />)} />
      <Route path="/panel/orders" element={renderPanel(<PanelOrdersPage />)} />
      <Route path="/panel/orders/new" element={renderPanel(<PanelNewOrderPage />)} />
      <Route path="/panel/orders/drafts/:id" element={renderPanel(<PanelDraftOrderPage />)} />
      <Route path="/panel/orders/:id" element={renderPanel(<PanelOrderDetailPage />)} />
      <Route path="/panel/courses" element={renderPanel(<PanelCoursesPage user={user} />)} />
      <Route path="/panel/courses/:id" element={renderPanel(<PanelCourseDetailPage user={user} />)} />
      <Route path="*" element={<Navigate to="/panel/orders" replace />} />
    </Routes>
  );
}
