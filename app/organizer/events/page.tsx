"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";
import { X, Plus, Check, Users, UserCheck, Sparkles, Search } from "lucide-react";

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

type DirectoryAttendee = {
  id: string;
  name: string;
  headline?: string;
  affiliation?: string;
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
  const [directoryAttendees, setDirectoryAttendees] = useState<DirectoryAttendee[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [sessionDraft, setSessionDraft] = useState(emptySessionDraft);
  const [speakerSearch, setSpeakerSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [inviteText, setInviteText] = useState("");
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      loadEvent();
      loadSessions();
      loadDirectoryAttendees();
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId && tab === "invites" && !invitesLoaded) {
      loadInvites();
    }
  }, [tab, eventId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSessionFormOpen(false);
    }
    if (sessionFormOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [sessionFormOpen]);

  async function loadEvent() {
    try {
      const res = await api.get(`/api/events/${eventId}`);
      setEvent(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const res = await api.get(`/api/events/${eventId}/sessions`);
      setSessions(res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadDirectoryAttendees() {
    try {
      const res = await api.get("/api/network/attendees");
      if (Array.isArray(res.data)) {
        setDirectoryAttendees(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadInvites() {
    setLoadingInvites(true);
    try {
      const res = await api.get(`/api/events/${eventId}/invites`);
      setInvites(res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvites(false);
      setInvitesLoaded(true);
    }
  }

  // Deduplicated list of registered directory people and previous session speakers
  const availableDirectorySpeakers = useMemo(() => {
    const map = new Map<string, { name: string; headline?: string; affiliation?: string }>();

    directoryAttendees.forEach((a) => {
      if (a.name?.trim()) {
        map.set(a.name.trim().toLowerCase(), {
          name: a.name.trim(),
          headline: a.headline,
          affiliation: a.affiliation,
        });
      }
    });

    sessions.forEach((s) => {
      s.speakers?.forEach((sp) => {
        const trimmed = sp.trim();
        if (trimmed && !map.has(trimmed.toLowerCase())) {
          map.set(trimmed.toLowerCase(), { name: trimmed });
        }
      });
    });

    return Array.from(map.values());
  }, [directoryAttendees, sessions]);

  const filteredDirectorySpeakers = useMemo(() => {
    const q = speakerSearch.trim().toLowerCase();
    if (!q) return [];
    return availableDirectorySpeakers.filter((p) =>
      [p.name, p.headline, p.affiliation].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [availableDirectorySpeakers, speakerSearch]);

  function toggleSpeaker(speakerName: string) {
    const currentList = sessionDraft.speakers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const exists = currentList.some(
      (s) => s.toLowerCase() === speakerName.toLowerCase()
    );

    let updated: string[];
    if (exists) {
      updated = currentList.filter(
        (s) => s.toLowerCase() !== speakerName.toLowerCase()
      );
    } else {
      updated = [...currentList, speakerName];
    }

    setSessionDraft({
      ...sessionDraft,
      speakers: updated.join(", "),
    });
  }

  function openNewSessionForm() {
    setEditingId(null);
    setSessionDraft(emptySessionDraft);
    setSpeakerSearch("");
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
    setSpeakerSearch("");
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
          payload
        );
        setSessions((prev) =>
          prev.map((s) => (s._id === editingId ? res.data : s))
        );
      } else {
        const res = await api.post(
          `/api/events/${eventId}/sessions`,
          payload
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
      await api.delete(`/api/events/${eventId}/sessions/${sessionId}`);
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
        { emails: parsedEmails }
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
      await api.delete(`/api/events/${eventId}/invites/${inviteId}`);
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
      <>
        <div className="sticky top-0 z-50 border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
          <Navbar />
        </div>
        <main className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <p className="text-lg font-bold text-white">No Event ID specified.</p>
            <button
              onClick={() => router.push("/organizer")}
              className="rounded-2xl bg-[#2DD4BF] px-5 py-2.5 text-sm font-bold text-[#0D0F12] transition hover:bg-[#14B8A6]"
            >
              Go back to all events
            </button>
          </div>
        </main>
      </>
    );
  }

  const activeSpeakerNames = sessionDraft.speakers
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
        <Navbar />
      </div>
      <main className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] animate-fade-in">
        <div className="mx-auto max-w-3xl px-6 py-10">
          {/* Header */}
          <button
            onClick={() => router.push("/organizer")}
            className="mb-4 text-xs font-bold text-[#2DD4BF] hover:underline flex items-center gap-1"
          >
            ← Back to all events
          </button>

          <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-white">
            {event?.name || "Manage event"}
          </h1>
          {event && (
            <p className="mb-6 text-sm text-[#94A3B8]" suppressHydrationWarning>
              {new Date(event.startDate).toLocaleDateString()} –{" "}
              {new Date(event.endDate).toLocaleDateString()}
            </p>
          )}

          {/* Tabs */}
          <div className="mb-8 flex gap-1 border-b border-[#232833]">
            {(["sessions", "invites"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-5 py-3 text-sm font-bold capitalize transition ${
                  tab === t
                    ? "border-[#2DD4BF] text-white"
                    : "border-transparent text-[#94A3B8] hover:text-white"
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
                <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Schedule ({sessions.length})
                </p>
                <button
                  onClick={openNewSessionForm}
                  className="rounded-2xl bg-[#2DD4BF] px-4 py-2 text-xs font-bold text-[#0D0F12] transition hover:bg-[#14B8A6] shadow-md"
                >
                  + New session
                </button>
              </div>

              {loadingSessions ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-3xl border border-[#232833] bg-[#14171D]" />
                  ))}
                </div>
              ) : sortedSessions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#232833] bg-[#14171D] p-10 text-center space-y-2">
                  <p className="font-bold text-white text-base">No sessions yet</p>
                  <p className="text-xs text-[#94A3B8]">
                    Add your first session to build out the event program schedule.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSessions.map((session) => (
                    <div
                      key={session._id}
                      className="flex items-start justify-between gap-4 rounded-3xl border border-[#232833] bg-[#14171D] p-6 shadow-sm hover:border-[#2DD4BF]/40 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-[#2DD4BF]" suppressHydrationWarning>
                          {new Date(session.startTime).toLocaleString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <h3 className="mt-1 truncate text-lg font-bold text-white">
                          {session.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94A3B8]">
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
                          className="rounded-xl border border-[#232833] bg-[#1E232D] px-3.5 py-1.5 text-xs font-bold text-[#E2E8F0] transition hover:bg-[#282E3B]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSession(session._id)}
                          className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-3.5 py-1.5 text-xs font-bold text-[#EF4444] transition hover:bg-[#EF4444]/20"
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
                <div className="mb-6 flex items-center justify-between rounded-3xl border border-[#232833] bg-[#14171D] p-6 shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-white">Join Code</p>
                    <p className="mt-0.5 text-xs text-[#94A3B8]">
                      Anyone can enter this on the Events page to join directly.
                    </p>
                  </div>
                  <button
                    onClick={copyJoinCode}
                    className="rounded-2xl border border-[#232833] bg-[#1E232D] px-4 py-2 font-mono text-sm font-extrabold text-[#2DD4BF] transition hover:bg-[#282E3B]"
                  >
                    {event.joinCode}
                  </button>
                </div>
              )}

              <div className="mb-6 rounded-3xl border border-[#232833] bg-[#14171D] p-6 shadow-sm space-y-3">
                <p className="text-sm font-bold text-white">
                  Invite Attendees by Email
                </p>
                <textarea
                  value={inviteText}
                  onChange={(e) => setInviteText(e.target.value)}
                  rows={3}
                  placeholder="jane@company.com, sam@company.com&#10;(one per line or comma separated)"
                  className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3.5 text-sm text-white placeholder-[#64748B] resize-none focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8] font-semibold">
                    {parsedEmails.length > 0
                      ? `${parsedEmails.length} valid address${parsedEmails.length > 1 ? "es" : ""}`
                      : "No valid addresses yet"}
                  </span>
                  <button
                    onClick={sendInvites}
                    disabled={sendingInvites || parsedEmails.length === 0}
                    className="rounded-2xl bg-[#2DD4BF] px-5 py-2.5 text-sm font-bold text-[#0D0F12] transition hover:bg-[#14B8A6] disabled:opacity-50 shadow-md"
                  >
                    {sendingInvites ? "Sending…" : "Send Invites"}
                  </button>
                </div>
                {inviteMessage && (
                  <p className="mt-2 text-xs font-semibold text-[#2DD4BF]">{inviteMessage}</p>
                )}
              </div>

              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Sent Invites
              </p>

              {loadingInvites ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl border border-[#232833] bg-[#14171D]" />
                  ))}
                </div>
              ) : invites.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#232833] bg-[#14171D] p-8 text-center">
                  <p className="text-xs text-[#94A3B8]">No invites sent yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#232833] overflow-hidden rounded-3xl border border-[#232833] bg-[#14171D]">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between gap-4 p-4.5"
                    >
                      <span className="truncate text-sm font-semibold text-white">
                        {invite.email}
                      </span>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusPill status={invite.status} />
                        <button
                          onClick={() => revokeInvite(invite.id)}
                          className="text-xs font-bold text-[#94A3B8] hover:text-[#EF4444] transition"
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
      </main>

      {/* Edit / Create Session Pop-Up Modal */}
      {sessionFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-200"
          onClick={() => setSessionFormOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#14171D] p-6 sm:p-8 shadow-2xl border border-[#232833] text-white transition-all duration-200 transform scale-100 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#232833]">
              <h3 className="text-xl font-extrabold text-white">
                {editingId ? "Edit Session Details" : "Create New Session"}
              </h3>
              <button
                onClick={() => setSessionFormOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E232D] text-[#94A3B8] hover:bg-[#282E3B] hover:text-white transition"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid gap-4">
              <Field label="Title">
                <input
                  className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
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
                    className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                    value={sessionDraft.track}
                    onChange={(e) =>
                      setSessionDraft({ ...sessionDraft, track: e.target.value })
                    }
                    placeholder="e.g. Product"
                  />
                </Field>
                <Field label="Room">
                  <input
                    className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
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
                    className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                    value={sessionDraft.startTime}
                    onChange={(e) =>
                      setSessionDraft({ ...sessionDraft, startTime: e.target.value })
                    }
                  />
                </Field>
                <Field label="Ends">
                  <input
                    type="datetime-local"
                    className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                    value={sessionDraft.endTime}
                    onChange={(e) =>
                      setSessionDraft({ ...sessionDraft, endTime: e.target.value })
                    }
                  />
                </Field>
              </div>

              {/* Strict Search-Only Registered Attendees Speaker Selection */}
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#94A3B8]">
                    <span>Assigned Speakers (Registered Attendees Only)</span>
                    <span className="text-[#2DD4BF] font-semibold">{activeSpeakerNames.length} selected</span>
                  </span>
                </label>

                {/* Selected Speaker Chips */}
                <div className="min-h-[48px] rounded-2xl border border-[#232833] bg-[#1E232D] p-3 flex flex-wrap items-center gap-2">
                  {activeSpeakerNames.length > 0 ? (
                    activeSpeakerNames.map((name) => {
                      const attendeeInfo = availableDirectorySpeakers.find(
                        (a) => a.name.toLowerCase() === name.toLowerCase()
                      );
                      const displayName = attendeeInfo ? attendeeInfo.name : name;
                      return (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#2DD4BF] px-3 py-1 text-xs font-extrabold text-[#0D0F12] shadow-xs"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>{displayName}</span>
                          <button
                            type="button"
                            onClick={() => toggleSpeaker(displayName)}
                            className="hover:bg-[#0D0F12]/20 rounded-full p-0.5 transition"
                            aria-label={`Remove ${displayName}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-[#64748B] italic">
                      No registered speakers assigned yet. Search registered attendees below to add.
                    </span>
                  )}
                </div>

                {/* Search Input Field */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#64748B]" />
                  <input
                    type="text"
                    value={speakerSearch}
                    onChange={(e) => setSpeakerSearch(e.target.value)}
                    placeholder="Search registered attendee by name..."
                    className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] pl-10 pr-9 py-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                  />
                  {speakerSearch && (
                    <button
                      type="button"
                      onClick={() => setSpeakerSearch("")}
                      className="absolute right-3.5 top-3.5 text-[#64748B] hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions List for All Registered Attendees */}
                <div className="mt-3 rounded-2xl border border-[#232833] bg-[#1A1F29] p-3 space-y-1 max-h-52 overflow-y-auto shadow-xl">
                  <div className="text-[11px] font-bold text-[#94A3B8] px-2 py-1 flex items-center justify-between border-b border-[#232833] mb-1">
                    <span>{speakerSearch.trim() ? "Search Results" : "All Registered Attendees"}</span>
                    <span className="text-[#2DD4BF] font-semibold">Click to assign speaker</span>
                  </div>
                  {(speakerSearch.trim() ? filteredDirectorySpeakers : availableDirectorySpeakers).length > 0 ? (
                    (speakerSearch.trim() ? filteredDirectorySpeakers : availableDirectorySpeakers).map((person) => {
                      const isSelected = activeSpeakerNames.some(
                        (n) => n.toLowerCase() === person.name.toLowerCase()
                      );
                      return (
                        <div
                          key={person.name}
                          onClick={() => {
                            toggleSpeaker(person.name);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                            isSelected
                              ? "bg-[#2DD4BF]/15 border border-[#2DD4BF]/30 text-[#2DD4BF]"
                              : "hover:bg-[#1E232D] text-white"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{person.name}</p>
                            {(person.headline || person.affiliation) && (
                              <p className="text-[11px] text-[#94A3B8] truncate">
                                {[person.headline, person.affiliation].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          {isSelected ? (
                            <span className="text-[11px] font-bold text-[#2DD4BF] flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Speaker Added
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-[#2DD4BF] flex items-center gap-1">
                              <Plus className="h-3.5 w-3.5" /> Add as Speaker
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-xs text-[#94A3B8]">
                      No matching registered attendees found.
                    </div>
                  )}
                </div>
              </div>

              <Field label="Tags (comma separated)">
                <input
                  className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                  value={sessionDraft.tags}
                  onChange={(e) =>
                    setSessionDraft({ ...sessionDraft, tags: e.target.value })
                  }
                  placeholder="AI, Design"
                />
              </Field>

              {sessionError && (
                <p className="text-sm font-semibold text-[#EF4444]">{sessionError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveSession}
                  disabled={savingSession}
                  className="flex-1 rounded-2xl bg-[#2DD4BF] py-3 text-sm font-bold text-[#0D0F12] transition hover:bg-[#14B8A6] disabled:opacity-50 shadow-md"
                >
                  {savingSession ? "Saving…" : editingId ? "Save Changes" : "Create Session"}
                </button>
                <button
                  onClick={() => setSessionFormOpen(false)}
                  className="rounded-2xl border border-[#232833] bg-[#1E232D] px-5 py-3 text-sm font-semibold text-[#94A3B8] transition hover:bg-[#282E3B] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function OrganizerEventPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#94A3B8]">Loading management console...</div>}>
      <OrganizerEventPageContent />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[#94A3B8]">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    accepted: "bg-[#2DD4BF]/15 border border-[#2DD4BF]/30 text-[#2DD4BF]",
    pending: "bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]",
    declined: "bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]",
  };
  return (
    <span
      className={`rounded-full px-3 py-0.5 text-xs font-bold capitalize ${
        styles[status] || "bg-[#1E232D] text-[#94A3B8]"
      }`}
    >
      {status}
    </span>
  );
}
