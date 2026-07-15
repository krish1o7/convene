




"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

/**
 * ── Organizer dashboard ───────────────────────────────────────
 * Landing page for organizers: every event they run, plus a form to
 * create a new one. Clicking an event goes to its management page
 * (sessions + invites) at /organizer/events/[eventId].
 *
 * Assumed endpoints (adjust to match your API):
 *   GET  /api/organizer/events   -> events this user organizes
 *   POST /api/events             -> create an event, returns the event
 * Same auth pattern as the rest of the app: Bearer token from
 * localStorage.
 */

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

  function authHeaders() {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async function loadEvents() {
    try {
      const res = await api.get("/api/events", authHeaders());
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
      const res = await api.post(
        "/api/events",
        {
          ...draft,
          startDate: new Date(draft.startDate).toISOString(),
          endDate: new Date(draft.endDate).toISOString(),
        },
        authHeaders()
      );
      router.push(`/organizer/events?eventId=${res.data._id}`);
    } catch (err: any) {
  console.log("FULL ERROR:", err);
  console.log("STATUS:", err?.response?.status);
  console.log("DATA:", err?.response?.data);

  setError(
    err?.response?.data?.message ||
    JSON.stringify(err?.response?.data) ||
    "Couldn't create the event."
  );

    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1C2321]">
              Your events
            </h1>
            <p className="mt-1 text-[#6B7280]">
              Schedule sessions and invite attendees to events you run.
            </p>
          </div>
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="shrink-0 rounded-lg bg-[#1F7A6C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#19645A]"
          >
            {formOpen ? "Cancel" : "New event"}
          </button>
        </div>

        {formOpen && (
          <div className="mb-10 rounded-2xl border border-[#E5E7EB] p-5">
            <p className="mb-4 text-sm font-semibold text-[#1C2321]">
              Create an event
            </p>

            <div className="grid gap-4">
              <Field label="Event name">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Product Summit 2026"
                  className="input"
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
                  className="input resize-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Mode">
                  <select
                    value={draft.mode}
                    onChange={(e) => setDraft({ ...draft, mode: e.target.value })}
                    className="input"
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
                    className="input"
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
                    className="input"
                  />
                </Field>
                <Field label="Ends">
                  <input
                    type="datetime-local"
                    value={draft.endDate}
                    onChange={(e) =>
                      setDraft({ ...draft, endDate: e.target.value })
                    }
                    className="input"
                  />
                </Field>
              </div>

              {error && <p className="text-sm text-[#B14A3F]">{error}</p>}

              <button
                onClick={createEvent}
                disabled={saving}
                className="rounded-lg bg-[#1C2321] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1F7A6C] disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create event"}
              </button>
            </div>
          </div>
        )}

        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#9AA5A2]">
          All events
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-[#E5E7EB]" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-10 text-center">
            <p className="font-semibold text-[#1C2321]">No events yet</p>
            <p className="mt-1 text-sm text-[#6B7280]">
              Create your first event to start scheduling sessions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB]">
            {events.map((event) => (
              <button
                key={event._id}
                onClick={() => router.push(`/organizer/events?eventId=${event._id}`)}
                className="flex w-full items-center justify-between gap-6 p-5 text-left transition hover:bg-[#F4F6F5]"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-[#1C2321]">
                    {event.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9AA5A2]">
                    <span suppressHydrationWarning>
                      {new Date(event.startDate).toLocaleDateString()} –{" "}
                      {new Date(event.endDate).toLocaleDateString()}
                    </span>
                    <span>·</span>
                    <span className="capitalize">{event.mode}</span>
                    {event.joinCode && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{event.joinCode}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[#1F7A6C]">
                  Manage →
                </span>
              </button>
            ))}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#5C6B73]">{label}</span>
      {children}
    </label>
  );
}
