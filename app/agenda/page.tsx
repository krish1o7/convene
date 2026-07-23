"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";

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

  useEffect(() => {
    loadAgenda();
  }, []);

  async function loadAgenda() {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/api/agenda", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSessions(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load agenda");
    } finally {
      setLoading(false);
    }
  }

  async function removeSession(sessionId: string) {
    try {
      const token = localStorage.getItem("token");

      await api.delete(`/api/agenda/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSessions((prev) => prev.filter((s) => s._id !== sessionId)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to remove session");
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        Loading Agenda...
      </div>
    );
  }

  const now = new Date();

  const liveSessions = sessions.filter(
    (session) =>
      new Date(session.startTime) <= now &&
      new Date(session.endTime) >= now
  );

  const upcomingSessions = sessions.filter(
    (session) =>
      new Date(session.startTime) > now
  );

  const completedSessions = sessions.filter(
    (session) =>
      new Date(session.endTime) < now
  );

  return (
  <div className="sticky top-0 z-50 border-b border-[#DEE3E0] bg-white/90 backdrop-blur"> <Navbar/>
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold">
            My Agenda
            
          </h1>

          <button
            onClick={() => router.push("/program")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Back to Program
          </button>
        </div>

        {sessions.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center shadow">
            <h2 className="text-2xl font-bold">
              No Saved Sessions
            </h2>

            <p className="mt-2 text-gray-600">
              Save sessions from the Program page.
            </p>
          </div>
        )}

        {liveSessions.length > 0 && (
          <>
            <h2 className="mb-4 text-2xl font-bold text-red-600">
              🔴 Live Now
            </h2>

            <div className="mb-8 grid gap-4">
              {liveSessions.map((session) => (
                <div
                  key={session._id}
                  className="rounded-2xl border border-red-400 bg-red-50 p-5"
                >
                  <h3 className="text-xl font-bold">
                    {session.title}
                  </h3>

                  <p className="mt-2 text-gray-600">
                    {session.room}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {upcomingSessions.length > 0 && (
          <>
            <h2 className="mb-4 text-2xl font-bold">
              Upcoming
            </h2>

            <div className="grid gap-4">
              {upcomingSessions.map((session) => (
                <div
                  key={session._id}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="max-w-[80%] text-xl font-bold">
                      {session.title}
                    </h3>

                    <button
                      onClick={() =>
                        removeSession(session._id)
                      }
                      className="text-2xl"
                    >
                      ⭐
                    </button>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-sm">
                      {session.track}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                      {session.room}
                    </span>
                  </div>

                  <p className="mt-3 text-gray-700">
                    {session.speakers.join(", ")}
                  </p>

                  <p className="mt-3 text-sm text-gray-500" suppressHydrationWarning>
                    {new Date(
                      session.startTime
                    ).toLocaleString()}
                  </p>

                  {session.conflict && (
                    <p className="mt-2 text-sm text-red-500">
                      ⚠ Schedule Conflict
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {completedSessions.length > 0 && (
          <>
            <h2 className="mb-4 mt-10 text-2xl font-bold text-green-600">
              ✅ Completed
            </h2>

            <div className="grid gap-4">
              {completedSessions.map((session) => (
                <div
                  key={session._id}
                  className="rounded-xl border bg-gray-100 p-4 opacity-70"
                >
                  <h3 className="font-semibold">
                    {session.title}
                  </h3>

                  <p className="text-sm text-gray-600">
                    {session.room}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
    </div>
  );
}


//ccc