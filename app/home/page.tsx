"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";
import SessionDetailsModal, { SessionDetail } from "@/components/ui/SessionDetailsModal";
import { Radio, Clock, MapPin, Calendar, Star, Users, ArrowRight, Video, Sparkles, Bookmark } from "lucide-react";

type EventItem = {
  _id: string;
  name: string;
  description?: string;
  locationName?: string;
  venue?: string;
  dates?: string;
};

export default function HomePage() {
  const router = useRouter();

  const [agendaSessions, setAgendaSessions] = useState<SessionDetail[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore
      }
    }

    loadDashboardData();
  }, [router]);

  async function loadDashboardData() {
    try {
      const [agendaRes, eventsRes] = await Promise.allSettled([
        api.get("/api/agenda"),
        api.get("/api/events"),
      ]);

      const agenda = agendaRes.status === "fulfilled" ? agendaRes.value.data || [] : [];
      const eventsList = eventsRes.status === "fulfilled" ? eventsRes.value.data || [] : [];

      setAgendaSessions(agenda);
      setEvents(eventsList);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard updates.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave(sessionId: string) {
    try {
      const isSaved = agendaSessions.some((s) => s._id === sessionId);
      if (isSaved) {
        await api.delete(`/api/agenda/${sessionId}`);
        setAgendaSessions((prev) => prev.filter((s) => s._id !== sessionId));
        if (selectedSession?._id === sessionId) {
          setIsModalOpen(false);
        }
      } else {
        await api.post(`/api/agenda/${sessionId}`);
        const res = await api.get("/api/agenda");
        setAgendaSessions(res.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ONLY categorize Saved Agenda Sessions for TODAY
  const liveAgendaSessions = useMemo(() => {
    return agendaSessions.filter((session) => {
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      const isToday =
        start.getFullYear() === now.getFullYear() &&
        start.getMonth() === now.getMonth() &&
        start.getDate() === now.getDate();
      return isToday && start <= now && end >= now;
    });
  }, [agendaSessions, now]);

  const upcomingAgendaSessions = useMemo(() => {
    return agendaSessions
      .filter((session) => new Date(session.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [agendaSessions, now]);

  const completedAgendaSessions = useMemo(() => {
    return agendaSessions.filter((session) => {
      const end = new Date(session.endTime);
      const start = new Date(session.startTime);
      const isPastDay =
        start.getFullYear() < now.getFullYear() ||
        (start.getFullYear() === now.getFullYear() && start.getMonth() < now.getMonth()) ||
        (start.getFullYear() === now.getFullYear() &&
          start.getMonth() === now.getMonth() &&
          start.getDate() < now.getDate());
      return end < now || isPastDay;
    });
  }, [agendaSessions, now]);

  const activeEvent = events[0] || null;
  const userName = user?.name ? user.name.split(" ")[0] : "Attendee";

  function formatTimeRange(startIso: string, endIso: string) {
    const startStr = new Date(startIso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const endStr = new Date(endIso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${startStr} – ${endStr}`;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0D0F12]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2DD4BF] border-t-transparent" />
          <p className="text-xs font-semibold text-[#94A3B8]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] animate-fade-in pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
          
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#14171D] p-6 sm:p-8 rounded-3xl border border-[#232833] shadow-xl">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2DD4BF] flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-[#2DD4BF]" />
                  Dashboard Overview
                </span>
                <span className="h-1 w-1 rounded-full bg-[#232833]" />
                <span className="text-xs text-[#94A3B8] font-semibold" suppressHydrationWarning>
                  {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Welcome back, {userName}!
              </h1>
              <p className="text-sm text-[#94A3B8]">
                Here is your live conference activity and saved agenda schedule.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2DD4BF] px-4.5 py-2.5 text-xs font-bold text-[#0D0F12] shadow-md hover:bg-[#14B8A6] transition"
              >
                <Calendar className="h-4 w-4" />
                <span>Explore Events</span>
              </Link>
              <Link
                href="/agenda"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1E232D] border border-[#232833] px-4.5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#282E3B] transition"
              >
                <Bookmark className="h-4 w-4 text-[#2DD4BF]" />
                <span>My Agenda ({agendaSessions.length})</span>
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-[#EF4444]/10 p-4 text-xs font-semibold text-[#EF4444] border border-[#EF4444]/20">
              {error}
            </div>
          )}

          {/* Section 1: LIVE SESSIONS IN MY SAVED AGENDA */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EF4444] opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#EF4444]" />
                </span>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Live Sessions in My Agenda ({liveAgendaSessions.length})
                </h2>
              </div>
              {liveAgendaSessions.length > 0 && (
                <span className="text-xs font-extrabold text-[#EF4444] uppercase tracking-wide bg-[#EF4444]/15 border border-[#EF4444]/30 px-3.5 py-1 rounded-full animate-pulse">
                  Live Now
                </span>
              )}
            </div>

            {liveAgendaSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveAgendaSessions.map((session) => (
                  <div
                    key={session._id}
                    onClick={() => {
                      setSelectedSession(session);
                      setIsModalOpen(true);
                    }}
                    className="group relative flex flex-col justify-between rounded-3xl border-2 border-[#EF4444]/50 bg-gradient-to-br from-[#EF4444]/15 to-[#14171D] p-6 shadow-xl hover:border-[#EF4444] hover:shadow-2xl transition cursor-pointer space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EF4444] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white animate-pulse">
                          <Radio className="h-3.5 w-3.5" />
                          Live Now
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#2DD4BF] bg-[#2DD4BF]/15 px-2.5 py-0.5 rounded-full border border-[#2DD4BF]/20">
                            {session.track || "Live Session"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSave(session._id);
                            }}
                            className="p-1.5 rounded-full text-[#F59E0B] bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 transition"
                            aria-label="Remove from agenda"
                          >
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white group-hover:text-[#EF4444] transition leading-snug">
                        {session.title}
                      </h3>

                      {session.description && (
                        <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                          {session.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#232833] space-y-3">
                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#94A3B8]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#EF4444]" />
                          <span>{formatTimeRange(session.startTime, session.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#EF4444]" />
                          <span>{session.room}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {session.meetingUrl ? (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#EF4444] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#DC2626] transition"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>Join Live Stream</span>
                          </a>
                        ) : (
                          <span className="text-xs font-bold text-[#EF4444]">Tap card for details</span>
                        )}

                        <span className="text-xs font-bold text-[#2DD4BF] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          View details <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#232833] bg-[#14171D] p-8 text-center space-y-3 shadow-xs">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2DD4BF]/15 text-[#2DD4BF] mx-auto">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    No Live Sessions Saved in Your Agenda Right Now
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1 max-w-md mx-auto">
                    Sessions saved in your agenda will automatically highlight here live when active.
                  </p>
                </div>
                <Link
                  href="/program"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#2DD4BF] px-5 py-2 text-xs font-bold text-[#0D0F12] shadow-md hover:bg-[#14B8A6] transition"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Browse Full Program Schedule</span>
                </Link>
              </div>
            )}
          </section>

          {/* Section 2: ACTIVE EVENT OVERVIEW & UPCOMING SAVED AGENDA GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Upcoming Saved Agenda Sessions */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  Up Next in Your Agenda ({upcomingAgendaSessions.length})
                </h2>
                <Link href="/agenda" className="text-xs font-bold text-[#2DD4BF] hover:underline flex items-center gap-1">
                  View full agenda <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {upcomingAgendaSessions.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAgendaSessions.slice(0, 4).map((session) => (
                    <div
                      key={session._id}
                      onClick={() => {
                        setSelectedSession(session);
                        setIsModalOpen(true);
                      }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#232833] bg-[#14171D] p-5 shadow-sm hover:border-[#2DD4BF]/50 hover:shadow-md transition cursor-pointer"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2DD4BF] bg-[#2DD4BF]/15 px-2.5 py-0.5 rounded-full">
                            {session.track || "Upcoming"}
                          </span>
                          <span className="text-xs text-[#94A3B8] font-semibold" suppressHydrationWarning>
                            {new Date(session.startTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white truncate group-hover:text-[#2DD4BF] transition">
                          {session.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8]">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="h-3.5 w-3.5 text-[#2DD4BF]" />
                            {formatTimeRange(session.startTime, session.endTime)}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-[#2DD4BF]" />
                            {session.room}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(session._id);
                        }}
                        className="shrink-0 self-start sm:self-center p-2 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/25 transition"
                        aria-label="Remove from agenda"
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#232833] bg-[#14171D] p-6 text-center space-y-2">
                  <p className="text-xs font-semibold text-[#94A3B8]">No upcoming sessions saved in your agenda.</p>
                  <Link href="/program" className="text-xs font-bold text-[#2DD4BF] hover:underline">
                    Add sessions from Program →
                  </Link>
                </div>
              )}
            </div>

            {/* Right Column: Conference Overview & Quick Stats */}
            <div className="space-y-6">
              
              {/* Event Card */}
              <div className="rounded-3xl border border-[#232833] bg-[#14171D] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2DD4BF] bg-[#2DD4BF]/15 px-2.5 py-1 rounded-full">
                    Active Event
                  </span>
                  <span className="text-xs font-semibold text-[#94A3B8]">Convene 2026</span>
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {activeEvent?.name || "ACM CHI & Tech Summit"}
                  </h3>
                  {activeEvent?.description && (
                    <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed">
                      {activeEvent.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-xs text-[#94A3B8] pt-2 border-t border-[#232833]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#2DD4BF]" />
                    <span className="font-semibold">{activeEvent?.dates || "Jul 22 – 25, 2026"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#2DD4BF]" />
                    <span className="font-semibold">{activeEvent?.locationName || "Centre de Convencions International"}</span>
                  </div>
                </div>

                <Link
                  href="/events"
                  className="block w-full text-center py-2.5 rounded-xl bg-[#1E232D] hover:bg-[#282E3B] text-white text-xs font-bold transition"
                >
                  View All Conference Events
                </Link>
              </div>

              {/* Quick Stats Widget */}
              <div className="rounded-3xl border border-[#232833] bg-[#14171D] p-6 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Agenda Summary
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#1E232D] border border-[#232833] space-y-1">
                    <p className="text-2xl font-black text-[#2DD4BF]">{agendaSessions.length}</p>
                    <p className="text-[11px] font-semibold text-[#94A3B8]">Saved Sessions</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#1E232D] border border-[#232833] space-y-1">
                    <p className="text-2xl font-black text-[#EF4444]">{liveAgendaSessions.length}</p>
                    <p className="text-[11px] font-semibold text-[#94A3B8]">Live Right Now</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#1E232D] border border-[#232833] space-y-1">
                    <p className="text-2xl font-black text-white">{upcomingAgendaSessions.length}</p>
                    <p className="text-[11px] font-semibold text-[#94A3B8]">Upcoming</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#1E232D] border border-[#232833] space-y-1">
                    <p className="text-2xl font-black text-[#64748B]">{completedAgendaSessions.length}</p>
                    <p className="text-[11px] font-semibold text-[#94A3B8]">Completed</p>
                  </div>
                </div>

                <Link
                  href="/network"
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#2DD4BF]/15 text-[#2DD4BF] hover:bg-[#2DD4BF]/25 transition text-xs font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Attendee Network</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* Session Details Modal */}
      <SessionDetailsModal
        session={selectedSession}
        isOpen={isModalOpen}
        isSaved={selectedSession ? agendaSessions.some((s) => s._id === selectedSession._id) : false}
        onClose={() => setIsModalOpen(false)}
        onToggleSave={toggleSave}
      />
    </>
  );
}
