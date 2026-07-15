
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";

/**
 * ── Networking ────────────────────────────────────────────────
 * One page, three views on the same idea: the people at this event.
 *   · Directory   — everyone you can meet
 *   · Connections — people you've already met
 *   · Requests    — people who've asked to meet you
 *
 * Design notes:
 *  - Palette: ink #1C2321, paper #F4F6F5, teal #1F7A6C (connect / live),
 *    amber #C97A1A (pending / attention), hairline #DEE3E0.
 *  - Signature element: attendees render as event "badges" — an initials
 *    chip plus a torn/perforated edge — rather than generic avatar cards.
 *  - Add a distinctive display font in app/layout.tsx via next/font if
 *    you want the headline treatment to go further (e.g. Fraunces / 
 *    Space Grotesk). This file sticks to Tailwind defaults so it drops
 *    in without extra setup.
 */

// ---------- Types ----------

type ConnectionState = "none" | "pending" | "connected" | "incoming";

type Attendee = {
  id: string;
  name: string;
  headline?: string;
  affiliation?: string;
  interests?: string[];
  connection?: any;
};

type ConnectionItem = {
  id?: string;
  _id?: string;
  status?: string;
  name?: string;
  headline?: string;
  affiliation?: string;
  user?: Partial<Attendee>;
  peer?: Partial<Attendee>;
  [key: string]: any;
};

type RequestItem = {
  id: string;
  status?: string;
  name?: string;
  headline?: string;
  affiliation?: string;
  requester?: Partial<Attendee>;
  sender?: Partial<Attendee>;
  from?: Partial<Attendee>;
  [key: string]: any;
};

type Tab = "directory" | "connections" | "requests";

type Toast = { kind: "success" | "error"; message: string } | null;

// ---------- Helpers ----------

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

