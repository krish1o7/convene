"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";

/**
 * ── Select Event ──────────────────────────────────────────────
 * Same design system as Navbar / Networking: ink #1C2321, paper
 * #F4F6F5, teal #1F7A6C accent, hairline #DEE3E0 — kept deliberately
 * quiet here. No shadows, one accent color, generous whitespace.
 * Logic is unchanged from the original: auth guard, load events,
 * join-by-code, select event, logout.
 */

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
      const token = localStorage.getItem("token");
      const res = await api.get("/api/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/api/events/join",
        { code: code.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
    <div className="sticky top-0 z-50 border-b border-[#DEE3E0] bg-white/90 backdrop-blur"> <Navbar/>
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1C2321]">
              Select an event
            </h1>
            <p className="mt-1 text-[#6B7280]">
              Choose an event you're part of, or join one with a code.
            </p>
          </div>

          <button
            onClick={logout}
            className="text-sm font-medium text-[#9AA5A2] transition hover:text-[#1C2321]"
          >
            Log out
          </button>
        </div>

        {/* Join by code */}
        <div className="mb-12 rounded-2xl border border-[#E5E7EB] p-5">
          <p className="mb-3 text-sm font-semibold text-[#1C2321]">
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
              className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm text-[#1C2321] outline-none placeholder:text-[#B0B7B5] focus:border-[#1F7A6C] focus:ring-2 focus:ring-[#1F7A6C]/15"
            />
            <button
              onClick={joinEvent}
              disabled={joining}
              className="rounded-lg bg-[#1F7A6C] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#19645A] disabled:opacity-50"
            >
              {joining ? "Joining…" : "Join"}
            </button>
          </div>
          {joinError && (
            <p className="mt-2 text-sm text-[#B14A3F]">{joinError}</p>
          )}
        </div>

        {/* Events list */}
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#9AA5A2]">
          Your events
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-[#E5E7EB]"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center">
            <p className="font-semibold text-[#1C2321]">No events yet</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Join one above with a code to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB]">
            {events.map((event) => (
              <div
                key={event._id}
                className="flex items-center justify-between gap-6 p-5"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-[#1C2321]">
                    {event.name}
                  </h3>
                  {event.description && (
                    <p className="mt-0.5 truncate text-sm text-[#6B7280]">
                      {event.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9AA5A2]">
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
                        <span className="font-mono">{event.joinCode}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => selectEvent(event)}
                  className="shrink-0 rounded-lg bg-[#1C2321] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1F7A6C]"
                >
                  Enter
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
     </div>
  );
}
