import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Menu, User, X } from "lucide-react";
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
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.removeEventListener("keydown", closeOnEscape);
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-alabaster/50 bg-rosewood text-alabaster backdrop-blur transition hover:bg-charcoal"
      aria-label="پنل کاربری"
      title={userDisplayName}
    >
      <User className="h-5 w-5" />
    </Link>
  ) : (
    <Link
      to="/auth?mode=login"
      onClick={() => setIsMenuOpen(false)}
      className="inline-flex h-10 items-center justify-center rounded-full border border-alabaster/70 bg-rosewood px-4 text-sm font-bold text-alabaster shadow-soft backdrop-blur transition hover:bg-charcoal"
    >
      ورود | ثبت‌نام
    </Link>
  );

  const mobileMenu = isMenuOpen && typeof document !== "undefined" ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-y-auto bg-rosewood/90 px-6 py-8 text-center backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="منوی اصلی"
      onClick={() => setIsMenuOpen(false)}
    >
      <button
        type="button"
        className="absolute left-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-alabaster/12 text-alabaster transition hover:bg-alabaster/20"
        onClick={() => setIsMenuOpen(false)}
        aria-label="بستن منو"
      >
        <X className="h-5 w-5" />
      </button>

      <aside
        className="mobile-menu-content relative flex min-h-full w-full flex-col items-center justify-center py-16 text-center text-alabaster"
        onClick={(event) => event.stopPropagation()}
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
                "flex w-full items-center justify-center rounded-2xl bg-rosewood px-4 py-3 text-center text-sm font-bold text-alabaster shadow-soft transition hover:bg-charcoal",
              ),
            )}
          </nav>
          <div className="mt-8 flex justify-center">{authAction}</div>
        </div>
      </aside>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full bg-rosewood px-5 py-3 text-alabaster shadow-accent backdrop-blur-md">
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

        <nav className="hidden items-center gap-1 rounded-full bg-rosewood p-1 text-sm lg:flex">
          {navItems.map((item) =>
            renderNavLink(
              item,
              "rounded-full px-3 py-2 text-alabaster transition hover:bg-alabaster/14 hover:text-alabaster lg:px-4",
            ),
          )}
        </nav>

        <div className="hidden lg:block">{authAction}</div>

        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-alabaster/40 bg-rosewood text-alabaster backdrop-blur lg:hidden"
          aria-label="باز کردن منو"
        >
          <Menu className="h-5 w-5" />
        </button>
        </div>
      </div>
      {mobileMenu}
    </>
  );
}
