import { useEffect, useMemo, useState } from "react";
import {
  HardDrive,
  Loader2,
  Trash2,
  Upload,
  FileText,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import EventDropzone from "@/components/EventDropzone";
import useEntitlement, { getAccountQueryKey } from "@/hooks/useEntitlement";
import { toast } from "@/components/ui/use-toast";
import { fetchMyAccount } from "@/lib/account";
import {
  listEventAssets,
  uploadEventFile,
  deleteEventAsset,
  deleteEventAssetsBulk,
  getEventAssetDownloadUrl,
} from "@/lib/eventAssets";

function formatMb(mb) {
  if (!Number.isFinite(mb) || mb <= 0) return "0 MB";
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  }
  return `${Math.ceil(mb)} MB`;
}

function bytesToMb(bytes) {
  return Math.ceil(Number(bytes || 0) / (1024 * 1024));
}

function getAssetName(asset) {
  return asset?.title || asset?.file_name || "File";
}

function getAssetType(asset) {
  return asset?.asset_type || "file";
}

function getAssetSizeMb(asset) {
  return Math.ceil(Number(asset?.file_size || 0) / (1024 * 1024));
}

function isCancelledError(error) {
  const message = String(error?.message || "");
  const name = String(error?.name || "");
  return name === "CancelledError" || message.includes("CancelledError");
}

