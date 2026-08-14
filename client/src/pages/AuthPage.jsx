import React, { useEffect, useState } from "react";
import { Loader2, Send, Smartphone } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoImage from "../assets/Logo.webp";
import { PasswordInput } from "../components/panel/PanelForm";
import { Button } from "../components/ui/Button";
import { trackEvent } from "../lib/analytics";

function safeInternalRedirect(value, fallback = "/panel/orders") {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value) || /%5c/i.test(value)) return fallback;

  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin || target.pathname.startsWith("/auth")) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

function useAuthSEO(title) {
  useEffect(() => {
    document.title = `${title} | پنل گلملو`;
    let robots = document.head.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex, nofollow");
  }, [title]);
}

export default function AuthPage({ authStatus, user, onAuthenticate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const queryRedirect = searchParams.get("redirect");
  const stateFrom = location.state?.from
    ? `${location.state.from.pathname || ""}${location.state.from.search || ""}`
    : "";
  const redirectPath = safeInternalRedirect(queryRedirect || stateFrom);
  const [mode, setMode] = useState(() => (searchParams.get("mode") === "signup" ? "signup" : "login"));
  const [form, setForm] = useState({ phone: "", password: "", repeatPassword: "" });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [passwordVisibility, setPasswordVisibility] = useState({ password: false, repeatPassword: false });
  const isSignup = mode === "signup";
  const isLoading = status.type === "loading";
  const authIntent = redirectPath.startsWith("/panel/orders/new?type=custom")
    ? "برای شروع سفارش اختصاصی وارد حساب شوید؛ پس از ورود مستقیم به فرم سفارش برمی‌گردید."
    : redirectPath.startsWith("/panel/orders/new?productId=")
      ? "برای ثبت سفارش این گل وارد حساب شوید؛ پس از ورود مستقیم به فرم همان محصول برمی‌گردید."
      : redirectPath.startsWith("/courses/")
        ? "برای ثبت درخواست این دوره وارد حساب شوید؛ پس از ورود به همین دوره برمی‌گردید."
        : "برای ورود به سفارش‌ها، دوره‌ها و پروفایل خود وارد شوید.";

  useAuthSEO(isSignup ? "ثبت‌نام" : "ورود");

  useEffect(() => {
    if (authStatus === "authenticated" && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [authStatus, navigate, redirectPath, user]);

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setStatus({ type: "idle", message: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const phone = form.phone.trim();
    const password = form.password.trim();

    if (!phone || !password) {
      setStatus({ type: "error", message: "شماره تلفن و رمز عبور الزامی است." });
      return;
    }
    if (password.length < 6) {
      setStatus({ type: "error", message: "رمز عبور باید حداقل ۶ کاراکتر باشد." });
      return;
    }
    if (isSignup && password !== form.repeatPassword.trim()) {
      setStatus({ type: "error", message: "تکرار رمز عبور با رمز عبور یکسان نیست." });
      return;
    }

    setStatus({ type: "loading", message: "" });
    try {
      await onAuthenticate(mode, { phone, password });
      trackEvent(isSignup ? "signup_completed" : "login_completed", { method: "phone" });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-alabaster px-4 py-10 text-charcoal">
      <section className="w-full max-w-md overflow-hidden rounded-[30px] bg-alabaster shadow-soft">
        <div className="bg-alabaster px-6 py-6">
          <Link to="/" className="inline-flex items-center gap-3 text-right" aria-label="بازگشت به گلملو">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-charcoal shadow-soft">
              <img src={logoImage} alt="نشان گلملو" width="128" height="128" className="h-8 w-8 object-contain" />
            </span>
            <span>
              <span className="block text-lg font-black text-charcoal">Golmelo</span>
              <span className="block text-xs text-charcoal/70">پنل مشتری</span>
            </span>
          </Link>

          <h1 className="mt-8 text-3xl text-charcoal">{isSignup ? "ساخت حساب کاربری" : "ورود به حساب کاربری"}</h1>
          <p className="mt-2 text-sm leading-7 text-charcoal/70">
            {isSignup ? `با شماره تلفن و رمز عبور حساب خود را بسازید. ${authIntent}` : authIntent}
          </p>
        </div>

        <form className="grid gap-4 px-6 py-6" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold text-charcoal/70">
            شماره تلفن
            <div className="relative">
              <input
                value={form.phone}
                onChange={updateForm("phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="h-[52px] w-full rounded-2xl border border-transparent bg-alabaster px-4 pl-12 text-charcoal outline-none transition placeholder:text-charcoal/70 focus:border-rosewood/60 focus:bg-alabaster"
                placeholder="09121234567"
                required
              />
              <Smartphone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-charcoal/70" />
            </div>
          </label>

          <label className="grid gap-2 text-sm font-bold text-charcoal/70">
            رمز عبور
            <PasswordInput
              value={form.password}
              onChange={updateForm("password")}
              visible={passwordVisibility.password}
              onToggleVisibility={() => setPasswordVisibility((current) => ({ ...current, password: !current.password }))}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="حداقل ۶ کاراکتر"
              required
            />
          </label>

          {isSignup ? (
            <label className="grid gap-2 text-sm font-bold text-charcoal/70">
              تکرار رمز عبور
              <PasswordInput
                value={form.repeatPassword}
                onChange={updateForm("repeatPassword")}
                visible={passwordVisibility.repeatPassword}
                onToggleVisibility={() => setPasswordVisibility((current) => ({ ...current, repeatPassword: !current.repeatPassword }))}
                autoComplete="new-password"
                placeholder="تکرار رمز عبور"
                required
              />
            </label>
          ) : null}

          <Button type="submit" disabled={isLoading} variant="primary" size="panelMd" shape="soft" className="mt-2 h-[52px]">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSignup ? "ثبت‌نام و ورود" : "ورود به پنل"}
          </Button>

          <p className={`min-h-6 text-sm ${status.type === "error" ? "text-rosewood" : "text-charcoal/70"}`} aria-live="polite">
            {status.message}
          </p>
        </form>

        <div className="border-t border-dashed border-greige px-6 py-5 text-center text-sm text-charcoal/70">
          {isSignup ? "قبلاً حساب دارید؟" : "حساب ندارید؟"}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setStatus({ type: "idle", message: "" });
            }}
            className="mr-2 font-bold text-rosewood transition hover:text-charcoal"
          >
            {isSignup ? "ورود" : "ثبت‌نام"}
          </button>
        </div>
      </section>
    </main>
  );
}
