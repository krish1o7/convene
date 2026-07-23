"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";

type Event = {
  _id: string;
  name: string;
  slug: string;
  joinCode: string;
  description: string;
  mode: string;
  locationName: string;
  timezone: string;
  startDate: string;
  endDate: string;
};

export default function EventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadEvents();
  }, [router]);

  async function loadEvents() {
    try {
      const res = await api.get("/api/events");
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function selectEvent(event: Event) {
    localStorage.setItem("currentEvent", JSON.stringify(event));
    router.push("/program");
  }

  async function joinEvent() {
    if (!code.trim()) {
      setJoinError("Enter a join code first.");
      return;
    }

    setJoinError(null);
    setJoining(true);
    try {
      const res = await api.post("/api/events/join", { code: code.trim() });
      localStorage.setItem("currentEvent", JSON.stringify(res.data));
      router.push("/program");
    } catch (err: any) {
      console.error(err);
      setJoinError(err?.response?.data?.message || "That code didn't work.");
    } finally {
      setJoining(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentEvent");
    router.push("/login");
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
        <Navbar />
      </div>
      <main className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] animate-fade-in">
        <div className="mx-auto max-w-3xl px-6 py-14">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Select an event
            </h1>
            <p className="mt-1 text-[#94A3B8]">
              Choose an event you're part of, or join one with a code.
            </p>
          </div>

          {/* Join by code */}
          <div className="mb-12 rounded-3xl border border-[#232833] bg-[#14171D] p-6 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-white">
              Have a join code?
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (joinError) setJoinError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && joinEvent()}
                placeholder="e.g. SUMMIT2026"
                className="flex-1 rounded-2xl border border-[#232833] bg-[#1E232D] px-4 py-2.5 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-[#2DD4BF] focus:ring-2 focus:ring-[#2DD4BF]/20"
              />
              <button
                onClick={joinEvent}
                disabled={joining}
                className="rounded-2xl bg-[#2DD4BF] px-5 py-2.5 text-sm font-semibold text-[#0D0F12] transition hover:bg-[#14B8A6] disabled:opacity-50"
              >
                {joining ? "Joining…" : "Join"}
              </button>
            </div>
            {joinError && (
              <p className="mt-2 text-sm text-[#EF4444]">{joinError}</p>
            )}
          </div>

          {/* Events list */}
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#94A3B8]">
            Your events
          </p>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl border border-[#232833] bg-[#14171D]"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#232833] bg-[#14171D] p-10 text-center">
              <p className="font-semibold text-white">No events yet</p>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Join one above with a code to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#232833] overflow-hidden rounded-3xl border border-[#232833] bg-[#14171D] shadow-sm">
              {events.map((event) => (
                <div
                  key={event._id}
                  onClick={() => selectEvent(event)}
                  className="group flex items-center justify-between gap-6 p-6 cursor-pointer hover:bg-[#1E232D]/70 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold text-white group-hover:text-[#2DD4BF] transition-colors">
                      {event.name}
                    </h3>
                    {event.description && (
                      <p className="mt-0.5 truncate text-sm text-[#94A3B8]">
                        {event.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94A3B8]">
                      <span className="capitalize">{event.mode}</span>
                      {event.locationName && (
                        <>
                          <span>·</span>
                          <span>{event.locationName}</span>
                        </>
                      )}
                      {event.joinCode && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[#2DD4BF] font-semibold">{event.joinCode}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-[#94A3B8] group-hover:text-[#2DD4BF] group-hover:translate-x-1 transition-all">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
