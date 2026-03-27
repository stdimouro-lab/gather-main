import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  Paperclip,
  Download,
  Trash2,
  Upload,
  Plus,
  Loader2,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  createEventNote,
  deleteEventAsset,
  getEventAssetDownloadUrl,
  listEventAssets,
  uploadEventFile,
} from "@/lib/eventAssets";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function assetIcon(assetType) {
  switch (assetType) {
    case "image":
      return <FileImage className="h-4 w-4" />;
    case "video":
      return <FileVideo className="h-4 w-4" />;
    case "audio":
      return <FileAudio className="h-4 w-4" />;
    case "note":
      return <StickyNote className="h-4 w-4" />;
    default:
      return <Paperclip className="h-4 w-4" />;
  }
}

export default function EventMemories({
  eventId,
  tabId,
  ownerId,
  isEditable = false,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [downloadId, setDownloadId] = useState(null);

  const [fileTitle, setFileTitle] = useState("");
  const [fileCaption, setFileCaption] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const fileInputRef = useRef(null);

  const canCreate = Boolean(eventId && tabId && ownerId && isEditable);

  const groupedCounts = useMemo(() => {
    return {
      all: items.length,
      notes: items.filter((item) => item.asset_type === "note").length,
      files: items.filter((item) => item.asset_type !== "note").length,
    };
  }, [items]);

  async function loadAssets() {
    if (!eventId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await listEventAssets(eventId);
      setItems(data);
    } catch (error) {
      console.error("loadAssets error", error);
      toast({
        title: "Could not load event files",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
  }, [eventId]);

  async function handleChooseFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canCreate) {
      toast({
        title: "Save the event first",
        description: "Files and memories can be added after the event exists.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      await uploadEventFile({
        eventId,
        tabId,
        ownerId,
        file,
        title: fileTitle,
        caption: fileCaption,
      });

      setFileTitle("");
      setFileCaption("");
      e.target.value = "";

      await loadAssets();

      toast({
        title: "Upload complete",
        description: "Your event file was added.",
      });
    } catch (error) {
      console.error("handleChooseFile error", error);
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload this file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleAddNote() {
    if (!canCreate) {
      toast({
        title: "Save the event first",
        description: "Notes and memories can be added after the event exists.",
        variant: "destructive",
      });
      return;
    }

    if (!noteBody.trim()) {
      toast({
        title: "Note is empty",
        description: "Add something to the note first.",
        variant: "destructive",
      });
      return;
    }

    setSavingNote(true);

    try {
      await createEventNote({
        eventId,
        tabId,
        ownerId,
        title: noteTitle,
        noteBody,
      });

      setNoteTitle("");
      setNoteBody("");

      await loadAssets();

      toast({
        title: "Note added",
        description: "Your event note was saved.",
      });
    } catch (error) {
      console.error("handleAddNote error", error);
      toast({
        title: "Could not save note",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDelete(item) {
    try {
      await deleteEventAsset(item);
      await loadAssets();

      toast({
        title: "Removed",
        description: "The item was deleted.",
      });
    } catch (error) {
      console.error("handleDelete error", error);
      toast({
        title: "Delete failed",
        description: error.message || "Could not remove that item.",
        variant: "destructive",
      });
    }
  }

  async function handleDownload(item) {
    if (!item?.storage_path) return;

    setDownloadId(item.id);

    try {
      const signedUrl = await getEventAssetDownloadUrl(item.storage_path);
      if (!signedUrl) throw new Error("Could not create a download link.");

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("handleDownload error", error);
      toast({
        title: "Download failed",
        description: error.message || "Could not open that file.",
        variant: "destructive",
      });
    } finally {
      setDownloadId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Files & Memories
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Add tickets, permits, confirmations, notes, photos, videos, and shared event memories.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {groupedCounts.all} items
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Upload a file
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            Use this for tickets, parking passes, PDFs, photos, videos, or audio.
          </p>
        </div>

        <div className="grid gap-3">
          <Input
            placeholder="Optional title"
            value={fileTitle}
            onChange={(e) => setFileTitle(e.target.value)}
            disabled={!canCreate || uploading}
          />

          <Textarea
            placeholder="Optional caption or note"
            value={fileCaption}
            onChange={(e) => setFileCaption(e.target.value)}
            className="min-h-[80px]"
            disabled={!canCreate || uploading}
          />

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleChooseFile}
            disabled={!canCreate || uploading}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canCreate || uploading}
            className="justify-start"
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Choose file"}
          </Button>

          {!canCreate && (
            <p className="text-xs text-slate-400">
              Save the event first, then come back here to add files and memories.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Add a memory note
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            Use this for quick recaps, reminders, or shared details tied to this event.
          </p>
        </div>

        <div className="grid gap-3">
          <Input
            placeholder="Optional note title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            disabled={!canCreate || savingNote}
          />

          <Textarea
            placeholder="Write your note here..."
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            className="min-h-[100px]"
            disabled={!canCreate || savingNote}
          />

          <Button
            type="button"
            onClick={handleAddNote}
            disabled={!canCreate || savingNote}
            className="w-full sm:w-auto"
          >
            {savingNote ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {savingNote ? "Saving..." : "Add note"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Event library
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {groupedCounts.files} files • {groupedCounts.notes} notes
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading event files...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Nothing has been added to this event yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isNote = item.asset_type === "note";

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        {assetIcon(item.asset_type)}
                        <span className="truncate">
                          {item.title ||
                            item.file_name ||
                            (isNote ? "Event note" : "Untitled item")}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(item.created_at)}
                        {item.file_size ? ` • ${formatBytes(item.file_size)}` : ""}
                      </div>

                      {item.caption ? (
                        <p className="mt-3 text-sm text-slate-600">
                          {item.caption}
                        </p>
                      ) : null}

                      {isNote && item.note_body ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                          {item.note_body}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {!isNote && item.storage_path ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(item)}
                          disabled={downloadId === item.id}
                        >
                          {downloadId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      ) : null}

                      {isEditable ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}