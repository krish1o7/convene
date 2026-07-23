"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  Building,
  Briefcase,
  Tag,
  X,
  Check,
  UserX,
  ArrowRight,
  Filter,
  Globe,
  Mail,
  User
} from "lucide-react";

type ConnectionState = "none" | "pending" | "connected" | "incoming";

type Attendee = {
  id: string;
  name: string;
  email?: string;
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
  email?: string;
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
  email?: string;
  headline?: string;
  affiliation?: string;
  requester?: Partial<Attendee>;
  sender?: Partial<Attendee>;
  from?: Partial<Attendee>;
  [key: string]: any;
};

type Tab = "directory" | "connections" | "requests";

type Toast = { kind: "success" | "error"; message: string } | null;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const BADGE_GRADIENTS = [
  { from: "#2DD4BF", to: "#06B6D4", text: "#0D0F12", ring: "ring-[#2DD4BF]/30" }, // Teal to Cyan
  { from: "#3B82F6", to: "#6366F1", text: "#FFFFFF", ring: "ring-[#3B82F6]/30" }, // Blue to Indigo
  { from: "#F59E0B", to: "#F97316", text: "#0D0F12", ring: "ring-[#F59E0B]/30" }, // Amber to Orange
  { from: "#EC4899", to: "#8B5CF6", text: "#FFFFFF", ring: "ring-[#EC4899]/30" }, // Pink to Purple
  { from: "#10B981", to: "#059669", text: "#FFFFFF", ring: "ring-[#10B981]/30" }, // Emerald
];

function badgeStyle(name: string) {
  const sum = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return BADGE_GRADIENTS[sum % BADGE_GRADIENTS.length];
}

function connectionState(attendee: Attendee): ConnectionState {
  const c = attendee.connection;
  if (!c) return "none";
  if (typeof c === "string") return (c as ConnectionState) || "none";
  if (typeof c === "object" && c.status) return c.status as ConnectionState;
  return "none";
}

function personFrom(item: ConnectionItem | RequestItem): Attendee {
  const nested =
    (item as any).person ??
    (item as any).user ??
    (item as any).peer ??
    (item as any).requester ??
    (item as any).sender ??
    (item as any).from ??
    {};
  const nameStr = item.name ?? nested.name ?? "Unnamed attendee";
  return {
    id: item.id ?? item._id ?? nested.id ?? nested._id ?? nameStr,
    name: nameStr,
    email: item.email ?? nested.email ?? `${nameStr.toLowerCase().replace(/[^a-z0-9]/g, "")}@convene.org`,
    headline: item.headline ?? nested.headline,
    affiliation: item.affiliation ?? nested.affiliation,
    interests: item.interests ?? nested.interests ?? [],
    connection: item.connection ?? nested.connection,
  };
}

