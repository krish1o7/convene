"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Navbar from "@/components/ui/Navbar";

type User = {
  _id?: string;
  name: string;
  email: string;
  headline?: string;
  affiliation?: string;
  interests?: string[];
  role?: string;
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [headline, setHeadline] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [interestsStr, setInterestsStr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await api.get("/api/auth/me");
      setUser(res.data);
      setHeadline(res.data.headline || "");
      setAffiliation(res.data.affiliation || "");
      setInterestsStr((res.data.interests || []).join(", "));
    } catch (err) {
      console.error(err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      setSaving(true);
      setError(null);
      
      const interests = interestsStr
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      const res = await api.put("/api/auth/me", {
        headline,
        affiliation,
        interests,
      });

      setUser(res.data);
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to update profile. API might not be implemented.");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentEvent");
    router.push("/login");
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-[#232833] bg-[#0D0F12]/90 backdrop-blur">
        <Navbar />
      </div>

      <main className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] py-10 animate-fade-in">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              My Profile
            </h1>

            <button
              onClick={logout}
              className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-2 text-sm font-semibold text-[#EF4444] transition hover:bg-[#EF4444]/20"
            >
              Sign out
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-[#EF4444]/10 p-4 text-sm text-[#EF4444] border border-[#EF4444]/20">
              {error}
            </div>
          )}

          {loading ? (
            <div className="animate-pulse rounded-3xl border border-[#232833] bg-[#14171D] p-8 space-y-6">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-[#1E232D]" />
                <div className="flex-1 space-y-4">
                  <div className="h-6 w-1/3 rounded bg-[#1E232D]" />
                  <div className="h-4 w-1/4 rounded bg-[#1E232D]" />
                </div>
              </div>
              <div className="space-y-6 pt-4 border-t border-[#232833]">
                <div className="h-20 rounded-2xl bg-[#1E232D]" />
                <div className="h-20 rounded-2xl bg-[#1E232D]" />
              </div>
            </div>
          ) : !user ? (
            <div className="rounded-3xl border border-dashed border-[#232833] bg-[#14171D] p-12 text-center">
              <h2 className="text-xl font-bold text-white">
                Profile Not Found
              </h2>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-[#232833] bg-[#14171D] shadow-xl">
              <div className="border-b border-[#232833] p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#2DD4BF] text-4xl font-extrabold text-[#0D0F12] shadow-md">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-white">
                        {user.name}
                      </h2>
                      <p className="mt-1 text-[#94A3B8] text-sm">{user.email}</p>
                      {user.role === "organizer" && (
                        <span className="mt-3 inline-block rounded-full bg-[#2DD4BF]/15 border border-[#2DD4BF]/20 px-3.5 py-1 text-xs font-bold tracking-wide text-[#2DD4BF]">
                          ORGANIZER
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="shrink-0 rounded-2xl border border-[#232833] bg-[#1E232D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#282E3B]"
                  >
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </button>
                </div>
              </div>

              <div className="p-8">
                {isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        Headline
                      </label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Software Engineer at ACME Corp"
                        className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] px-4 py-3 text-sm text-white placeholder-[#64748B] focus:border-[#2DD4BF] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        Affiliation
                      </label>
                      <input
                        type="text"
                        value={affiliation}
                        onChange={(e) => setAffiliation(e.target.value)}
                        placeholder="e.g. ACME Corp"
                        className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] px-4 py-3 text-sm text-white placeholder-[#64748B] focus:border-[#2DD4BF] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        Interests (comma separated)
                      </label>
                      <input
                        type="text"
                        value={interestsStr}
                        onChange={(e) => setInterestsStr(e.target.value)}
                        placeholder="e.g. React, Next.js, Design Systems"
                        className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] px-4 py-3 text-sm text-white placeholder-[#64748B] focus:border-[#2DD4BF] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="rounded-2xl bg-[#2DD4BF] px-6 py-3 font-extrabold text-sm text-[#0D0F12] transition hover:bg-[#14B8A6] disabled:opacity-50 shadow-md"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-8 sm:grid-cols-2">
                    <div className="col-span-2 sm:col-span-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        Headline
                      </h3>
                      <p className="mt-2 text-sm text-white font-medium">
                        {user.headline || (
                          <span className="italic text-[#64748B]">
                            No headline provided
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        Affiliation
                      </h3>
                      <p className="mt-2 text-sm text-white font-medium">
                        {user.affiliation || (
                          <span className="italic text-[#64748B]">
                            No affiliation provided
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                        Interests
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.interests && user.interests.length > 0 ? (
                          user.interests.map((interest) => (
                            <span
                              key={interest}
                              className="rounded-full bg-[#1E232D] border border-[#232833] px-3.5 py-1 text-xs font-semibold text-[#2DD4BF]"
                            >
                              {interest}
                            </span>
                          ))
                        ) : (
                          <p className="italic text-xs text-[#64748B]">
                            No interests added
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}