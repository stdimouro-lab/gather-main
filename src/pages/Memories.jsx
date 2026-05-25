import React, { useState } from "react";
import {
  Calendar,
  Image,
  Plus,
  User,
} from "lucide-react";

const filters = ["All", "Family", "Personal", "Work", "Shared with me", "2026"];

const albums = [
  {
    title: "Spring break 2026",
    date: "March 22 – 29",
    count: "18 photos",
    color: "from-[#2EC4B6] to-[#0F6E56]",
    avatars: ["SD", "L", "N", "+3"],
  },
  {
    title: "Liam's birthday",
    date: "Feb 14, 2026",
    count: "24 photos · 3 videos",
    color: "from-[#6C63FF] to-[#3C3489]",
    avatars: ["SD", "J", "MM"],
  },
  {
    title: "Soccer finals",
    date: "Nov 8, 2025",
    count: "5 photos",
    color: "from-[#F4A261] to-[#854F0B]",
    avatars: ["SD", "J"],
  },
];

const moments = [
  {
    title: "Spring break — day 3 at the beach",
    sub: "March 24, 2026 · Personal · Added by you",
    color: "#2EC4B6",
    thumbs: ["#9FE1CB", "#5DCAA5", "#1D9E75"],
    more: "+4",
  },
  {
    title: "Liam blew out the candles",
    sub: "Feb 14, 2026 · Family · Added by Jessica",
    color: "#6C63FF",
    thumbs: ["#CECBF6", "#AFA9EC"],
    more: "+7",
  },
  {
    title: "Noah scores the winning goal",
    sub: "Nov 8, 2025 · Family · Added by you",
    color: "#F4A261",
    thumbs: ["#FAC775", "#EF9F27"],
  },
];

function AlbumCard({ album }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div
        className={`relative flex h-28 items-end bg-gradient-to-br ${album.color} p-3`}
      >
        <div className="absolute inset-0 bg-black/15" />
        <div className="relative z-10">
          <div className="text-[13px] font-medium text-white">
            {album.title}
          </div>
          <div className="mt-0.5 text-[11px] text-white/80">
            {album.date}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex">
          {album.avatars.map((avatar, index) => (
            <div
              key={`${album.title}-${avatar}-${index}`}
              className="-ml-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#EEEDFE] text-[8px] font-semibold text-[#534AB7] first:ml-0"
            >
              {avatar}
            </div>
          ))}
        </div>

        <div className="text-[11px] text-slate-400">{album.count}</div>
      </div>
    </div>
  );
}

function NewMemoryCard() {
  return (
    <button className="flex h-[158px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white text-center transition hover:border-[#6C63FF] hover:bg-slate-50">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEEDFE]">
        <Plus className="h-4 w-4 text-[#6C63FF]" />
      </div>
      <div className="text-[12px] text-slate-500">
        Create a new memory album
      </div>
    </button>
  );
}

function TimelineMoment({ moment, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: moment.color }}
        />
        {!isLast && <div className="mt-1 min-h-10 w-px flex-1 bg-slate-200" />}
      </div>

      <div className="mb-4 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="text-[13px] font-medium text-slate-900">
          {moment.title}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500">
          {moment.sub}
        </div>

        <div className="mt-3 flex gap-1.5">
          {moment.thumbs.map((color, index) => (
            <div
              key={`${moment.title}-${index}`}
              className="h-13 w-13 rounded-md"
              style={{
                width: 52,
                height: 52,
                background: color,
              }}
            />
          ))}

          {moment.more && (
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[12px] text-slate-500">
              {moment.more}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Memories() {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-medium text-slate-900">
              <Image className="h-5 w-5 text-[#6C63FF]" />
              Memories
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Your life, collected — 3 albums · 47 photos · 12 videos
            </p>
          </div>

          <button className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#6C63FF] px-3.5 py-2 text-[13px] font-medium text-white transition hover:opacity-95">
            <Plus className="h-4 w-4" />
            New memory
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] transition ${
                activeFilter === filter
                  ? "border-[#AFA9EC] bg-[#EEEDFE] text-[#534AB7]"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {filter === "Shared with me" && <User className="h-3 w-3" />}
              {filter === "2026" && <Calendar className="h-3 w-3" />}
              {filter}
            </button>
          ))}
        </div>

        <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.07em] text-slate-500">
          Albums
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {albums.map((album) => (
            <AlbumCard key={album.title} album={album} />
          ))}
          <NewMemoryCard />
        </div>

        <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.07em] text-slate-500">
          Recent moments
        </div>

        <div>
          {moments.map((moment, index) => (
            <TimelineMoment
              key={moment.title}
              moment={moment}
              isLast={index === moments.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}