export default function EventMemories({
  eventId,
  tabId,
  ownerId,
  isEditable = true,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { planTier, storageLimitMb, storageUsedMb } = useEntitlement();

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [uploadingNames, setUploadingNames] = useState([]);
  const [deletingIds, setDeletingIds] = useState([]);
  const [signedUrls, setSignedUrls] = useState({});
  const [localStorageUsedMb, setLocalStorageUsedMb] = useState(
    Number(storageUsedMb || 0)
  );

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const accountQueryKey = getAccountQueryKey(ownerId);

  useEffect(() => {
    setLocalStorageUsedMb(Number(storageUsedMb || 0));
  }, [storageUsedMb]);

  const refreshStorageState = async () => {
    if (!ownerId) return null;

    try {
      await queryClient.invalidateQueries({ queryKey: accountQueryKey });

      const freshAccount = await queryClient.fetchQuery({
        queryKey: accountQueryKey,
        queryFn: () => fetchMyAccount(ownerId),
        staleTime: 0,
      });

      const freshUsedMb = Number(freshAccount?.storage_used_mb || 0);
      setLocalStorageUsedMb(freshUsedMb);
      return freshUsedMb;
    } catch (error) {
      if (isCancelledError(error)) {
        return null;
      }

      console.error("Failed to refresh account storage state:", error);
      return null;
    }
  };

  const storageRemainingMb = Math.max(
    Number(storageLimitMb || 0) - Number(localStorageUsedMb || 0),
    0
  );

  const storageRatio =
    Number(storageLimitMb || 0) > 0
      ? Number(localStorageUsedMb || 0) / Number(storageLimitMb || 0)
      : 0;

  const storageFull =
    Number(storageLimitMb || 0) > 0 && storageRemainingMb <= 0;
  const storageAlmostFull = storageRatio >= 0.8 && !storageFull;

  const disabledUploadMessage = storageFull
    ? "Storage full"
    : "Uploads are unavailable";

  const loadSignedUrlsFast = async (safeAssets) => {
    const fileAssets = safeAssets.filter(
      (asset) => asset?.storage_path && asset?.asset_type !== "note"
    );

    if (fileAssets.length === 0) {
      setSignedUrls({});
      return;
    }

    setPreviewsLoading(true);

    try {
      const results = await Promise.all(
        fileAssets.map(async (asset) => {
          try {
            const signedUrl = await getEventAssetDownloadUrl(asset.storage_path);
            return { id: asset.id, signedUrl };
          } catch (error) {
            console.error("Failed to create signed URL:", error);
            return { id: asset.id, signedUrl: null };
          }
        })
      );

      const nextSignedUrls = {};
      for (const result of results) {
        if (result?.signedUrl) {
          nextSignedUrls[result.id] = result.signedUrl;
        }
      }

      setSignedUrls(nextSignedUrls);
    } finally {
      setPreviewsLoading(false);
    }
  };

  const loadAssets = async () => {
    if (!eventId) return;

    setLoading(true);

    try {
      const data = await listEventAssets(eventId);
      const safeAssets = Array.isArray(data) ? data : [];

      setAssets(safeAssets);
      setSelectedIds([]);

      refreshStorageState();
      loadSignedUrlsFast(safeAssets);
    } catch (error) {
      console.error("Failed to load event assets:", error);
      toast({
        title: "Could not load memories",
        description: error?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [eventId]);

  const totalAssetCount = assets.length;
  const allSelected =
    assets.length > 0 && selectedIds.length === assets.length;

  const uploadHint = useMemo(() => {
    if (storageFull) {
      return "You’ve reached your storage limit. Upgrade to keep adding memories.";
    }

    if (storageAlmostFull) {
      return `Almost full — ${formatMb(storageRemainingMb)} left.`;
    }

    return `Available storage: ${formatMb(storageRemainingMb)} left.`;
  }, [storageAlmostFull, storageFull, storageRemainingMb]);

  const goToPlans = () => {
    navigate("/plans");
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const toggleSelected = (assetId) => {
    setSelectedIds((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(assets.map((asset) => asset.id));
  };

  const handleFiles = async (files) => {
    if (!isEditable) return;

    if (storageFull) {
      toast({
        title: "Storage full",
        description: "Upgrade your plan to keep adding memories and files.",
        variant: "destructive",
      });
      return;
    }

    const CONCURRENCY = 4;
    const queue = [...files];

    const uploadOne = async (file) => {
      const fileMb = bytesToMb(file.size);

      const latestRemainingMb = Math.max(
        Number(storageLimitMb || 0) - Number(localStorageUsedMb || 0),
        0
      );

      if (fileMb > latestRemainingMb) {
        toast({
          title: "Not enough storage",
          description: `${file.name} needs ${formatMb(fileMb)}, but only ${formatMb(
            latestRemainingMb
          )} is available.`,
          variant: "destructive",
        });
        return;
      }

      try {
        setUploadingNames((prev) => [...prev, file.name]);

        const uploaded = await uploadEventFile({
          file,
          eventId,
          tabId,
          ownerId,
        });

        setAssets((prev) => [uploaded, ...prev]);
        setLocalStorageUsedMb((prev) => Number(prev || 0) + fileMb);

        if (uploaded?.storage_path) {
          try {
            const uploadedUrl = await getEventAssetDownloadUrl(uploaded.storage_path);
            if (uploadedUrl) {
              setSignedUrls((prev) => ({
                ...prev,
                [uploaded.id]: uploadedUrl,
              }));
            }
          } catch (error) {
            console.error("Signed URL creation failed after upload:", error);
          }
        }
      } catch (error) {
        console.error("Upload failed:", error);

        if (error?.code === "STORAGE_LIMIT_REACHED") {
          toast({
            title: "Storage full",
            description:
              "You’ve reached your limit. Upgrade to keep adding memories.",
          });
          navigate("/plans");
          return;
        }

        toast({
          title: "Upload failed",
          description: error?.message ?? `Could not upload ${file.name}.`,
          variant: "destructive",
        });
      } finally {
        setUploadingNames((prev) =>
          prev.filter((name) => name !== file.name)
        );
      }
    };

    const workers = Array.from({ length: CONCURRENCY }).map(async () => {
      while (queue.length > 0) {
        const file = queue.shift();
        if (file) {
          await uploadOne(file);
        }
      }
    });

    await Promise.all(workers);
    await refreshStorageState();

    toast({
      title: "Upload complete",
      description: `${files.length} file${files.length === 1 ? "" : "s"} uploaded`,
    });
  };

  const handleDelete = async (asset) => {
    try {
      setDeletingIds((prev) => [...prev, asset.id]);

      await deleteEventAsset(asset);

      setAssets((prev) => prev.filter((item) => item.id !== asset.id));
      setSignedUrls((prev) => {
        const next = { ...prev };
        delete next[asset.id];
        return next;
      });
      setSelectedIds((prev) => prev.filter((id) => id !== asset.id));

      setLocalStorageUsedMb((prev) =>
        Math.max(Number(prev || 0) - getAssetSizeMb(asset), 0)
      );

      await refreshStorageState();

      toast({
        title: "Deleted",
        description: "The memory was removed.",
      });
    } catch (error) {
      console.error("Delete failed:", error);
      await refreshStorageState();

      toast({
        title: "Delete failed",
        description: error?.message ?? "Could not remove that memory.",
        variant: "destructive",
      });
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== asset.id));
    }
  };

  const handleDeleteSelected = async () => {
    const selectedAssets = assets.filter((asset) =>
      selectedIds.includes(asset.id)
    );

    if (selectedAssets.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedAssets.length} selected item${
        selectedAssets.length === 1 ? "" : "s"
      }?`
    );

    if (!confirmed) return;

    try {
      const idsToDelete = selectedAssets.map((asset) => asset.id);
      setDeletingIds((prev) => [...prev, ...idsToDelete]);

      await deleteEventAssetsBulk(selectedAssets);

      const deletedIdSet = new Set(idsToDelete);
      const deletedStorageMb = selectedAssets.reduce(
        (sum, asset) => sum + getAssetSizeMb(asset),
        0
      );

      setAssets((prev) => prev.filter((asset) => !deletedIdSet.has(asset.id)));
      setSignedUrls((prev) => {
        const next = { ...prev };
        for (const id of idsToDelete) {
          delete next[id];
        }
        return next;
      });

      setSelectedIds([]);
      setSelectionMode(false);

      setLocalStorageUsedMb((prev) =>
        Math.max(Number(prev || 0) - deletedStorageMb, 0)
      );

      await refreshStorageState();

      toast({
        title: "Deleted",
        description: `${selectedAssets.length} item${
          selectedAssets.length === 1 ? "" : "s"
        } removed.`,
      });
    } catch (error) {
      console.error("Bulk delete failed:", error);
      await refreshStorageState();

      toast({
        title: "Delete failed",
        description: error?.message ?? "Could not remove the selected memories.",
        variant: "destructive",
      });
    } finally {
      setDeletingIds((prev) =>
        prev.filter((id) => !selectedIds.includes(id))
      );
    }
  };

  const handleDeleteAll = async () => {
    if (assets.length === 0) return;

    const confirmed = window.confirm(
      `Delete all ${assets.length} memories for this event? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const allIds = assets.map((asset) => asset.id);
      setDeletingIds(allIds);

      await deleteEventAssetsBulk(assets);

      setAssets([]);
      setSignedUrls({});
      setSelectedIds([]);
      setSelectionMode(false);
      setLocalStorageUsedMb(0);

      await refreshStorageState();

      toast({
        title: "All memories deleted",
        description: "Everything for this event was removed.",
      });
    } catch (error) {
      console.error("Delete all failed:", error);
      await refreshStorageState();

      toast({
        title: "Delete failed",
        description: error?.message ?? "Could not remove all memories.",
        variant: "destructive",
      });
    } finally {
      setDeletingIds([]);
    }
  };

  const renderPreview = (asset) => {
    const type = getAssetType(asset);
    const signedUrl = signedUrls[asset.id];

    if (type === "image") {
      if (signedUrl) {
        return (
          <img
            src={signedUrl}
            alt={getAssetName(asset)}
            loading="lazy"
            className="h-32 w-full rounded-xl object-cover"
          />
        );
      }

      return (
        <div className="flex h-32 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      );
    }

    if (type === "video") {
      if (signedUrl) {
        return (
          <video
            src={signedUrl}
            controls
            preload="metadata"
            className="h-32 w-full rounded-xl object-cover"
          />
        );
      }

      return (
        <div className="flex h-32 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      );
    }

    if (type === "audio") {
      if (signedUrl) {
        return (
          <div className="flex h-32 items-center justify-center rounded-xl bg-slate-100 p-3">
            <audio src={signedUrl} controls preload="metadata" className="w-full" />
          </div>
        );
      }

      return (
        <div className="flex h-32 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      );
    }

    if (type === "note") {
      return (
        <div className="flex h-32 flex-col justify-between rounded-xl bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-amber-700">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Note</span>
          </div>
          <p className="line-clamp-4 text-sm text-slate-700">
            {asset?.note_body || "No note text"}
          </p>
        </div>
      );
    }

    if (signedUrl) {
      return (
        <a
          href={signedUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-32 items-center justify-center rounded-xl bg-slate-100 px-3 text-center text-sm text-slate-600 hover:bg-slate-200"
        >
          Open file
        </a>
      );
    }

    return (
      <div className="flex h-32 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        {previewsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "No preview"}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {isEditable && (
        <div className="space-y-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <HardDrive className="h-4 w-4 text-slate-600" />
                  Event storage
                </div>
                <p className="mt-1 text-sm text-slate-500">{uploadHint}</p>
              </div>

              <button
                type="button"
                onClick={goToPlans}
                className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Upgrade
              </button>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={[
                  "h-full transition-all",
                  storageRatio >= 0.95
                    ? "bg-red-500"
                    : storageRatio >= 0.8
                    ? "bg-yellow-500"
                    : "bg-green-500",
                ].join(" ")}
                style={{ width: `${Math.min(storageRatio * 100, 100)}%` }}
              />
            </div>
          </div>

          <EventDropzone
            onFiles={handleFiles}
            disabled={storageFull}
            disabledMessage={disabledUploadMessage}
          />

          <label className="flex cursor-pointer items-center justify-center gap-2 text-sm font-medium text-indigo-600">
            <Upload className="h-4 w-4" />
            Choose files
            <input
              type="file"
              multiple
              className="hidden"
              disabled={storageFull}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                handleFiles(files);
                e.target.value = "";
              }}
            />
          </label>

          {storageFull && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Your storage is full. Upgrade your plan to keep adding memories.
            </div>
          )}

          {storageAlmostFull && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
              You’re getting close to your storage limit.
            </div>
          )}
        </div>
      )}

      {isEditable && assets.length > 0 && (
        <div className="rounded-2xl border bg-white p-3">
          {!selectionMode ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <CheckSquare className="h-4 w-4" />
                Select
              </button>

              <button
                type="button"
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete all
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {allSelected ? (
                  <>
                    <Square className="h-4 w-4" />
                    Clear all
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Select all
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete selected ({selectedIds.length})
              </button>

              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Done
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading memories...
        </div>
      )}

      {!loading && totalAssetCount === 0 && (
        <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No memories yet — add photos, videos, audio, or files for this event.
        </div>
      )}

      {uploadingNames.length > 0 && (
        <div className="rounded-xl border bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          Uploading: {uploadingNames.join(", ")}
        </div>
      )}

      {!loading && totalAssetCount > 0 && previewsLoading && (
        <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Loading previews...
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {assets.map((asset) => {
          const isDeleting = deletingIds.includes(asset.id);
          const isSelected = selectedIds.includes(asset.id);

          return (
            <div
              key={asset.id}
              className={[
                "group overflow-hidden rounded-2xl border bg-white shadow-sm transition",
                isSelected ? "ring-2 ring-indigo-500" : "",
              ].join(" ")}
            >
              <div className="relative">
                {renderPreview(asset)}

                {selectionMode && isEditable && (
                  <button
                    type="button"
                    onClick={() => toggleSelected(asset.id)}
                    className="absolute left-2 top-2 rounded-lg bg-black/60 p-2 text-white"
                    aria-label={`Select ${getAssetName(asset)}`}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                )}

                {!selectionMode && isEditable && (
                  <button
                    type="button"
                    onClick={() => handleDelete(asset)}
                    disabled={isDeleting}
                    className="absolute right-2 top-2 rounded-lg bg-black/60 p-2 text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                    aria-label={`Delete ${getAssetName(asset)}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium text-slate-900">
                  {getAssetName(asset)}
                </p>
                <p className="text-xs capitalize text-slate-500">
                  {getAssetType(asset)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!isEditable && !loading && totalAssetCount > 0 && (
        <div className="text-xs text-slate-400">
          You can view these files, but you can’t make changes.
        </div>
      )}

      {planTier === "free" && isEditable && (
        <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
          Need more room for memories? Upgrade for more storage and better shared planning.
        </div>
      )}
    </div>
  );
}