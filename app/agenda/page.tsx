"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";
import SessionDetailsModal from "@/components/ui/SessionDetailsModal";

type Session = {
  _id: string;
  title: string;
  track: string;
  room: string;
  startTime: string;
  endTime: string;
  speakers: string[];
  tags: string[];
  conflict?: boolean;
};

export default function AgendaPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadAgenda();
  }, []);

  async function loadAgenda() {
    try {
      const res = await api.get("/api/agenda");
      setSessions(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load agenda.");
    } finally {
      setLoading(false);
    }
  }

  async function removeSession(sessionId: string) {
    try {
      await api.delete(`/api/agenda/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch (err) {
      console.error(err);
      setError("Failed to remove session.");
    }
  }

  const now = new Date();

  const liveSessions = sessions.filter(
    (session) =>
      new Date(session.startTime) <= now && new Date(session.endTime) >= now
  );

  const upcomingSessions = sessions.filter(
    (session) => new Date(session.startTime) > now
  );

  const completedSessions = sessions.filter(
    (session) => new Date(session.endTime) < now
  );

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
        <Navbar />
      </div>
      <main className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] animate-fade-in">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              My Agenda
            </h1>

            <button
              onClick={() => router.push("/program")}
              className="rounded-xl border border-[#232833] bg-[#1E232D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#282E3B]"
            >
              Back to Program
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-[#EF4444]/10 p-4 text-sm text-[#EF4444] border border-[#EF4444]/20">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl border border-[#232833] bg-[#14171D]"
                />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#232833] bg-[#14171D] p-10 text-center">
              <p className="font-semibold text-white">No Saved Sessions</p>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Save sessions from the Program page.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {liveSessions.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EF4444] opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#EF4444]"></span>
                    </span>
                    <h2 className="text-lg font-bold text-[#EF4444]">Live Now</h2>
                  </div>

                  <div className="space-y-3">
                    {liveSessions.map((session) => (
                      <div
                        key={session._id}
                        onClick={() => {
                          setSelectedSession(session);
                          setIsModalOpen(true);
                        }}
                        className="group rounded-2xl border border-[#EF4444]/50 bg-[#EF4444]/10 p-5 transition cursor-pointer hover:border-[#EF4444] hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-white group-hover:text-[#EF4444] transition">
                              {session.title}
                            </h3>
                            <p className="mt-1 text-sm text-[#94A3B8]">
                              {session.room}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSession(session._id);
                            }}
                            className="shrink-0 text-[#F59E0B] transition hover:scale-110"
                            aria-label="Remove from agenda"
                          >
                            <IconStar filled />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {upcomingSessions.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-bold text-white">Upcoming</h2>

                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <div
                        key={session._id}
                        onClick={() => {
                          setSelectedSession(session);
                          setIsModalOpen(true);
                        }}
                        className="group rounded-2xl border border-[#232833] bg-[#14171D] p-5 transition cursor-pointer hover:border-[#2DD4BF]/50 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-white group-hover:text-[#2DD4BF] transition">
                              {session.title}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94A3B8]">
                              <span>{session.track}</span>
                              <span>·</span>
                              <span>{session.room}</span>
                            </div>
                            <p className="mt-2 text-sm text-[#94A3B8]">
                              {session.speakers?.join(", ")}
                            </p>
                            <p
                              className="mt-3 text-sm font-semibold text-[#2DD4BF]"
                              suppressHydrationWarning
                            >
                              {new Date(session.startTime).toLocaleString()}
                            </p>
                            {session.conflict && (
                              <p className="mt-2 text-sm font-medium text-[#EF4444]">
                                ⚠ Schedule Conflict
                              </p>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSession(session._id);
                            }}
                            className="shrink-0 text-[#F59E0B] transition hover:scale-110"
                            aria-label="Remove from agenda"
                          >
                            <IconStar filled />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {completedSessions.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-bold text-[#94A3B8]">Completed</h2>

                  <div className="space-y-3">
                    {completedSessions.map((session) => (
                      <div
                        key={session._id}
                        onClick={() => {
                          setSelectedSession(session);
                          setIsModalOpen(true);
                        }}
                        className="group rounded-2xl border border-[#232833] bg-[#14171D] p-5 opacity-60 transition cursor-pointer hover:opacity-100 hover:border-[#2DD4BF]/50"
                      >
                        <h3 className="truncate font-semibold text-[#CBD5E1] group-hover:text-[#2DD4BF] transition">
                          {session.title}
                        </h3>
                        <p className="text-sm text-[#94A3B8]">{session.room}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Session Details Modal */}
        <SessionDetailsModal
          session={selectedSession}
          isOpen={isModalOpen}
          isSaved={selectedSession ? sessions.some((s) => s._id === selectedSession._id) : false}
          onClose={() => setIsModalOpen(false)}
          onToggleSave={(sessionId) => {
            removeSession(sessionId);
            setIsModalOpen(false);
          }}
        />
      </main>
    </>
  );
}

function IconStar({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}