"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";

/**
 * ── Program ───────────────────────────────────────────────────
 * Adds date navigation on top of the original session list: a
 * horizontal day strip for quick prev/next, plus a calendar popover
 * for jumping to an arbitrary date. Sessions are grouped by the
 * selected day and sorted by start time; "live" only ever applies to
 * today, since that's the only day "now" can fall inside.
 *
 * Design system matches Events/Navbar: ink #1C2321, teal #1F7A6C
 * accent, hairline #E5E7EB, one accent color, borders over shadows.
 */

type Session = {
  _id: string;
  title: string;
  track: string;
  room: string;
  startTime: string;
  endTime: string;
  speakers: string[];
  tags: string[];
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProgramPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [savedSessions, setSavedSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function loadData() {
    try {
      const token = localStorage.getItem("token");
      const event = JSON.parse(localStorage.getItem("currentEvent") || "{}");

      const sessionsRes = await api.get(`/api/events/${event._id}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const loaded: Session[] = sessionsRes.data;
      setSessions(loaded);

      const agendaRes = await api.get("/api/agenda", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedSessions(agendaRes.data.map((s: Session) => s._id));

      // default to today if it has sessions, otherwise the first day of the program
      const today = new Date();
      const hasToday = loaded.some((s) => sameDay(new Date(s.startTime), today));
      if (hasToday) {
        setSelectedDate(today);
      } else if (loaded.length > 0) {
        const sorted = [...loaded].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        setSelectedDate(new Date(sorted[0].startTime));
      } else {
        setSelectedDate(today);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave(sessionId: string) {
    try {
      const token = localStorage.getItem("token");

      if (savedSessions.includes(sessionId)) {
        await api.delete(`/api/agenda/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSavedSessions((prev) => prev.filter((id) => id !== sessionId));
      } else {
        await api.post(
          `/api/agenda/${sessionId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSavedSessions((prev) => [...prev, sessionId]);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update agenda");
    }
  }

  // Every distinct day that has at least one session, sorted chronologically.
  const programDays = useMemo(() => {
    const map = new Map<string, Date>();
    sessions.forEach((s) => {
      const d = new Date(s.startTime);
      const key = dateKey(d);
      if (!map.has(key)) {
        map.set(key, new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      }
    });
    return Array.from(map.values()).sort((a, b) => a.getTime() - b.getTime());
  }, [sessions]);

  const sessionsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return sessions
      .filter((s) => sameDay(new Date(s.startTime), selectedDate))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [sessions, selectedDate]);

  const now = new Date();

  function statusOf(session: Session): "live" | "past" | "upcoming" {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    if (start <= now && end >= now) return "live";
    if (end < now) return "past";
    return "upcoming";
  }

  function goToDay(offset: number) {
    if (!selectedDate) return;
    const idx = programDays.findIndex((d) => sameDay(d, selectedDate));
    const nextIdx = idx + offset;
    if (nextIdx >= 0 && nextIdx < programDays.length) {
      setSelectedDate(programDays[nextIdx]);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-[#6B7280]">Loading program…</div>;
  }

  return (
    <div className="sticky top-0 z-50 border-b border-[#DEE3E0] bg-white/90 backdrop-blur"> <Navbar/>
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-[#1C2321]">
            Program
          </h1>
          <button
            onClick={() => router.push("/agenda")}
            className="rounded-lg bg-[#1C2321] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1F7A6C]"
          >
            My agenda
          </button>
        </div>

        {/* Date navigation */}
        {selectedDate && (
          <div className="mb-8 flex items-center gap-2">
            <button
              onClick={() => goToDay(-1)}
              disabled={programDays.findIndex((d) => sameDay(d, selectedDate)) <= 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#5C6B73] transition hover:bg-[#F4F6F5] disabled:opacity-30"
              aria-label="Previous day"
            >
              <IconChevron direction="left" />
            </button>

            <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide">
              {programDays.map((day) => {
                const active = sameDay(day, selectedDate);
                const isToday = sameDay(day, now);
                return (
                  <button
                    key={dateKey(day)}
                    onClick={() => setSelectedDate(day)}
                    className={`flex shrink-0 flex-col items-center rounded-xl border px-4 py-2 transition ${
                      active
                        ? "border-[#1F7A6C] bg-[#1F7A6C] text-white"
                        : "border-[#E5E7EB] text-[#1C2321] hover:bg-[#F4F6F5]"
                    }`}
                  >
                    <span
                      suppressHydrationWarning
                      className={`text-[10px] font-semibold uppercase tracking-wide ${
                        active ? "text-white/80" : "text-[#9AA5A2]"
                      }`}
                    >
                      {day.toLocaleDateString([], { weekday: "short" })}
                    </span>
                    <span className="text-lg font-bold leading-tight">
                      {day.getDate()}
                    </span>
                    {isToday && (
                      <span
                        className={`mt-0.5 h-1 w-1 rounded-full ${
                          active ? "bg-white" : "bg-[#1F7A6C]"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goToDay(1)}
              disabled={
                programDays.findIndex((d) => sameDay(d, selectedDate)) >=
                programDays.length - 1
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#5C6B73] transition hover:bg-[#F4F6F5] disabled:opacity-30"
              aria-label="Next day"
            >
              <IconChevron direction="right" />
            </button>

            {/* Calendar popover trigger */}
            <div className="relative" ref={calendarRef}>
              <button
                onClick={() => setCalendarOpen((v) => !v)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] text-[#5C6B73] transition hover:bg-[#F4F6F5]"
                aria-label="Pick a date"
              >
                <IconCalendar />
              </button>

              {calendarOpen && (
                <div className="absolute right-0 z-10 mt-2">
                  <MiniCalendar
                    selected={selectedDate}
                    highlighted={programDays}
                    onSelect={(d) => {
                      setSelectedDate(d);
                      setCalendarOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sessions for selected day */}
        {sessionsForSelectedDay.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center">
            <p className="font-semibold text-[#1C2321]">Nothing scheduled</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              No sessions on this day — try another date.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessionsForSelectedDay.map((session) => {
              const status = statusOf(session);
              return (
                <div
                  key={session._id}
                  className={`rounded-2xl border p-5 transition ${
                    status === "live"
                      ? "border-[#B14A3F]/40 bg-[#B14A3F]/5"
                      : status === "past"
                      ? "border-[#E5E7EB] opacity-60"
                      : "border-[#E5E7EB]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1F7A6C]" suppressHydrationWarning>
                          {formatTime(session.startTime)} – {formatTime(session.endTime)}
                        </span>
                        {status === "live" && (
                          <span className="rounded-full bg-[#B14A3F] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Live
                          </span>
                        )}
                      </div>
                      <h3 className="truncate text-lg font-bold text-[#1C2321]">
                        {session.title}
                      </h3>
                      {session.speakers?.length > 0 && (
                        <p className="mt-1 text-sm text-[#6B7280]">
                          {session.speakers.join(", ")}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9AA5A2]">
                        <span>{session.track}</span>
                        <span>·</span>
                        <span>{session.room}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleSave(session._id)}
                      className="shrink-0 text-2xl leading-none"
                      aria-label={
                        savedSessions.includes(session._id)
                          ? "Remove from agenda"
                          : "Add to agenda"
                      }
                    >
                      {savedSessions.includes(session._id) ? "⭐" : "☆"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
    </div>
  );
}

// ---------- Mini calendar ----------

function MiniCalendar({
  selected,
  highlighted,
  onSelect,
}: {
  selected: Date;
  highlighted: Date[];
  onSelect: (d: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(
    new Date(selected.getFullYear(), selected.getMonth(), 1)
  );

  const highlightedKeys = new Set(highlighted.map((d) => dateKey(d)));

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  ).getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)
    ),
  ];

  return (
    <div className="w-64 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#5C6B73] hover:bg-[#F4F6F5]"
        >
          <IconChevron direction="left" small />
        </button>
        <span className="text-sm font-semibold text-[#1C2321]" suppressHydrationWarning>
          {viewMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#5C6B73] hover:bg-[#F4F6F5]"
        >
          <IconChevron direction="right" small />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-[#9AA5A2]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const key = dateKey(day);
          const isSelected = sameDay(day, selected);
          const hasSessions = highlightedKeys.has(key);
          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full transition ${
                isSelected
                  ? "bg-[#1F7A6C] text-white font-semibold"
                  : "text-[#1C2321] hover:bg-[#F4F6F5]"
              }`}
            >
              {day.getDate()}
              {hasSessions && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#1F7A6C]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
    
  );
}

// ---------- Icons ----------

function IconChevron({
  direction,
  small,
}: {
  direction: "left" | "right";
  small?: boolean;
}) {
  const size = small ? 14 : 16;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: direction === "right" ? "rotate(180deg)" : undefined }}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
