"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

/**
 * ── Navbar ────────────────────────────────────────────────────
 * Same design system as the Networking page: ink #1C2321, paper
 * #F4F6F5, teal #1F7A6C accent, hairline #DEE3E0.
 *
 * Changes from the original:
 *  - Logo/brand on the left, nav links centered, account menu on the
 *    right — the avatar no longer doubles as both a profile link and
 *    sits oddly ahead of the nav itself.
 *  - Active route gets a visible underline/text treatment instead of
 *    every button looking identical regardless of where you are.
 *  - Real <Link> elements for navigation (works without JS, keeps
 *    ctrl/cmd-click-to-new-tab, better for SEO) instead of onClick +
 *    router.push on plain <button>s.
 *  - Avatar becomes a dropdown (Profile / Log out) that closes on
 *    outside click — "log out" didn't exist before.
 *  - A mobile menu, since the original had no small-screen behavior
 *    at all (four buttons would just wrap awkwardly).
 *  - Smaller avatar (36px, not 64px) — 64px is portrait-page scale,
 *    not navbar scale.
 *
 * Assumption: logging out clears local user/token state and sends
 * people to "/login". Adjust that path/keys to match your auth setup.
 */

type User = {
  name: string;
  email: string;
  role?: string;
};

const NAV_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/agenda", label: "Agenda" },
  { href: "/network", label: "Network" },
  { href: "/organizer", label: "Organizer" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore malformed cache
      }
    }
  }, []);

  // Close the account menu on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function logOut() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname?.startsWith(href + "/");
  }

  return (
    <div className="border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight text-white">
            CONVENE
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isActive(link.href)
                  ? "bg-[#2DD4BF]/15 text-[#2DD4BF]"
                  : "text-[#94A3B8] hover:bg-[#1E232D] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Account menu (desktop) */}
        <div className="relative hidden md:block" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-[#1E232D]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2DD4BF] text-sm font-bold text-[#0D0F12]">
              {user?.name?.charAt(0)?.toUpperCase() || "G"}
            </div>
            <span className="max-w-[10rem] truncate text-sm font-semibold text-white">
              {user?.name || "Guest"}
            </span>
            <ChevronDown open={menuOpen} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[#232833] bg-[#14171D] shadow-2xl z-50">
              <div className="border-b border-[#232833] px-4 py-3">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name || "Guest"}
                </p>
                <p className="truncate text-xs text-[#94A3B8]">
                  {user?.email || "Not signed in"}
                </p>
              </div>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-[#E2E8F0] hover:bg-[#1E232D]"
              >
                View profile
              </Link>
              <button
                onClick={logOut}
                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/10"
              >
                Log out
              </button>
            </div>
          )}
        </div>

        {/* Mobile trigger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-[#232833] bg-[#14171D] px-6 py-4 md:hidden">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2DD4BF] text-base font-bold text-[#0D0F12]">
              {user?.name?.charAt(0)?.toUpperCase() || "G"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.name || "Guest"}
              </p>
              <p className="truncate text-xs text-[#94A3B8]">{user?.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  isActive(link.href)
                    ? "bg-[#2DD4BF]/15 text-[#2DD4BF]"
                    : "text-[#E2E8F0] hover:bg-[#1E232D]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/profile"
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                isActive("/profile")
                  ? "bg-[#2DD4BF]/15 text-[#2DD4BF]"
                  : "text-[#E2E8F0] hover:bg-[#1E232D]"
              }`}
            >
              Profile
            </Link>
            <button
              onClick={logOut}
              className="mt-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#EF4444] hover:bg-[#EF4444]/10"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Icons ----------

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-[#9AA5A2] transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
