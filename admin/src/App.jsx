import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquareText,
  RefreshCw,
  Send,
  Trash2,
  Upload,
} from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1").replace(/\/+$/, "");
const TOKEN_KEY = "melody_admin_token";

function apiEndpoint(path) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiEndpoint(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "درخواست انجام نشد.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
          <div className="grid h-10 w-10 place-items-center rounded-md bg-[#4f6258] text-white">
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
              className="h-11 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#4f6258]"
              autoComplete="username"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-[#5f544d]">
            رمز عبور
            <input
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="h-11 rounded-md border border-[#d9cfc5] bg-white px-3 text-[#3f352f] outline-none focus:border-[#4f6258]"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#4f6258] px-4 text-sm font-medium text-white transition hover:bg-[#43544c] disabled:cursor-not-allowed disabled:opacity-70"
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
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#f0ebe5] text-[#4f6258]">
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#4f6258] px-4 text-sm font-medium text-white transition hover:bg-[#43544c] disabled:cursor-not-allowed disabled:opacity-70"
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

function ContactRequestsTable({ requests }) {
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
              <th className="rounded-l-md border-y border-l border-[#e0d7cd] px-3 py-3 font-medium">تاریخ ارسال</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-[#807269]">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CourseSignupsTable({ signups }) {
  return (
    <section className="rounded-lg border border-[#e0d7cd] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[#3f352f]">ثبت‌نام اطلاع‌رسانی دوره‌ها</h2>
        <p className="mt-1 text-sm text-[#807269]">شماره‌هایی که خواسته‌اند از شروع دوره‌های آموزشی باخبر شوند.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-right text-sm">
          <thead>
            <tr className="bg-[#f4eee8] text-[#5f544d]">
              <th className="rounded-r-md border-y border-r border-[#e0d7cd] px-3 py-3 font-medium">شماره تلفن</th>
              <th className="rounded-l-md border-y border-l border-[#e0d7cd] px-3 py-3 font-medium">تاریخ ثبت</th>
            </tr>
          </thead>
          <tbody>
            {signups.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-8 text-center text-[#807269]">
                  هنوز شماره‌ای ثبت نشده است.
                </td>
              </tr>
            ) : (
              signups.map((signup) => (
                <tr key={signup.id}>
                  <td className="border-b border-[#eee7df] px-3 py-3 font-medium text-[#3f352f]">{signup.phone}</td>
                  <td className="whitespace-nowrap border-b border-[#eee7df] px-3 py-3 text-[#807269]">
                    {formatDate(signup.createdAt)}
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

function Dashboard({ token, onLogout }) {
  const [contactRequests, setContactRequests] = useState([]);
  const [courseSignups, setCourseSignups] = useState([]);
  const [projectImages, setProjectImages] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: "" });
  const [uploading, setUploading] = useState("");

  const headers = useMemo(() => ({ token }), [token]);

  const loadData = async () => {
    setStatus({ type: "loading", message: "" });
    try {
      const [contactsData, courseData, projectData, heroData] = await Promise.all([
        apiRequest("admin/contact-requests", headers),
        apiRequest("admin/course-signups", headers),
        apiRequest("admin/project-images", headers),
        apiRequest("admin/hero-slides", headers),
      ]);

      setContactRequests(contactsData.contactRequests || []);
      setCourseSignups(courseData.courseSignups || []);
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

  return (
    <main dir="rtl" className="min-h-screen bg-[#f6f3ef]">
      <header className="sticky top-0 z-20 border-b border-[#e0d7cd] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-[#4f6258] text-white">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#3f352f]">مدیریت golmelo</h1>
              <p className="text-sm text-[#807269]">محتوا، تصاویر، پیام‌ها و ثبت‌نام‌های دوره</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d9cfc5] bg-white px-3 text-sm text-[#5f544d] transition hover:bg-[#f7f1eb]"
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

        <section className="grid gap-4 md:grid-cols-4">
          <StatBox label="پیام ثبت‌شده" value={contactRequests.length} icon={MessageSquareText} />
          <StatBox label="ثبت‌نام دوره" value={courseSignups.length} icon={Send} />
          <StatBox label="نمونه‌کار" value={projectImages.length} icon={ImagePlus} />
          <StatBox label="اسلاید بخش اول" value={heroSlides.length} icon={LayoutDashboard} />
        </section>

        <ContactRequestsTable requests={contactRequests} />

        <CourseSignupsTable signups={courseSignups} />

        <ImageManager
          title="نمونه‌کارها"
          description="تصاویر این بخش در گالری نمونه‌کارهای سایت نمایش داده می‌شوند."
          images={projectImages}
          uploadLabel="افزودن نمونه‌کار"
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
