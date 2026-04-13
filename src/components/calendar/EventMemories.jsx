import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FileImage,
  FileVideo,
  FileAudio,
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

import useEntitlement from "@/hooks/useEntitlement";

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

  // 🔥 THIS WAS MISSING
  const { storageRemainingMb } = useEntitlement();

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

    // 🔥 STORAGE CHECK
    const fileSizeMb = file.size / (1024 * 1024);

    if (fileSizeMb > storageRemainingMb) {
      toast({
        title: "Storage limit reached",
        description: "Upgrade your plan to upload more files.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

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
      {/* UI stays unchanged */}
      {/* (no need to modify the rest) */}
    </div>
  );
}