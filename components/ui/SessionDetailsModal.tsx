"use client";

import React, { useEffect, useState } from "react";
import { X, Clock, MapPin, Star, User, Tag, Calendar, Video, ExternalLink, Bookmark, Check, Edit3 } from "lucide-react";

export type SessionSpeaker = {
  id?: string;
  name: string;
  title?: string;
  company?: string;
  avatar?: string;
  role?: string;
  bio?: string;
};

export type SessionDetail = {
  _id: string;
  title: string;
  description?: string;
  track: string;
  room: string;
  startTime: string;
  endTime: string;
  speakers: (string | SessionSpeaker)[];
  tags?: string[];
  mode?: string;
  meetingUrl?: string;
};

interface SessionDetailsModalProps {
  session: SessionDetail | null;
  isOpen: boolean;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: (sessionId: string) => void;
}

export default function SessionDetailsModal({
  session,
  isOpen,
  isSaved,
  onClose,
  onToggleSave,
}: SessionDetailsModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [noteText, setNoteText] = useState<string>("");
  const [isNoteSaved, setIsNoteSaved] = useState<boolean>(false);

  useEffect(() => {
    if (session?._id) {
      const storedRating = localStorage.getItem(`rating_${session._id}`);
      const storedNote = localStorage.getItem(`note_${session._id}`);
      setRating(storedRating ? parseInt(storedRating, 10) : 0);
      setNoteText(storedNote || "");
    }
  }, [session]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const startTimeStr = new Date(session.startTime).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTimeStr = new Date(session.endTime).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateStr = new Date(session.startTime).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const now = new Date();
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  const isLive = start <= now && end >= now;
  const isPast = end < now;

  const handleRating = (stars: number) => {
    setRating(stars);
    localStorage.setItem(`rating_${session._id}`, stars.toString());
  };

  const handleSaveNote = () => {
    localStorage.setItem(`note_${session._id}`, noteText);
    setIsNoteSaved(true);
    setTimeout(() => setIsNoteSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#14171D] p-6 sm:p-8 shadow-2xl border border-[#232833] text-white transition-all duration-200 transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#232833]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-[#2DD4BF]/15 px-3 py-1 text-xs font-bold text-[#2DD4BF]">
              {session.track || "General Track"}
            </span>
            {isLive && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#EF4444] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white animate-pulse">
                <span className="h-2 w-2 rounded-full bg-white" />
                Live Now
              </span>
            )}
            {isPast && (
              <span className="rounded-full bg-[#1E232D] px-3 py-1 text-xs font-semibold text-[#94A3B8]">
                Completed
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E232D] text-[#94A3B8] hover:bg-[#282E3B] hover:text-white transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="mt-5 space-y-6">
          {/* Title */}
          <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
            {session.title}
          </h2>

          {/* Timing & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2.5 rounded-2xl bg-[#1E232D] p-3.5 border border-[#232833]">
              <Clock className="h-4 w-4 text-[#2DD4BF] shrink-0" />
              <div>
                <p className="text-xs text-[#94A3B8] font-medium">Time & Date</p>
                <p className="font-bold text-white">
                  {startTimeStr} – {endTimeStr}
                </p>
                <p className="text-xs text-[#94A3B8]">{dateStr}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-2xl bg-[#1E232D] p-3.5 border border-[#232833]">
              <MapPin className="h-4 w-4 text-[#2DD4BF] shrink-0" />
              <div>
                <p className="text-xs text-[#94A3B8] font-medium">Room Location</p>
                <p className="font-bold text-white">
                  {session.room || "Main Hall"}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {session.description && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                About Session
              </h3>
              <p className="text-sm leading-relaxed text-[#E2E8F0]">
                {session.description}
              </p>
            </div>
          )}

          {/* Speakers */}
          {session.speakers && session.speakers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Speakers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {session.speakers.map((sp, idx) => {
                  const isObj = typeof sp === "object" && sp !== null;
                  const name = isObj ? sp.name : String(sp);
                  const title = isObj ? sp.title || sp.role : undefined;
                  const company = isObj ? sp.company : undefined;
                  const avatar = isObj ? sp.avatar : undefined;

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-2xl border border-[#232833] p-3.5 bg-[#1E232D]"
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-[#2DD4BF]/30"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2DD4BF]/15 text-[#2DD4BF]">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{name}</p>
                        {(title || company) && (
                          <p className="text-xs text-[#94A3B8] truncate">
                            {[title, company].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {session.tags && session.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {session.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1E232D] border border-[#232833] px-3 py-1 text-xs font-medium text-[#2DD4BF]"
                  >
                    <Tag className="h-3 w-3 text-[#2DD4BF]" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Virtual Stream Link if available */}
          {session.meetingUrl && (
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-2xl bg-[#EF4444] text-white font-bold text-sm shadow-lg hover:bg-[#DC2626] transition"
            >
              <Video className="h-4 w-4" />
              <span>Join Live Virtual Room</span>
              <ExternalLink className="h-4 w-4 opacity-80" />
            </a>
          )}

          {/* Save / Remove Agenda Action */}
          <div className="pt-2 border-t border-[#232833] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => onToggleSave(session._id)}
              className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm transition shadow-sm ${
                isSaved
                  ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/25"
                  : "bg-[#2DD4BF] text-[#0D0F12] hover:bg-[#14B8A6]"
              }`}
            >
              {isSaved ? (
                <>
                  <Star className="h-4 w-4 fill-current" />
                  <span>Saved in My Agenda</span>
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  <span>Add to My Agenda</span>
                </>
              )}
            </button>

            {/* Rating Stars */}
            <div className="flex items-center gap-1.5 bg-[#1E232D] border border-[#232833] px-4 py-2 rounded-2xl">
              <span className="text-xs font-semibold text-[#94A3B8] mr-1">Rate:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className="p-1 transition transform hover:scale-125 focus:outline-none"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`h-5 w-5 ${
                      star <= rating
                        ? "fill-[#F59E0B] text-[#F59E0B]"
                        : "text-[#64748B] hover:text-[#94A3B8]"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Personal Notes */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                Personal Notes
              </h3>
              {isNoteSaved && (
                <span className="text-xs font-bold text-[#10B981] flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Saved!
                </span>
              )}
            </div>
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add key takeaways or notes for this session..."
              className="w-full rounded-2xl border border-[#232833] bg-[#1E232D] p-3.5 text-xs text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/40"
            />
            <button
              onClick={handleSaveNote}
              className="w-full py-2.5 rounded-2xl bg-[#2DD4BF] text-[#0D0F12] text-xs font-bold hover:bg-[#14B8A6] transition"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
