"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";
import SessionDetailsModal from "@/components/ui/SessionDetailsModal";
import { Sparkles, MapPin, Bookmark, Calendar } from "lucide-react";

type EventItem = {
  _id: string;
  name: string;
  description?: string;
  locationName?: string;
  venue?: string;
  dates?: string;
};

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

  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [savedSessions, setSavedSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      const eventsRes = await api.get("/api/events");
      const eventsList: EventItem[] = eventsRes.data || [];

      let currentEv: EventItem | null = eventsList[0] || null;
      const storedEv = localStorage.getItem("currentEvent");
      if (storedEv) {
        try {
          const parsed = JSON.parse(storedEv);
          if (parsed?._id) {
            const matched = eventsList.find((e) => e._id === parsed._id);
            if (matched) currentEv = matched;
          }
        } catch (e) {
          // ignore
        }
      }

      setActiveEvent(currentEv);

      let loaded: Session[] = [];
      if (currentEv?._id) {
        const sessionsRes = await api.get(`/api/events/${currentEv._id}/sessions`);
        loaded = sessionsRes.data || [];
      }
      setSessions(loaded);

      const agendaRes = await api.get("/api/agenda");
      setSavedSessions((agendaRes.data || []).map((s: Session) => s._id));

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
      setError("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave(sessionId: string) {
    try {
      if (savedSessions.includes(sessionId)) {
        await api.delete(`/api/agenda/${sessionId}`);
        setSavedSessions((prev) => prev.filter((id) => id !== sessionId));
      } else {
        await api.post(`/api/agenda/${sessionId}`);
        setSavedSessions((prev) => [...prev, sessionId]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update agenda.");
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

  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  function statusOf(session: Session): "live" | "past" | "upcoming" {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    const isToday =
      start.getFullYear() === now.getFullYear() &&
      start.getMonth() === now.getMonth() &&
      start.getDate() === now.getDate();

    if (isToday && start <= now && end >= now) return "live";
    if (end < now || (!isToday && start < now)) return "past";
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

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
        <Navbar />
      </div>
      <main className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] animate-fade-in pb-16">
        <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
          
          {/* Active Event Banner */}
          <div className="rounded-3xl border border-[#232833] bg-[#14171D] p-6 shadow-xl space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#2DD4BF] bg-[#2DD4BF]/15 border border-[#2DD4BF]/20 px-3 py-0.5 rounded-full inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Program Schedule
              </span>
              {activeEvent && (
                <>
                  <span className="h-1 w-1 rounded-full bg-[#232833]" />
                  <span className="text-xs text-[#94A3B8] font-semibold">
                    {activeEvent.dates || "Jul 22 – 25, 2026"}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeEvent?.name || "ACM CHI 2026"}
            </h1>

            {activeEvent?.locationName && (
              <p className="text-xs text-[#94A3B8] font-medium flex items-center gap-1.5 pt-0.5">
                <MapPin className="h-3.5 w-3.5 text-[#2DD4BF] shrink-0" />
                <span>{activeEvent.locationName}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-2xl bg-[#EF4444]/10 p-4 text-sm text-[#EF4444] border border-[#EF4444]/20 font-semibold">
              {error}
            </div>
          )}

          {/* Date navigation */}
          {selectedDate && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToDay(-1)}
                disabled={programDays.findIndex((d) => sameDay(d, selectedDate)) <= 0}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#232833] bg-[#14171D] text-[#94A3B8] transition hover:bg-[#1E232D] hover:text-white disabled:opacity-30"
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
                          ? "border-[#2DD4BF] bg-[#2DD4BF] text-[#0D0F12] font-bold"
                          : "border-[#232833] bg-[#14171D] text-white hover:bg-[#1E232D]"
                      }`}
                    >
                      <span
                        suppressHydrationWarning
                        className={`text-[10px] font-semibold uppercase tracking-wide ${
                          active ? "text-[#0D0F12]/80" : "text-[#94A3B8]"
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
                            active ? "bg-[#0D0F12]" : "bg-[#2DD4BF]"
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#232833] bg-[#14171D] text-[#94A3B8] transition hover:bg-[#1E232D] hover:text-white disabled:opacity-30"
                aria-label="Next day"
              >
                <IconChevron direction="right" />
              </button>

              {/* Calendar popover trigger */}
              <div className="relative" ref={calendarRef}>
                <button
                  onClick={() => setCalendarOpen((v) => !v)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#232833] bg-[#14171D] text-[#94A3B8] transition hover:bg-[#1E232D] hover:text-white"
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
            <div className="rounded-3xl border border-dashed border-[#232833] bg-[#14171D] p-10 text-center space-y-1">
              <p className="font-bold text-white text-base">Nothing scheduled</p>
              <p className="text-xs text-[#94A3B8]">
                No sessions on this day — try selecting another date above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessionsForSelectedDay.map((session) => {
                const status = statusOf(session);
                return (
                  <div
                    key={session._id}
                    onClick={() => {
                      setSelectedSession(session);
                      setIsModalOpen(true);
                    }}
                    className={`group rounded-3xl border p-6 transition cursor-pointer hover:border-[#2DD4BF]/50 hover:shadow-lg ${
                      status === "live"
                        ? "border-[#EF4444]/60 bg-[#EF4444]/10"
                        : status === "past"
                        ? "border-[#232833] bg-[#14171D] opacity-60 hover:opacity-100"
                        : "border-[#232833] bg-[#14171D]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2DD4BF]" suppressHydrationWarning>
                            {formatTime(session.startTime)} – {formatTime(session.endTime)}
                          </span>
                          {status === "live" && (
                            <span className="rounded-full bg-[#EF4444] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white animate-pulse">
                              Live
                            </span>
                          )}
                        </div>
                        <h3 className="truncate text-lg font-bold text-white group-hover:text-[#2DD4BF] transition leading-snug">
                          {session.title}
                        </h3>
                        {session.speakers?.length > 0 && (
                          <p className="text-xs text-[#94A3B8]">
                            {session.speakers.join(", ")}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B] pt-1">
                          <span>{session.track}</span>
                          <span>·</span>
                          <span>{session.room}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(session._id);
                        }}
                        className="shrink-0 text-2xl leading-none transition hover:scale-110"
                        aria-label={
                          savedSessions.includes(session._id)
                            ? "Remove from agenda"
                            : "Add to agenda"
                        }
                      >
                        {savedSessions.includes(session._id) ? (
                          <IconStar filled />
                        ) : (
                          <IconStar />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Session Details Modal */}
        <SessionDetailsModal
          session={selectedSession}
          isOpen={isModalOpen}
          isSaved={selectedSession ? savedSessions.includes(selectedSession._id) : false}
          onClose={() => setIsModalOpen(false)}
          onToggleSave={toggleSave}
        />
      </main>
    </>
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
    <div className="w-64 rounded-2xl border border-[#232833] bg-[#14171D] p-3.5 shadow-2xl text-white">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#1E232D] hover:text-white"
        >
          <IconChevron direction="left" small />
        </button>
        <span className="text-sm font-semibold text-white" suppressHydrationWarning>
          {viewMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#1E232D] hover:text-white"
        >
          <IconChevron direction="right" small />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-[#94A3B8]">
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
                  ? "bg-[#2DD4BF] text-[#0D0F12] font-extrabold"
                  : "text-[#E2E8F0] hover:bg-[#1E232D]"
              }`}
            >
              {day.getDate()}
              {hasSessions && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#2DD4BF]" />
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

function IconStar({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? "#F59E0B" : "none"}
      stroke={filled ? "#F59E0B" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
