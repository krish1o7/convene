"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";

type OrganizedEvent = {
  _id: string;
  name: string;
  description: string;
  mode: string;
  locationName: string;
  timezone: string;
  startDate: string;
  endDate: string;
  joinCode: string;
};

const emptyDraft = {
  name: "",
  description: "",
  mode: "in-person",
  locationName: "",
  timezone: "UTC",
  startDate: "",
  endDate: "",
};

export default function OrganizerDashboardPage() {
  const router = useRouter();

  const [events, setEvents] = useState<OrganizedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
    setDraft((prev) => ({
      ...prev,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
  }, []);

  async function loadEvents() {
    try {
      const res = await api.get("/api/events");
      setEvents(res.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createEvent() {
    if (!draft.name.trim() || !draft.startDate || !draft.endDate) {
      setError("Name, start date, and end date are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await api.post("/api/events", {
        ...draft,
        startDate: new Date(draft.startDate).toISOString(),
        endDate: new Date(draft.endDate).toISOString(),
      });
      router.push(`/organizer/events?eventId=${res.data._id}`);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        "Couldn't create the event."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
        <Navbar />
      </div>
      <main className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] animate-fade-in">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <div className="mb-10 flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
                Organizer Portal
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
                Your Events
              </h1>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Schedule sessions, manage speakers, and invite attendees to your events.
              </p>
            </div>
            <button
              onClick={() => setFormOpen((v) => !v)}
              className="shrink-0 rounded-2xl bg-[#2DD4BF] px-5 py-2.5 text-sm font-extrabold text-[#0D0F12] transition hover:bg-[#14B8A6] shadow-md"
            >
              {formOpen ? "Cancel" : "+ New Event"}
            </button>
          </div>

          {formOpen && (
            <div className="mb-10 rounded-3xl border border-[#232833] bg-[#14171D] p-6 shadow-xl space-y-4">
              <p className="text-base font-extrabold text-white pb-2 border-b border-[#232833]">
                Create a New Event
              </p>

              <div className="grid gap-4">
                <Field label="Event name">
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. AI & Tech Summit 2026"
                    className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    value={draft.description}
                    onChange={(e) =>
                      setDraft({ ...draft, description: e.target.value })
                    }
                    rows={3}
                    placeholder="What's this event about?"
                    className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white placeholder-[#64748B] resize-none focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Mode">
                    <select
                      value={draft.mode}
                      onChange={(e) => setDraft({ ...draft, mode: e.target.value })}
                      className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                    >
                      <option value="in-person">In-person</option>
                      <option value="virtual">Virtual</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </Field>

                  <Field label="Location">
                    <input
                      value={draft.locationName}
                      onChange={(e) =>
                        setDraft({ ...draft, locationName: e.target.value })
                      }
                      placeholder="City, venue, or link"
                      className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Starts">
                    <input
                      type="datetime-local"
                      value={draft.startDate}
                      onChange={(e) =>
                        setDraft({ ...draft, startDate: e.target.value })
                      }
                      className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                    />
                  </Field>
                  <Field label="Ends">
                    <input
                      type="datetime-local"
                      value={draft.endDate}
                      onChange={(e) =>
                        setDraft({ ...draft, endDate: e.target.value })
                      }
                      className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/30"
                    />
                  </Field>
                </div>

                {error && <p className="text-sm font-semibold text-[#EF4444]">{error}</p>}

                <button
                  onClick={createEvent}
                  disabled={saving}
                  className="w-full rounded-2xl bg-[#2DD4BF] py-3 text-sm font-extrabold text-[#0D0F12] transition hover:bg-[#14B8A6] disabled:opacity-50 shadow-md"
                >
                  {saving ? "Creating…" : "Create Event"}
                </button>
              </div>
            </div>
          )}

          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            Organized Events
          </p>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-3xl border border-[#232833] bg-[#14171D]" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#232833] bg-[#14171D] p-10 text-center space-y-2">
              <p className="font-bold text-white text-base">No events created yet</p>
              <p className="text-xs text-[#94A3B8]">
                Create your first event above to start scheduling sessions and inviting attendees.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#232833] overflow-hidden rounded-3xl border border-[#232833] bg-[#14171D] shadow-sm">
              {events.map((event) => (
                <button
                  key={event._id}
                  onClick={() => router.push(`/organizer/events?eventId=${event._id}`)}
                  className="group flex w-full items-center justify-between gap-6 p-6 text-left transition hover:bg-[#1E232D]/70"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-white group-hover:text-[#2DD4BF] transition">
                      {event.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94A3B8]">
                      <span suppressHydrationWarning>
                        {new Date(event.startDate).toLocaleDateString()} –{" "}
                        {new Date(event.endDate).toLocaleDateString()}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{event.mode}</span>
                      {event.joinCode && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[#2DD4BF] font-semibold">{event.joinCode}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-[#2DD4BF] group-hover:translate-x-1 transition-transform">
                    Manage →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
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
