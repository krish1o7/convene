"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

/**
 * ── Manage event ──────────────────────────────────────────────
 * Route: /organizer/events (with ?eventId=...)
 *
 * Two tabs:
 *   Sessions — create/edit/delete the schedule attendees see on /program
 *   Invites  — send email invites, see status, share the join code
 *
 * Assumed endpoints:
 *   GET    /api/events/:id                        -> event details
 *   GET    /api/events/:id/sessions                (already used by /program)
 *   POST   /api/events/:id/sessions
 *   PATCH  /api/events/:id/sessions/:sessionId
 *   DELETE /api/events/:id/sessions/:sessionId
 *   GET    /api/events/:id/invites
 *   POST   /api/events/:id/invites   { emails: string[] }
 *   DELETE /api/events/:id/invites/:inviteId
 */

type EventDetails = {
  _id: string;
  name: string;
  joinCode: string;
  startDate: string;
  endDate: string;
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

type Invite = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "declined" | string;
  sentAt?: string;
};

type Tab = "sessions" | "invites";

const emptySessionDraft = {
  title: "",
  track: "",
  room: "",
  startTime: "",
  endTime: "",
  speakers: "",
  tags: "",
};

function OrganizerEventPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || "";

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [tab, setTab] = useState<Tab>("sessions");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [sessionDraft, setSessionDraft] = useState(emptySessionDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [inviteText, setInviteText] = useState("");
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  function authHeaders() {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  useEffect(() => {
    if (eventId) {
      loadEvent();
      loadSessions();
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId && tab === "invites" && !invitesLoaded) {
      loadInvites();
    }
  }, [tab, eventId]);

  async function loadEvent() {
    try {
      const res = await api.get(`/api/events/${eventId}`, authHeaders());
      setEvent(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const res = await api.get(`/api/events/${eventId}/sessions`, authHeaders());
      setSessions(res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadInvites() {
    setLoadingInvites(true);
    try {
      const res = await api.get(`/api/events/${eventId}/invites`, authHeaders());
      setInvites(res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvites(false);
      setInvitesLoaded(true);
    }
  }

  function openNewSessionForm() {
    setEditingId(null);
    setSessionDraft(emptySessionDraft);
    setSessionError(null);
    setSessionFormOpen(true);
  }

  function openEditSessionForm(session: Session) {
    setEditingId(session._id);
    setSessionDraft({
      title: session.title,
      track: session.track,
      room: session.room,
      startTime: toLocalInput(session.startTime),
      endTime: toLocalInput(session.endTime),
      speakers: session.speakers?.join(", ") ?? "",
      tags: session.tags?.join(", ") ?? "",
    });
    setSessionError(null);
    setSessionFormOpen(true);
  }

  function toLocalInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }

  async function saveSession() {
    if (!sessionDraft.title.trim() || !sessionDraft.startTime || !sessionDraft.endTime) {
      setSessionError("Title, start time, and end time are required.");
      return;
    }
    if (new Date(sessionDraft.endTime) <= new Date(sessionDraft.startTime)) {
      setSessionError("End time must be after the start time.");
      return;
    }

    setSessionError(null);
    setSavingSession(true);
    try {
      const payload = {
        title: sessionDraft.title.trim(),
        track: sessionDraft.track.trim(),
        room: sessionDraft.room.trim(),
        startTime: new Date(sessionDraft.startTime).toISOString(),
        endTime: new Date(sessionDraft.endTime).toISOString(),
        speakers: sessionDraft.speakers
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tags: sessionDraft.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (editingId) {
        const res = await api.patch(
          `/api/events/${eventId}/sessions/${editingId}`,
          payload,
          authHeaders()
        );
        setSessions((prev) =>
          prev.map((s) => (s._id === editingId ? res.data : s))
        );
      } else {
        const res = await api.post(
          `/api/events/${eventId}/sessions`,
          payload,
          authHeaders()
        );
        setSessions((prev) => [...prev, res.data]);
      }

      setSessionFormOpen(false);
    } catch (err: any) {
      console.error(err);
      setSessionError(err?.response?.data?.message || "Couldn't save that session.");
    } finally {
      setSavingSession(false);
    }
  }

  async function deleteSession(sessionId: string) {
    if (!confirm("Delete this session? This can't be undone.")) return;
    try {
      await api.delete(`/api/events/${eventId}/sessions/${sessionId}`, authHeaders());
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch (err) {
      console.error(err);
      alert("Couldn't delete that session.");
    }
  }

  const parsedEmails = useMemo(() => {
    return Array.from(
      new Set(
        inviteText
          .split(/[\n,]/)
          .map((e) => e.trim())
          .filter((e) => /\S+@\S+\.\S+/.test(e))
      )
    );
  }, [inviteText]);

  async function sendInvites() {
    if (parsedEmails.length === 0) {
      setInviteMessage("Add at least one valid email address.");
      return;
    }
    setInviteMessage(null);
    setSendingInvites(true);
    try {
      const res = await api.post(
        `/api/events/${eventId}/invites`,
        { emails: parsedEmails },
        authHeaders()
      );
      setInvites((prev) => [...(res.data ?? []), ...prev]);
      setInviteText("");
      setInviteMessage(
        `Sent ${parsedEmails.length} invite${parsedEmails.length > 1 ? "s" : ""}.`
      );
    } catch (err: any) {
      console.error(err);
      setInviteMessage(err?.response?.data?.message || "Couldn't send invites.");
    } finally {
      setSendingInvites(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    try {
      await api.delete(`/api/events/${eventId}/invites/${inviteId}`, authHeaders());
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      console.error(err);
      alert("Couldn't revoke that invite.");
    }
  }

  function copyJoinCode() {
    if (event?.joinCode) {
      navigator.clipboard.writeText(event.joinCode);
      setInviteMessage("Join code copied.");
      setTimeout(() => setInviteMessage(null), 2000);
    }
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (!eventId) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">No Event ID specified.</p>
          <button
            onClick={() => router.push("/organizer")}
            className="mt-4 rounded-lg bg-[#1C2321] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1F7A6C]"
          >
            Go back to all events
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <button
          onClick={() => router.push("/organizer")}
          className="mb-4 text-sm font-medium text-[#9AA5A2] hover:text-[#1C2321]"
        >
          ← All events
        </button>

        <h1 className="mb-1 text-3xl font-bold tracking-tight text-[#1C2321]">
          {event?.name || "Manage event"}
        </h1>
        {event && (
          <p className="mb-6 text-sm text-[#6B7280]" suppressHydrationWarning>
            {new Date(event.startDate).toLocaleDateString()} –{" "}
            {new Date(event.endDate).toLocaleDateString()}
          </p>
        )}

        {/* Tabs */}
        <div className="mb-8 flex gap-1 border-b border-[#E5E7EB]">
          {(["sessions", "invites"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition ${
                tab === t
                  ? "border-[#1F7A6C] text-[#1C2321]"
                  : "border-transparent text-[#9AA5A2] hover:text-[#1C2321]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Sessions tab */}
        {tab === "sessions" && (
          <div>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#9AA5A2]">
                Schedule
              </p>
              <button
                onClick={openNewSessionForm}
                className="rounded-lg bg-[#1F7A6C] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#19645A]"
              >
                New session
              </button>
            </div>

            {sessionFormOpen && (
              <div className="mb-6 rounded-2xl border border-[#E5E7EB] p-5">
                <p className="mb-4 text-sm font-semibold text-[#1C2321]">
                  {editingId ? "Edit session" : "New session"}
                </p>

                <div className="grid gap-4">
                  <Field label="Title">
                    <input
                      className="input"
                      value={sessionDraft.title}
                      onChange={(e) =>
                        setSessionDraft({ ...sessionDraft, title: e.target.value })
                      }
                      placeholder="e.g. Keynote: The Future of Work"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Track">
                      <input
                        className="input"
                        value={sessionDraft.track}
                        onChange={(e) =>
                          setSessionDraft({ ...sessionDraft, track: e.target.value })
                        }
                        placeholder="e.g. Product"
                      />
                    </Field>
                    <Field label="Room">
                      <input
                        className="input"
                        value={sessionDraft.room}
                        onChange={(e) =>
                          setSessionDraft({ ...sessionDraft, room: e.target.value })
                        }
                        placeholder="e.g. Hall A"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Starts">
                      <input
                        type="datetime-local"
                        className="input"
                        value={sessionDraft.startTime}
                        onChange={(e) =>
                          setSessionDraft({ ...sessionDraft, startTime: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Ends">
                      <input
                        type="datetime-local"
                        className="input"
                        value={sessionDraft.endTime}
                        onChange={(e) =>
                          setSessionDraft({ ...sessionDraft, endTime: e.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Speakers (comma separated)">
                    <input
                      className="input"
                      value={sessionDraft.speakers}
                      onChange={(e) =>
                        setSessionDraft({ ...sessionDraft, speakers: e.target.value })
                      }
                      placeholder="Jane Doe, Sam Lee"
                    />
                  </Field>

                  <Field label="Tags (comma separated)">
                    <input
                      className="input"
                      value={sessionDraft.tags}
                      onChange={(e) =>
                        setSessionDraft({ ...sessionDraft, tags: e.target.value })
                      }
                      placeholder="AI, Design"
                    />
                  </Field>

                  {sessionError && (
                    <p className="text-sm text-[#B14A3F]">{sessionError}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={saveSession}
                      disabled={savingSession}
                      className="rounded-lg bg-[#1C2321] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1F7A6C] disabled:opacity-50"
                    >
                      {savingSession ? "Saving…" : editingId ? "Save changes" : "Create session"}
                    </button>
                    <button
                      onClick={() => setSessionFormOpen(false)}
                      className="rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-semibold text-[#5C6B73] transition hover:bg-[#F4F6F5]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loadingSessions ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl border border-[#E5E7EB]" />
                ))}
              </div>
            ) : sortedSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center">
                <p className="font-semibold text-[#1C2321]">No sessions yet</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Add your first session to build out the program.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedSessions.map((session) => (
                  <div
                    key={session._id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-[#E5E7EB] p-5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1F7A6C]" suppressHydrationWarning>
                        {new Date(session.startTime).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <h3 className="mt-0.5 truncate text-lg font-bold text-[#1C2321]">
                        {session.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9AA5A2]">
                        {session.track && <span>{session.track}</span>}
                        {session.room && (
                          <>
                            <span>·</span>
                            <span>{session.room}</span>
                          </>
                        )}
                        {session.speakers?.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{session.speakers.join(", ")}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openEditSessionForm(session)}
                        className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#5C6B73] transition hover:bg-[#F4F6F5]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSession(session._id)}
                        className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#B14A3F] transition hover:bg-[#B14A3F]/5"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invites tab */}
        {tab === "invites" && (
          <div>
            {event?.joinCode && (
              <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#E5E7EB] p-5">
                <div>
                  <p className="text-sm font-semibold text-[#1C2321]">Join code</p>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    Anyone can enter this on the Events page to join directly.
                  </p>
                </div>
                <button
                  onClick={copyJoinCode}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 font-mono text-sm font-semibold text-[#1C2321] transition hover:bg-[#F4F6F5]"
                >
                  {event.joinCode}
                </button>
              </div>
            )}

            <div className="mb-6 rounded-2xl border border-[#E5E7EB] p-5">
              <p className="mb-3 text-sm font-semibold text-[#1C2321]">
                Invite by email
              </p>
              <textarea
                value={inviteText}
                onChange={(e) => setInviteText(e.target.value)}
                rows={3}
                placeholder="jane@company.com, sam@company.com&#10;(one per line or comma separated)"
                className="input resize-none"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-[#9AA5A2]">
                  {parsedEmails.length > 0
                    ? `${parsedEmails.length} valid address${parsedEmails.length > 1 ? "es" : ""}`
                    : "No valid addresses yet"}
                </span>
                <button
                  onClick={sendInvites}
                  disabled={sendingInvites || parsedEmails.length === 0}
                  className="rounded-lg bg-[#1F7A6C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#19645A] disabled:opacity-50"
                >
                  {sendingInvites ? "Sending…" : "Send invites"}
                </button>
              </div>
              {inviteMessage && (
                <p className="mt-2 text-sm text-[#5C6B73]">{inviteMessage}</p>
              )}
            </div>

            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#9AA5A2]">
              Sent invites
            </p>

            {loadingInvites ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl border border-[#E5E7EB]" />
                ))}
              </div>
            ) : invites.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-8 text-center">
                <p className="text-sm text-[#6B7280]">No invites sent yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB]">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <span className="truncate text-sm text-[#1C2321]">
                      {invite.email}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusPill status={invite.status} />
                      <button
                        onClick={() => revokeInvite(invite.id)}
                        className="text-xs font-semibold text-[#9AA5A2] hover:text-[#B14A3F]"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
          color: #1c2321;
          outline: none;
        }
        .input:focus {
          border-color: #1f7a6c;
          box-shadow: 0 0 0 3px rgba(31, 122, 108, 0.12);
        }
      `}</style>
    </main>
  );
}

export default function OrganizerEventPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading management console...</div>}>
      <OrganizerEventPageContent />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#5C6B73]">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    accepted: "bg-[#1F7A6C]/10 text-[#1F7A6C]",
    pending: "bg-[#C97A1A]/10 text-[#C97A1A]",
    declined: "bg-[#B14A3F]/10 text-[#B14A3F]",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        styles[status] || "bg-[#DEE3E0] text-[#5C6B73]"
      }`}
    >
      {status}
    </span>
  );
}