function getProfileEmail(profile: Attendee | null): string {
  if (!profile) return "";
  if (profile.email && profile.email.includes("@") && !profile.email.endsWith("@convene.org")) {
    return profile.email;
  }
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const u = JSON.parse(storedUser);
      if (u.email) {
        const uName = (u.name || "").toLowerCase().trim();
        const pName = (profile.name || "").toLowerCase().trim();
        if (
          (u._id && (profile.id === u._id || profile.id === u.id)) ||
          (uName && (pName === uName || pName.includes(uName) || uName.includes(pName)))
        ) {
          return u.email;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return profile.email || `${profile.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@convene.org`;
}

const QUICK_TAGS = ["All", "AI & ML", "Design Systems", "Web Dev", "AR/VR", "Product", "Security"];

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
  const [activeTag, setActiveTag] = useState("All");

  // Selected Profile Modal State
  const [selectedProfile, setSelectedProfile] = useState<Attendee | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  async function loadFollowers() {
    try {
      const res = await api.get("/api/network/followers");
      setFollowers(res.data ?? []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFollowing() {
    try {
      const res = await api.get("/api/network/following");
      setFollowing(res.data ?? []);
    } catch (err) {
      console.error(err);
    }
  }

  function showToast(kind: "success" | "error", message: string) {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  useEffect(() => {
    loadAttendees();
    loadFollowers();
    loadFollowing();
  }, []);

  useEffect(() => {
    if (tab === "connections" && !connectionsLoaded) loadConnections();
    if (tab === "requests" && !requestsLoaded) loadRequests();
  }, [tab]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsProfileModalOpen(false);
    }
    if (isProfileModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isProfileModalOpen]);

  async function loadAttendees() {
    setLoadingAttendees(true);
    try {
      const res = await api.get("/api/network/attendees");
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
      const res = await api.get("/api/network/connections");
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
      const res = await api.get("/api/network/requests");
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
    setAttendees((prev) =>
      prev.map((a) =>
        a.id === attendee.id ? { ...a, connection: { status: "pending" } } : a
      )
    );
    if (selectedProfile?.id === attendee.id) {
      setSelectedProfile({ ...selectedProfile, connection: { status: "pending" } });
    }
    try {
      await api.post("/api/network/connections", { recipientId: attendee.id });
      showToast("success", `Request sent to ${attendee.name}.`);
    } catch (err) {
      console.error(err);
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendee.id ? { ...a, connection: null } : a
        )
      );
      if (selectedProfile?.id === attendee.id) {
        setSelectedProfile({ ...selectedProfile, connection: null });
      }
      showToast("error", `Couldn't send a request to ${attendee.name}.`);
    }
  }

  async function respond(request: RequestItem, status: "accepted" | "rejected") {
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    try {
      await api.post(`/api/network/connections/${request.id}/respond`, { status });
      const p = personFrom(request);
      showToast(
        "success",
        status === "accepted" ? `Connected with ${p.name}.` : `Declined ${p.name}.`
      );
      if (status === "accepted") {
        setConnectionsLoaded(false);
      }
      if (selectedProfile && selectedProfile.id === p.id) {
        setSelectedProfile({
          ...selectedProfile,
          connection: status === "accepted" ? "connected" : null,
        });
      }
    } catch (err) {
      console.error(err);
      setRequests((prev) => [request, ...prev]);
      showToast("error", "Couldn't record that response. Try again.");
    }
  }

  const filteredAttendees = useMemo(() => {
    let result = attendees;

    if (activeTag !== "All") {
      const tagLower = activeTag.toLowerCase();
      result = result.filter((a) => {
        const text = [a.name, a.headline, a.affiliation, ...(a.interests ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(tagLower);
      });
    }

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((a) => {
        const haystack = [a.name, a.headline, a.affiliation, ...(a.interests ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return result;
  }, [attendees, query, activeTag]);

  function openProfileModal(attendee: Attendee) {
    setSelectedProfile(attendee);
    setIsProfileModalOpen(true);
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] animate-fade-in pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
          
          {/* Header Banner */}
          <div className="rounded-3xl border border-[#232833] bg-[#14171D] p-6 sm:p-8 shadow-xl">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#2DD4BF] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Attendee Community
                </span>
                <span className="h-1 w-1 rounded-full bg-[#232833]" />
                <span className="text-xs text-[#94A3B8] font-semibold">Convene 2026</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Network & Connections
              </h1>
              <p className="text-sm text-[#94A3B8] max-w-xl leading-relaxed">
                Discover fellow conference attendees, expand your professional circle, and view attendee profiles in real time.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#232833] pb-1">
            <TabButton
              label="Attendee Directory"
              icon={<Users className="h-4 w-4" />}
              count={attendeesLoaded ? attendees.length : undefined}
              active={tab === "directory"}
              onClick={() => setTab("directory")}
            />
            <TabButton
              label="My Connections"
              icon={<UserCheck className="h-4 w-4" />}
              count={connectionsLoaded ? connections.length : undefined}
              active={tab === "connections"}
              onClick={() => setTab("connections")}
            />
            <TabButton
              label="Pending Requests"
              icon={<UserPlus className="h-4 w-4" />}
              count={requestsLoaded ? requests.length : undefined}
              active={tab === "requests"}
              onClick={() => setTab("requests")}
              highlight={requestsLoaded && requests.length > 0}
            />
          </div>

          {/* Directory Tab */}
          {tab === "directory" && (
            <div className="space-y-6">
              {/* Search Bar & Quick Filter Chips */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#64748B]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search attendees by name, title, company, or interest tags..."
                    className="w-full rounded-2xl border border-[#232833] bg-[#14171D] pl-11 pr-10 py-3.5 text-sm text-white outline-none placeholder:text-[#64748B] focus:border-[#2DD4BF] focus:ring-2 focus:ring-[#2DD4BF]/20 transition"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-3.5 top-3.5 text-[#64748B] hover:text-white transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Quick Topic Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <span className="text-xs font-bold text-[#64748B] shrink-0 flex items-center gap-1 mr-1">
                    <Filter className="h-3 w-3" /> Quick Filter:
                  </span>
                  {QUICK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(tag)}
                      className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-bold transition border ${
                        activeTag === tag
                          ? "bg-[#2DD4BF] text-[#0D0F12] border-[#2DD4BF]"
                          : "bg-[#14171D] text-[#94A3B8] border-[#232833] hover:border-[#2DD4BF]/40 hover:text-white"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {loadingAttendees ? (
                <SkeletonGrid />
              ) : filteredAttendees.length === 0 ? (
                <EmptyState
                  title={attendees.length === 0 ? "No attendees in directory yet" : "No matching attendees found"}
                  body={
                    attendees.length === 0
                      ? "The attendee directory will fill in as attendees register for the event."
                      : "Try adjusting your search keywords or switching filter categories."
                  }
                />
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {filteredAttendees.map((person) => (
                    <AttendeeBadge
                      key={person.id}
                      attendee={person}
                      onConnect={() => connect(person)}
                      onViewProfile={() => openProfileModal(person)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Connections Tab */}
          {tab === "connections" && (
            <div>
              {loadingConnections ? (
                <SkeletonGrid />
              ) : connections.length === 0 ? (
                <EmptyState
                  title="No connections saved yet"
                  body="Browse the attendee directory to discover peers and send your first connection request!"
                />
              ) : (
                <div className="grid gap-3">
                  {connections.map((item, i) => {
                    const p = personFrom(item);
                    return (
                      <div
                        key={item.id ?? item._id ?? i}
                        onClick={() => openProfileModal(p)}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#232833] bg-[#14171D] p-5 shadow-sm hover:border-[#2DD4BF]/40 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <InitialsChip name={p.name} />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="truncate font-extrabold text-white text-base group-hover:text-[#2DD4BF] transition">
                              {p.name}
                            </p>
                            {p.headline && (
                              <p className="truncate text-xs text-[#94A3B8] font-medium flex items-center gap-1.5">
                                <Briefcase className="h-3 w-3 text-[#2DD4BF] shrink-0" />
                                {p.headline}
                              </p>
                            )}
                            {p.affiliation && (
                              <p className="truncate text-xs text-[#64748B] flex items-center gap-1.5">
                                <Building className="h-3 w-3 text-[#64748B] shrink-0" />
                                {p.affiliation}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2DD4BF]/15 border border-[#2DD4BF]/30 px-3.5 py-1.5 text-xs font-bold text-[#2DD4BF]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Connected
                          </span>
                          <span className="text-xs font-bold text-[#64748B] group-hover:text-[#2DD4BF] transition flex items-center gap-1">
                            Profile <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {tab === "requests" && (
            <div>
              {loadingRequests ? (
                <SkeletonGrid />
              ) : requests.length === 0 ? (
                <EmptyState
                  title="No pending connection requests"
                  body="When another attendee sends you a request to connect, it will highlight here."
                />
              ) : (
                <div className="grid gap-3">
                  {requests.map((request) => {
                    const p = personFrom(request);
                    return (
                      <div
                        key={request.id || request._id || p.name}
                        onClick={() => openProfileModal(p)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#F59E0B]/40 bg-gradient-to-r from-[#F59E0B]/15 to-[#14171D] p-5 shadow-lg cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <InitialsChip name={p.name} />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="truncate font-extrabold text-white text-base">
                              {p.name}
                            </p>
                            {p.headline && (
                              <p className="truncate text-xs text-[#94A3B8]">
                                {p.headline}
                              </p>
                            )}
                            {p.affiliation && (
                              <p className="truncate text-xs text-[#64748B]">
                                {p.affiliation}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center shrink-0 gap-2.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => respond(request, "accepted")}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#2DD4BF] px-4 py-2.5 text-xs font-bold text-[#0D0F12] transition hover:bg-[#14B8A6] shadow-md"
                          >
                            <Check className="h-4 w-4" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => respond(request, "rejected")}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-[#232833] bg-[#1E232D] px-4 py-2.5 text-xs font-semibold text-[#94A3B8] transition hover:text-[#EF4444] hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10"
                          >
                            <UserX className="h-4 w-4" />
                            <span>Decline</span>
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

        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 flex items-center gap-2.5 rounded-2xl px-5 py-3.5 text-xs font-extrabold shadow-2xl z-50 animate-bounce ${
              toast.kind === "success"
                ? "bg-[#2DD4BF] text-[#0D0F12]"
                : "bg-[#EF4444] text-white"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}
      </main>

      {/* Attendee Profile Pop-Up Modal */}
      {isProfileModalOpen && selectedProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-200"
          onClick={() => setIsProfileModalOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#14171D] p-6 sm:p-8 shadow-2xl border border-[#232833] text-white transition-all duration-200 transform scale-100 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Accent Header */}
            {(() => {
              const style = badgeStyle(selectedProfile.name);
              const state = connectionState(selectedProfile);
              return (
                <>
                  <div
                    className="absolute left-0 right-0 top-0 h-2"
                    style={{
                      background: `linear-gradient(90deg, ${style.from}, ${style.to})`,
                    }}
                  />

                  {/* Close button */}
                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#1E232D] text-[#94A3B8] hover:bg-[#282E3B] hover:text-white transition"
                    aria-label="Close dialog"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Profile Header Info */}
                  <div className="flex items-start gap-5 pt-2">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black shadow-lg ring-4 ${style.ring}`}
                      style={{
                        background: `linear-gradient(135deg, ${style.from}, ${style.to})`,
                        color: style.text,
                      }}
                    >
                      {initials(selectedProfile.name)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h2 className="text-2xl font-extrabold text-white">
                        {selectedProfile.name}
                      </h2>
                      {selectedProfile.headline ? (
                        <p className="text-sm text-[#2DD4BF] font-semibold flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4 shrink-0" />
                          <span>{selectedProfile.headline}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-[#94A3B8] italic">Conference Attendee</p>
                      )}

                      <p className="text-xs text-[#94A3B8] font-medium flex items-center gap-1.5 pt-0.5">
                        <Mail className="h-3.5 w-3.5 text-[#2DD4BF] shrink-0" />
                        <span className="truncate">
                          {getProfileEmail(selectedProfile)}
                        </span>
                      </p>

                      {selectedProfile.affiliation && (
                        <p className="text-xs text-[#94A3B8] flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                          <span>{selectedProfile.affiliation}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Details Card Content */}
                  <div className="space-y-5 pt-4 border-t border-[#232833]">
                    
                    {/* Role, Email & Affiliation Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#1E232D] border border-[#232833] space-y-1">
                        <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                          <Mail className="h-3 w-3 text-[#2DD4BF]" /> Email Address
                        </p>
                        <p className="text-xs font-bold text-[#2DD4BF] truncate">
                          {getProfileEmail(selectedProfile)}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#1E232D] border border-[#232833] space-y-1">
                        <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                          <User className="h-3 w-3 text-[#2DD4BF]" /> Role / Title
                        </p>
                        <p className="text-xs font-bold text-white truncate">
                          {selectedProfile.headline || "Attendee"}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#1E232D] border border-[#232833] space-y-1 sm:col-span-2">
                        <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                          <Building className="h-3 w-3 text-[#2DD4BF]" /> Organization
                        </p>
                        <p className="text-xs font-bold text-white truncate">
                          {selectedProfile.affiliation || "Independent"}
                        </p>
                      </div>
                    </div>

                    {/* Interests & Expertise Tags */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-[#2DD4BF]" />
                        Interests & Expertise
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProfile.interests && selectedProfile.interests.length > 0 ? (
                          selectedProfile.interests.map((interest) => (
                            <span
                              key={interest}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#1E232D] border border-[#232833] px-3 py-1.5 text-xs font-semibold text-[#2DD4BF]"
                            >
                              <Tag className="h-3 w-3 text-[#2DD4BF]" />
                              {interest}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#64748B] italic">No interests specified</span>
                        )}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-[#232833] flex items-center justify-between">
                      {state === "connected" ? (
                        <span className="inline-flex items-center gap-2 rounded-2xl bg-[#2DD4BF]/15 border border-[#2DD4BF]/30 px-4 py-2.5 text-xs font-extrabold text-[#2DD4BF]">
                          <CheckCircle2 className="h-4 w-4" />
                          Connected Attendee
                        </span>
                      ) : state === "pending" ? (
                        <span className="inline-flex items-center gap-2 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-4 py-2.5 text-xs font-extrabold text-[#F59E0B]">
                          <Clock className="h-4 w-4" />
                          Connection Request Sent
                        </span>
                      ) : state === "incoming" ? (
                        <span className="inline-flex items-center gap-2 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-4 py-2.5 text-xs font-extrabold text-[#F59E0B]">
                          <UserPlus className="h-4 w-4" />
                          Incoming Request
                        </span>
                      ) : (
                        <button
                          onClick={() => connect(selectedProfile)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#2DD4BF] px-5 py-2.5 text-xs font-extrabold text-[#0D0F12] shadow-md hover:bg-[#14B8A6] transition"
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>Connect with {selectedProfile.name.split(" ")[0]}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setIsProfileModalOpen(false)}
                        className="rounded-2xl border border-[#232833] bg-[#1E232D] px-4 py-2.5 text-xs font-bold text-[#94A3B8] transition hover:bg-[#282E3B] hover:text-white"
                      >
                        Close
                      </button>
                    </div>

                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Subcomponents ----------

function TabButton({
  label,
  icon,
  count,
  active,
  onClick,
  highlight,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-extrabold transition ${
        active
          ? "border-[#2DD4BF] text-white"
          : "border-transparent text-[#94A3B8] hover:text-white"
      }`}
    >
      <span className={active ? "text-[#2DD4BF]" : "text-[#94A3B8]"}>{icon}</span>
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
            highlight
              ? "bg-[#F59E0B] text-[#0D0F12] animate-pulse"
              : active
              ? "bg-[#2DD4BF]/20 text-[#2DD4BF]"
              : "bg-[#1E232D] text-[#94A3B8]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function InitialsChip({ name }: { name: string }) {
  const style = badgeStyle(name);
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold shadow-md ring-2 ${style.ring}`}
      style={{
        background: `linear-gradient(135deg, ${style.from}, ${style.to})`,
        color: style.text
      }}
    >
      {initials(name)}
    </div>
  );
}

function AttendeeBadge({
  attendee,
  onConnect,
  onViewProfile,
}: {
  attendee: Attendee;
  onConnect: () => void;
  onViewProfile: () => void;
}) {
  const state = connectionState(attendee);
  const style = badgeStyle(attendee.name);

  return (
    <div
      onClick={onViewProfile}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#232833] bg-[#14171D] p-6 shadow-md hover:border-[#2DD4BF]/50 hover:shadow-xl transition space-y-4 cursor-pointer"
    >
      {/* Top accent bar */}
      <div
        className="absolute left-0 right-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${style.from}, ${style.to})`
        }}
      />

      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-black shadow-md ring-2 ${style.ring}`}
            style={{
              background: `linear-gradient(135deg, ${style.from}, ${style.to})`,
              color: style.text
            }}
          >
            {initials(attendee.name)}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate text-lg font-extrabold text-white group-hover:text-[#2DD4BF] transition">
              {attendee.name}
            </h3>

            {attendee.headline && (
              <p className="truncate text-xs text-[#94A3B8] font-medium flex items-center gap-1.5">
                <Briefcase className="h-3 w-3 text-[#2DD4BF] shrink-0" />
                <span>{attendee.headline}</span>
              </p>
            )}

            {attendee.affiliation && (
              <p className="truncate text-xs text-[#64748B] flex items-center gap-1.5">
                <Building className="h-3 w-3 text-[#64748B] shrink-0" />
                <span>{attendee.affiliation}</span>
              </p>
            )}
          </div>
        </div>

        {attendee.interests && attendee.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {attendee.interests.map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-1 rounded-full bg-[#1E232D] border border-[#232833] px-3 py-1 text-[11px] font-semibold text-[#2DD4BF]"
              >
                <Tag className="h-2.5 w-2.5 text-[#2DD4BF]" />
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#232833] flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        {state === "connected" ? (
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-[#2DD4BF]/15 border border-[#2DD4BF]/30 px-3.5 py-1.5 text-xs font-extrabold text-[#2DD4BF]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </span>
        ) : state === "pending" ? (
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-3.5 py-1.5 text-xs font-extrabold text-[#F59E0B]">
            <Clock className="h-3.5 w-3.5" />
            Request Sent
          </span>
        ) : state === "incoming" ? (
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-3.5 py-1.5 text-xs font-extrabold text-[#F59E0B]">
            <UserPlus className="h-3.5 w-3.5" />
            Incoming Request
          </span>
        ) : (
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#2DD4BF] px-4 py-2 text-xs font-extrabold text-[#0D0F12] shadow-md hover:bg-[#14B8A6] transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Connect</span>
          </button>
        )}

        <button
          onClick={onViewProfile}
          className="text-xs font-bold text-[#64748B] hover:text-[#2DD4BF] transition flex items-center gap-1"
        >
          Profile <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#232833] bg-[#14171D] p-12 text-center space-y-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1E232D] text-[#2DD4BF] mx-auto">
        <Users className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-base font-extrabold text-white">{title}</h3>
        <p className="mt-1 text-xs text-[#94A3B8] max-w-md mx-auto">{body}</p>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-3xl border border-[#232833] bg-[#14171D]"
        />
      ))}
    </div>
  );
}
