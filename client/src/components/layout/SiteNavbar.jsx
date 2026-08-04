import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, User } from "lucide-react";
import logoImage from "../../assets/Logo.webp";

export function SiteNavbar({
  navItems,
  authStatus = "guest",
  user = null,
  userDisplayName = "",
  onNavClick,
  onLogoClick,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAuthenticated = authStatus === "authenticated" && user;

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [isMenuOpen]);

  const handleNavItemClick = (item) => (event) => {
    setIsMenuOpen(false);
    if (onNavClick) {
      onNavClick(item.id)(event);
    }
  };

  const renderNavLink = (item, className = "") => {
    if (item.path) {
      return (
        <Link key={item.id} to={item.path} onClick={() => setIsMenuOpen(false)} className={className}>
          {item.label}
        </Link>
      );
    }

    return (
      <a
        key={item.id}
        href={onNavClick ? `#${item.id}` : `/#${item.id}`}
        onClick={handleNavItemClick(item)}
        className={className}
      >
        {item.label}
      </a>
    );
  };

  const authAction = isAuthenticated ? (
    <Link
      to="/panel/profile"
      onClick={() => setIsMenuOpen(false)}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-[#8f5558] text-white backdrop-blur transition hover:bg-[#824b4e]"
      aria-label="پنل کاربری"
      title={userDisplayName}
    >
      <User className="h-5 w-5" />
    </Link>
  ) : (
    <Link
      to="/auth?mode=login"
      onClick={() => setIsMenuOpen(false)}
      className="inline-flex h-10 items-center justify-center rounded-full border border-white/70 bg-[#8f5558] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(75,55,45,0.12)] backdrop-blur transition hover:bg-[#824b4e]"
    >
      ورود | ثبت‌نام
    </Link>
  );

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full bg-[#c08081] px-5 py-3 text-[#fff8f3] shadow-[0_14px_32px_rgba(192,128,129,0.25)] backdrop-blur-md">
        {onLogoClick ? (
          <button
            type="button"
            className="flex items-center"
            onClick={onLogoClick}
            aria-label="بازگشت به ابتدای صفحه"
          >
            <img
              src={logoImage}
              alt="نشان گلملو"
              width="128"
              height="128"
              decoding="async"
              className="h-9 w-auto object-contain brightness-110"
            />
          </button>
        ) : (
          <Link to="/" className="flex items-center" aria-label="بازگشت به ابتدای صفحه">
            <img
              src={logoImage}
              alt="نشان گلملو"
              width="128"
              height="128"
              decoding="async"
              className="h-9 w-auto object-contain brightness-110"
            />
          </Link>
        )}

        <nav className="hidden items-center gap-1 rounded-full bg-[#9b5e61] p-1 text-sm lg:flex">
          {navItems.map((item) =>
            renderNavLink(
              item,
              "rounded-full px-3 py-2 text-[#fff8f3] transition hover:bg-white/14 hover:text-white lg:px-4",
            ),
          )}
        </nav>

        <div className="hidden lg:block">{authAction}</div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-[#8f5558] text-white backdrop-blur lg:hidden"
          aria-label="باز کردن منو"
        >
          <Menu className="h-5 w-5" />
        </button>

        {isMenuOpen ? (
          <div
            className="fixed inset-0 z-[90] flex min-h-dvh items-center justify-center bg-[#1f2a24]/60 p-6 text-center backdrop-blur-[6px] lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          >
            <aside
              className="mobile-menu-content relative flex h-full w-full flex-col items-center justify-center px-2 py-16 text-center text-white"
            >
              <div className="flex w-full max-w-xs flex-col items-center">
                <Link to="/" className="mb-8 inline-flex items-center justify-center gap-3" onClick={() => setIsMenuOpen(false)}>
                  <img src={logoImage} alt="نشان گلملو" width="128" height="128" className="h-9 w-auto object-contain brightness-110" />
                  <span className="text-sm font-bold">Golmelo</span>
                </Link>
                <nav className="flex w-full flex-col items-center gap-3">
                  {navItems.map((item) =>
                    renderNavLink(
                      item,
                      "flex w-full items-center justify-center rounded-2xl bg-[#c08081] px-4 py-3 text-center text-sm font-bold text-white shadow-[0_14px_34px_rgba(73,55,48,0.16)] transition hover:bg-[#ad7274]",
                    ),
                  )}
                </nav>
                <div className="mt-8 flex justify-center">{authAction}</div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