function authHeaders() {
  return { headers: { Authorization: `Bearer ${getToken()}` } };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const BADGE_COLORS = [
  { bg: "#1F7A6C", fg: "#FFFFFF" }, // teal
  { bg: "#2C3E50", fg: "#FFFFFF" }, // navy
  { bg: "#C97A1A", fg: "#FFFFFF" }, // amber
  { bg: "#8A4A6B", fg: "#FFFFFF" }, // plum
];

function badgeColor(name: string) {
  const sum = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return BADGE_COLORS[sum % BADGE_COLORS.length];
}

function connectionState(attendee: Attendee): ConnectionState {
  const c = attendee.connection;
  if (!c) return "none";
  if (typeof c === "string") return (c as ConnectionState) || "none";
  if (typeof c === "object" && c.status) return c.status as ConnectionState;
  return "none";
}

// Pull a display name out of whatever shape a connection/request came back as.
function personFrom(item: ConnectionItem | RequestItem): {
  name: string;
  headline?: string;
  affiliation?: string;
} {
  const nested =
    (item as any).person ??
    (item as any).user ??
    (item as any).peer ??
    (item as any).requester ??
    (item as any).sender ??
    (item as any).from ??
    {};
  return {
    name: item.name ?? nested.name ?? "Unnamed attendee",
    headline: item.headline ?? nested.headline,
    affiliation: item.affiliation ?? nested.affiliation,
  };
}

// ---------- Component ----------

export default function NetworkPage() {
  const [tab, setTab] = useState<Tab>("directory");
  const [toast, setToast] = useState<Toast>(null);

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeesLoaded, setAttendeesLoaded] = useState(false);
  const [loadingAttendees, setLoadingAttendees] = useState(true);

  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [followers, setFollowers] = useState<any[]>([]);
const [following, setFollowing] = useState<any[]>([]);

  const [query, setQuery] = useState("");

  //following
  async function loadFollowers() {
  try {
    const res = await api.get(
      "/api/network/followers",
      authHeaders()
    );

    setFollowers(res.data ?? []);
  } catch (err) {
    console.error(err);
  }
}

async function loadFollowing() {
  try {
    const res = await api.get(
      "/api/network/following",
      authHeaders()
    );

    setFollowing(res.data ?? []);
  } catch (err) {
    console.error(err);
  }
}

  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  // Directory loads immediately; the other two load the first time their tab opens.
  useEffect(() => {
    loadAttendees();
  }, []);

  useEffect(() => {
    if (tab === "connections" && !connectionsLoaded) loadConnections();
    if (tab === "requests" && !requestsLoaded) loadRequests();
  }, [tab]);

  async function loadAttendees() {
    setLoadingAttendees(true);
    try {
      const res = await api.get("/api/network/attendees", authHeaders());
      setAttendees(res.data ?? []);
    } catch (err) {
      console.error(err);
      showToast("error", "Couldn't load the attendee directory. Try again.");
    } finally {
      setLoadingAttendees(false);
      setAttendeesLoaded(true);
    }
  }

  async function loadConnections() {
    setLoadingConnections(true);
    try {
      const res = await api.get("/api/network/connections", authHeaders());
      const mapped = (res.data ?? []).map((item: any) => ({
        ...item,
        id: item.connectionId || item.id || item._id,
      }));
      setConnections(mapped);
    } catch (err) {
      console.error(err);
      showToast("error", "Couldn't load your connections. Try again.");
    } finally {
      setLoadingConnections(false);
      setConnectionsLoaded(true);
    }
  }

  async function loadRequests() {
    setLoadingRequests(true);
    try {
      const res = await api.get("/api/network/requests", authHeaders());
      const mapped = (res.data ?? []).map((item: any) => ({
        ...item,
        id: item.connectionId || item.id || item._id,
      }));
      setRequests(mapped);
    } catch (err) {
      console.error(err);
      showToast("error", "Couldn't load pending requests. Try again.");
    } finally {
      setLoadingRequests(false);
      setRequestsLoaded(true);
    }
  }

  async function connect(attendee: Attendee) {
    // optimistic: mark as pending right away
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === attendee.id ? { ...a, connection: { status: "pending" } } : a
      )
    );
    try {
      await api.post(
        "/api/network/connections",
        { recipientId: attendee.id },
        authHeaders()
      );
      showToast("success", `Request sent to ${attendee.name}.`);
    } catch (err) {
      console.error(err);
      // revert on failure
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendee.id ? { ...a, connection: null } : a
        )
      );
      showToast("error", `Couldn't send a request to ${attendee.name}.`);
    }
  }

  async function respond(request: RequestItem, status: "accepted" | "rejected") {
    // optimistic: drop it from the pending list immediately
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    try {
      await api.post(
        `/api/network/connections/${request.id}/respond`,
        { status },
        authHeaders()
      );
      const { name } = personFrom(request);
      showToast(
        "success",
        status === "accepted" ? `Connected with ${name}.` : `Declined ${name}.`
      );
      if (status === "accepted") {
        setConnectionsLoaded(false); // refresh next time that tab is opened
      }
    } catch (err) {
      console.error(err);
      setRequests((prev) => [request, ...prev]);
      showToast("error", "Couldn't record that response. Try again.");
    }
  }

  const filteredAttendees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter((a) => {
      const haystack = [a.name, a.headline, a.affiliation, ...(a.interests ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [attendees, query]);

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#DEE3E0] bg-white/90 backdrop-blur">
        <Navbar />
      </div>
      <main className="min-h-screen bg-[#F4F6F5]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mt-4 flex gap-8">
  <div>
    <p className="text-xl font-bold">{connections.length}</p>
    <p className="text-sm text-[#5C6B73]">Followers</p>
  </div>

  <div>
    <p className="text-xl font-bold">{following.length}</p>
    <p className="text-sm text-[#5C6B73]">Following</p>
  </div>
</div>
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1F7A6C]">
            Attendees
          </p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#1C2321]">
            Networking
          </h1>
          <p className="mt-2 max-w-xl text-[#5C6B73]">
            Find people worth meeting, keep track of who you've connected
            with, and respond to requests headed your way.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 border-b border-[#DEE3E0]">
          <TabButton
            label="Directory"
            count={attendeesLoaded ? attendees.length : undefined}
            active={tab === "directory"}
            onClick={() => setTab("directory")}
          />
          <TabButton
            label="Connections"
            count={connectionsLoaded ? connections.length : undefined}
            active={tab === "connections"}
            onClick={() => setTab("connections")}
          />
          <TabButton
            label="Requests"
            count={requestsLoaded ? requests.length : undefined}
            active={tab === "requests"}
            onClick={() => setTab("requests")}
            highlight={requestsLoaded && requests.length > 0}
          />
        </div>

        {/* Directory */}
        {tab === "directory" && (
          <div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, role, or interest"
              className="mb-6 w-full rounded-xl border border-[#DEE3E0] bg-white px-4 py-3 text-[#1C2321] outline-none placeholder:text-[#9AA5A2] focus:border-[#1F7A6C] focus:ring-2 focus:ring-[#1F7A6C]/20"
            />

            {loadingAttendees ? (
              <SkeletonGrid />
            ) : filteredAttendees.length === 0 ? (
              <EmptyState
                title={attendees.length === 0 ? "No attendees yet" : "No matches"}
                body={
                  attendees.length === 0
                    ? "The directory will fill in as people register."
                    : "Try a different name, role, or interest."
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredAttendees.map((person) => (
                  <AttendeeBadge
                    key={person.id}
                    attendee={person}
                    onConnect={() => connect(person)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connections */}
        {tab === "connections" && (
          <div>
            {loadingConnections ? (
              <SkeletonGrid />
            ) : connections.length === 0 ? (
              <EmptyState
                title="No connections yet"
                body="Head to the directory and send a request to get started."
              />
            ) : (
              <div className="grid gap-3">
                {connections.map((item, i) => {
                  const p = personFrom(item);
                  return (
                    <div
                      key={item.id ?? item._id ?? i}
                      className="flex items-center gap-4 rounded-xl border border-[#DEE3E0] bg-white p-4"
                    >
                      <InitialsChip name={p.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#1C2321]">
                          {p.name}
                        </p>
                        {p.headline && (
                          <p className="truncate text-sm text-[#5C6B73]">
                            {p.headline}
                          </p>
                        )}
                        {p.affiliation && (
                          <p className="truncate text-xs text-[#9AA5A2]">
                            {p.affiliation}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-[#1F7A6C]/10 px-3 py-1 text-xs font-semibold text-[#1F7A6C]">
                        Connected
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Requests */}
        {tab === "requests" && (
          <div>
            {loadingRequests ? (
              <SkeletonGrid />
            ) : requests.length === 0 ? (
              <EmptyState
                title="No pending requests"
                body="You'll see it here the moment someone wants to connect."
              />
            ) : (
              <div className="grid gap-3">
                {requests.map((request) => {
                  const p = personFrom(request);
                  return (
                    <div
                   key={`${request._id || request.id || Math.random()}`}
                      className="flex items-center gap-4 rounded-xl border border-[#C97A1A]/30 bg-[#C97A1A]/5 p-4"
                    >
                      <InitialsChip name={p.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#1C2321]">
                          {p.name}
                        </p>
                        {p.headline && (
                          <p className="truncate text-sm text-[#5C6B73]">
                            {p.headline}
                          </p>
                        )}
                        {p.affiliation && (
                          <p className="truncate text-xs text-[#9AA5A2]">
                            {p.affiliation}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => respond(request, "accepted")}
                          className="rounded-lg bg-[#1F7A6C] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#19645A]"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respond(request, "rejected")}
                          className="rounded-lg border border-[#DEE3E0] bg-white px-3 py-2 text-sm font-semibold text-[#5C6B73] transition hover:border-[#C97A1A]/40 hover:text-[#C97A1A]"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "success" ? "bg-[#1F7A6C]" : "bg-[#B14A3F]"
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
    </>
  );
}

// ---------- Subcomponents ----------

function TabButton({
  label,
  count,
  active,
  onClick,
  highlight,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative -mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-[#1F7A6C] text-[#1C2321]"
          : "border-transparent text-[#5C6B73] hover:text-[#1C2321]"
      }`}
    >
      {label}
      {typeof count === "number" && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            highlight
              ? "bg-[#C97A1A] text-white"
              : "bg-[#DEE3E0] text-[#5C6B73]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function InitialsChip({ name }: { name: string }) {
  const color = badgeColor(name);
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={{ backgroundColor: color.bg, color: color.fg }}
    >
      {initials(name)}
    </div>
  );
}

function AttendeeBadge({
  attendee,
  onConnect,
}: {
  attendee: Attendee;
  onConnect: () => void;
}) {
  const state = connectionState(attendee);
  const color = badgeColor(attendee.name);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#DEE3E0] bg-white p-5">
      {/* perforated "badge" edge */}
      <div
        className="absolute left-0 right-0 top-0 h-1.5"
        style={{ backgroundColor: color.bg }}
      />
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold"
          style={{ backgroundColor: color.bg, color: color.fg }}
        >
          {initials(attendee.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-[#1C2321]">
            {attendee.name}
          </h3>
          {attendee.headline && (
            <p className="truncate text-sm text-[#5C6B73]">
              {attendee.headline}
            </p>
          )}
          {attendee.affiliation && (
            <p className="truncate text-xs text-[#9AA5A2]">
              {attendee.affiliation}
            </p>
          )}
        </div>
      </div>

      {attendee.interests && attendee.interests.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {attendee.interests.map((interest) => (
            <span
              key={interest}
              className="rounded-full bg-[#F4F6F5] px-3 py-1 text-xs font-medium text-[#5C6B73]"
            >
              {interest}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        {state === "connected" ? (
          <span className="inline-flex rounded-lg bg-[#1F7A6C]/10 px-3 py-2 text-sm font-semibold text-[#1F7A6C]">
            Connected
          </span>
        ) : state === "pending" ? (
          <span className="inline-flex rounded-lg bg-[#C97A1A]/10 px-3 py-2 text-sm font-semibold text-[#C97A1A]">
            Request sent
          </span>
        ) : state === "incoming" ? (
          <span className="inline-flex rounded-lg bg-[#C97A1A]/10 px-3 py-2 text-sm font-semibold text-[#C97A1A]">
            Wants to connect — check Requests
          </span>
        ) : (
          <button
            onClick={onConnect}
            className="rounded-lg bg-[#1F7A6C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#19645A]"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#DEE3E0] bg-white/60 p-12 text-center">
      <h2 className="text-lg font-bold text-[#1C2321]">{title}</h2>
      <p className="mt-2 text-sm text-[#5C6B73]">{body}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl border border-[#DEE3E0] bg-white"
        />
      ))}
    </div>
  );
}
