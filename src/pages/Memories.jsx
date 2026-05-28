import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Image,
  Plus,
  Upload,
  User,
  Video,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase";
import { fetchMemoryAssets } from "@/lib/memories";
import { toast } from "@/components/ui/use-toast";

const filters = ["All", "Images", "Videos", "Files", "2026"];

function getAssetUrl(path) {
  if (!path) return null;

  const { data } = supabase.storage
    .from("event-assets")
    .getPublicUrl(path);

  return data?.publicUrl || null;
}

function formatDate(dateString) {
  if (!dateString) return "Unknown date";

  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EmptyMemories() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEEDFE]">
          <Image className="h-6 w-6 text-[#6C63FF]" />
        </div>

        <h2 className="mt-4 text-lg font-medium text-slate-900">
          No memories yet
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Photos and videos attached to Gather events will appear here.
        </p>
      </div>
    </div>
  );
}

function AlbumCard({ album }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="relative h-32 overflow-hidden bg-slate-100">
        {album.cover ? (
          <img
            src={album.cover}
            alt={album.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#6C63FF] to-[#3C3489]">
            <Image className="h-8 w-8 text-white/80" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/15" />

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="text-[13px] font-medium text-white">
            {album.title}
          </div>

          <div className="mt-0.5 text-[11px] text-white/80">
            {album.date}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="text-[11px] text-slate-400">
          {album.count} memories
        </div>

        <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          <Calendar className="h-3 w-3" />
          Event album
        </div>
      </div>
    </div>
  );
}

function TimelineMoment({ asset, isLast }) {
  const imageUrl = getAssetUrl(asset.storage_path);

  const isVideo =
    asset.asset_type === "video" ||
    asset.mime_type?.startsWith("video");

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1">
        <div className="h-2.5 w-2.5 rounded-full bg-[#6C63FF]" />

        {!isLast && (
          <div className="mt-1 min-h-10 w-px flex-1 bg-slate-200" />
        )}
      </div>

      <div className="mb-4 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-slate-900">
              {asset.title || asset.file_name || "Untitled memory"}
            </div>

            <div className="mt-0.5 text-[11px] text-slate-500">
              {formatDate(asset.created_at)}
              {" · "}
              {asset.events?.title || "Unlinked event"}
            </div>
          </div>

          {isVideo ? (
            <Video className="h-4 w-4 text-slate-400" />
          ) : (
            <Image className="h-4 w-4 text-slate-400" />
          )}
        </div>

        {asset.caption && (
          <div className="mt-2 text-[12px] leading-5 text-slate-600">
            {asset.caption}
          </div>
        )}

        {imageUrl && (
          <div className="mt-3 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
            {isVideo ? (
              <video
                src={imageUrl}
                controls
                className="max-h-[320px] w-full object-cover"
              />
            ) : (
              <img
                src={imageUrl}
                alt={asset.title || "Memory"}
                className="max-h-[320px] w-full object-cover"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Memories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState("All");

  const {
    data: assets = [],
    isLoading,
  } = useQuery({
    queryKey: ["memoryAssets", user?.id],
    queryFn: () => fetchMemoryAssets(user.id),
    enabled: !!user?.id,
    staleTime: 15000,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`memories-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_assets",
          filter: `owner_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["memoryAssets", user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const filteredAssets = useMemo(() => {
    if (activeFilter === "Images") {
      return assets.filter((a) => a.asset_type === "image");
    }

    if (activeFilter === "Videos") {
      return assets.filter((a) => a.asset_type === "video");
    }

    if (activeFilter === "Files") {
      return assets.filter((a) => a.asset_type === "file");
    }

    if (activeFilter === "2026") {
      return assets.filter((a) =>
        new Date(a.created_at).getFullYear() === 2026
      );
    }

    return assets;
  }, [activeFilter, assets]);

  const albums = useMemo(() => {
    const grouped = {};

    filteredAssets.forEach((asset) => {
      const eventId = asset.events?.id || "unlinked";

      if (!grouped[eventId]) {
        grouped[eventId] = {
          id: eventId,
          title: asset.events?.title || "Unlinked memories",
          date: formatDate(asset.created_at),
          count: 0,
          cover: null,
        };
      }

      grouped[eventId].count += 1;

      if (!grouped[eventId].cover && asset.asset_type === "image") {
        grouped[eventId].cover = getAssetUrl(asset.storage_path);
      }
    });

    return Object.values(grouped);
  }, [filteredAssets]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading memories...
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-medium text-slate-900">
                <Image className="h-5 w-5 text-[#6C63FF]" />
                Memories
              </h1>

              <p className="mt-1 text-[13px] text-slate-500">
                Your photos, videos, and moments collected from Gather events.
              </p>
            </div>
          </div>

          <EmptyMemories />
        </div>
      </div>
    );
  }

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
              Your life, collected — {albums.length} albums ·{" "}
              {filteredAssets.length} memories
            </p>
          </div>

          <button
            onClick={() =>
              toast({
                title: "Upload from events",
                description:
                  "Memories are currently uploaded from inside Gather events.",
              })
            }
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#6C63FF] px-3.5 py-2 text-[13px] font-medium text-white transition hover:opacity-95"
          >
            <Upload className="h-4 w-4" />
            Add memory
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
            <AlbumCard key={album.id} album={album} />
          ))}

          <button
            onClick={() =>
              toast({
                title: "Albums are event-based",
                description:
                  "New albums are automatically created from Gather events.",
              })
            }
            className="flex h-[182px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white text-center transition hover:border-[#6C63FF] hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEEDFE]">
              <Plus className="h-4 w-4 text-[#6C63FF]" />
            </div>

            <div className="text-[12px] text-slate-500">
              Albums are created from events
            </div>
          </button>
        </div>

        <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.07em] text-slate-500">
          Recent moments
        </div>

        <div>
          {filteredAssets.map((asset, index) => (
            <TimelineMoment
              key={asset.id}
              asset={asset}
              isLast={index === filteredAssets.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}