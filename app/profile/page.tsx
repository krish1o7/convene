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
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentEvent");

    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-2xl font-bold">
          Loading Profile...
        </h1>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <h1 className="text-2xl font-bold">
          Profile Not Found
        </h1>
      </main>
    );
  }

  return (
    <div className="sticky top-0 z-50 border-b border-[#DEE3E0] bg-white/90 backdrop-blur"> <Navbar/>
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">

        <div className="mb-6 flex justify-between">
          <h1 className="text-4xl font-bold">
            My Profile
          </h1>

          <button
            onClick={logout}
            className="rounded bg-red-600 px-4 py-2 text-white"
          >
            Logout
          </button>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow">

          <div className="flex items-center gap-6">

            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-4xl font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <h2 className="text-3xl font-bold">
                {user.name}
              </h2>

              <p className="text-gray-600">
                {user.email}
              </p>
            </div>

          </div>

          <div className="mt-8 grid gap-6">

            <div>
              <h3 className="mb-2 text-lg font-semibold">
                Headline
              </h3>

              <p className="rounded bg-slate-50 p-3">
                {user.headline || "Not provided"}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold">
                Affiliation
              </h3>

              <p className="rounded bg-slate-50 p-3">
                {user.affiliation || "Not provided"}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold">
                Interests
              </h3>

              <div className="flex flex-wrap gap-2">
                {user.interests &&
                user.interests.length > 0 ? (
                  user.interests.map(
                    (interest) => (
                      <span
                        key={interest}
                        className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                      >
                        {interest}
                      </span>
                    )
                  )
                ) : (
                  <p>No interests added</p>
                )}
              </div>
            </div>

          </div>

          <div className="mt-8 flex gap-3">

            <button
              onClick={() =>
                router.push("/program")
              }
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              Program
            </button>

            <button
              onClick={() =>
                router.push("/agenda")
              }
              className="rounded bg-green-600 px-4 py-2 text-white"
            >
              My Agenda
            </button>

            <button
              onClick={() =>
                router.push("/network")
              }
              className="rounded bg-purple-600 px-4 py-2 text-white"
            >
              Networking
            </button>

          </div>

        </div>
      </div>
    </main>
    </div>
  );
}