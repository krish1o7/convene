"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";


import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { api } from "@/lib/api";

const HEADLINE = "Welcome to Convene";

type LoginAs = "attendee" | "organizer";

function LoginPageContent() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginAs, setLoginAs] = useState<LoginAs>("attendee");

  const [typed, setTyped] = useState("");
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Typewriter effect, runs once.
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(HEADLINE.slice(0, i));
      if (i >= HEADLINE.length) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, []);

  // Track pointer position for the glow layer.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      containerRef.current?.style.setProperty("--x", `${e.clientX}px`);
      containerRef.current?.style.setProperty("--y", `${e.clientY}px`);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Stable random particle positions/timings, generated once per mount.
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 8,
        duration: Math.random() * 10 + 10,
      })),
    []
  );

  async function login() {
    try {
      setLoading(true);

      const res = await api.post("/api/auth/login", {
        email,
        password,
        role: loginAs,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Trust the server's role if it sends one; otherwise fall back
      // to whichever tab the person picked.
      const effectiveRole: LoginAs = res.data.user?.role || loginAs;
      router.push(effectiveRole === "organizer" ? "/organizer" : "/events");
    } catch (err) {
      alert("Invalid email or password");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08090C]"
      style={{ ["--x" as any]: "50%", ["--y" as any]: "50%" }}
    >
      {/* Base gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#101522_0%,_#08090C_60%)]" />

      {/* Cursor-tracked glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity"
        style={{
          background:
            "radial-gradient(600px circle at var(--x) var(--y), rgba(31,122,108,0.18), transparent 60%)",
        }}
      />

      {/* Drifting rings, reminiscent of the Antigravity site's ring particles */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="ring ring-a" />
        <div className="ring ring-b" />
        <div className="ring ring-c" />
      </div>

      {/* Slow floating orbs */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-[#1F7A6C]/25 blur-3xl orb-a" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-[#5B4B8A]/20 blur-3xl orb-b" />

      {/* Twinkling particles */}
      <div className="pointer-events-none absolute inset-0">
        {mounted && particles.map((p, i) => (
          <span
            key={i}
            className="particle absolute rounded-full bg-white/40"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Fine grid overlay for depth */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center px-6">
        <h1 className="mb-1 text-center text-4xl font-bold tracking-tight text-white">
          {typed}
          <span className="typewriter-cursor">|</span>
        </h1>
        <p className="mb-8 text-center text-sm text-white/50">
          {loginAs === "organizer"
            ? "Sign in to schedule sessions and manage your event."
            : "Sign in to see what's happening at your event."}
        </p>

        <Card className="w-[420px] border-white/10 bg-white/[0.04] backdrop-blur-xl">
          <CardContent className="space-y-4 pt-6">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
              {(["attendee", "organizer"] as LoginAs[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setLoginAs(role)}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold capitalize transition ${
                    loginAs === role
                      ? "bg-[#1F7A6C] text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div>
              <Label className="text-white/70">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#1F7A6C]/40"
                placeholder="you@example.com"
                suppressHydrationWarning
              />
            </div>

            <div>
              <Label className="text-white/70">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#1F7A6C]/40"
                placeholder="••••••••"
                suppressHydrationWarning
              />
            </div>

            <Button
              className="w-full bg-[#1F7A6C] text-white hover:bg-[#19645A]"
              onClick={login}
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            <Button
              variant="outline"
              className="w-full border-white/15 bg-transparent text-white hover:bg-white/5 hover:text-white"
              onClick={() => router.push("/signup")}
            >
              Create account
            </Button>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        .typewriter-cursor {
          display: inline-block;
          margin-left: 2px;
          animation: blink 1s step-end infinite;
          color: #1f7a6c;
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        .ring {
          position: absolute;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .ring-a {
          width: 520px;
          height: 520px;
          animation: spin 60s linear infinite;
          border-color: rgba(31, 122, 108, 0.14);
        }
        .ring-b {
          width: 740px;
          height: 740px;
          animation: spin 90s linear infinite reverse;
        }
        .ring-c {
          width: 960px;
          height: 960px;
          animation: spin 130s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .orb-a {
          animation: drift-a 22s ease-in-out infinite;
        }
        .orb-b {
          animation: drift-b 26s ease-in-out infinite;
        }
        @keyframes drift-a {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(40px, 30px) scale(1.1);
          }
        }
        @keyframes drift-b {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-30px, -40px) scale(1.15);
          }
        }

        .particle {
          animation-name: twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.1;
            transform: translateY(0);
          }
          50% {
            opacity: 0.7;
            transform: translateY(-8px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ring,
          .orb-a,
          .orb-b,
          .particle,
          .typewriter-cursor {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}

const LoginPage = dynamic(() => Promise.resolve(LoginPageContent), {
  ssr: false,
});

export default LoginPage;
