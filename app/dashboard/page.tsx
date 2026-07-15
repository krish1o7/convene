"use client";

import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";

export default function OrganizerDashboard() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-8 bg-slate-100">
      <h1 className="mb-8 text-4xl font-bold">
        Organizer Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

        <button
          onClick={() => router.push("/organizer/events")}
          className="rounded-xl bg-white p-6 shadow"
        >
          Create Event
        </button>

        <button
          onClick={() => router.push("/organizer/sessions")}
          className="rounded-xl bg-white p-6 shadow"
        >
          Manage Sessions
        </button>

        <button
          onClick={() => router.push("/organizer/analytics")}
          className="rounded-xl bg-white p-6 shadow"
        >
          Analytics
        </button>

        <button
          onClick={() => router.push("/organizer/broadcast")}
          className="rounded-xl bg-white p-6 shadow"
        >
          Broadcast
        </button>

        <button
          onClick={() => router.push("/organizer/announcements")}
          className="rounded-xl bg-white p-6 shadow"
        >
          Announcements
        </button>

        <button
          onClick={() => router.push("/organizer/moderation")}
          className="rounded-xl bg-white p-6 shadow"
        >
          Moderation
        </button>

      </div>
    </main>
  );
}