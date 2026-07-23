"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { api } from "@/lib/api";

function SignupPageContent() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
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

  async function register(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const res = await api.post("/api/auth/register", {
        name,
        email,
        password,
        interests: [],
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Go to events dashboard by default
      router.push("/events");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create account.");
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#101522_0%,_#08090C_60%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-70 transition-opacity"
        style={{
          background:
            "radial-gradient(600px circle at var(--x) var(--y), rgba(31,122,108,0.18), transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="ring ring-a" />
        <div className="ring ring-b" />
        <div className="ring ring-c" />
      </div>
      <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-[#1F7A6C]/25 blur-3xl orb-a" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-[#5B4B8A]/20 blur-3xl orb-b" />

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

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />

      <div className="relative z-10 flex w-full flex-col items-center px-6">
        <h1 className="mb-1 text-center text-4xl font-bold tracking-tight text-white">
          Create Account
        </h1>
        <p className="mb-8 text-center text-sm text-white/50">
          Join Convene to start exploring events.
        </p>

        <Card className="w-full max-w-[420px] border-white/10 bg-white/[0.04] backdrop-blur-xl">
          <CardContent className="space-y-4 pt-6">
            <form onSubmit={register} className="space-y-4">
              <div>
                <Label className="text-white/70">Full Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#1F7A6C]/40"
                  placeholder="Jane Doe"
                  suppressHydrationWarning
                />
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
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#1F7A6C]/40"
                  placeholder="••••••••"
                  suppressHydrationWarning
                />
              </div>

              <div>
                <Label className="text-white/70">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-[#1F7A6C]/40"
                  placeholder="••••••••"
                  suppressHydrationWarning
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1F7A6C] text-white hover:bg-[#19645A]"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <Button
              type="button"
              variant="outline"
              className="w-full border-white/15 bg-transparent text-white hover:bg-white/5 hover:text-white"
              onClick={() => router.push("/login")}
            >
              Sign in instead
            </Button>

            {error && (
              <p className="text-center text-sm font-medium text-[#B14A3F]">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
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
          .particle {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}

const SignupPage = dynamic(() => Promise.resolve(SignupPageContent), {
  ssr: false,
});

export default SignupPage;