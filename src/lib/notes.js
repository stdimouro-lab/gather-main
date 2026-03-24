// src/lib/notes.js
import { supabase } from "./supabase";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeTabIds(tabIds) {
  return (tabIds ?? [])
    .map((t) => (typeof t === "object" ? t?.id : t))
    .filter((v) => typeof v === "string" && UUID_RE.test(v));
}

function toUi(row) {
  return {
    ...row,
    ownerId: row.owner_id,
    tabId: row.tab_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDb(payload, { mode = "insert" } = {}) {
  const out = { ...payload };

  // camelCase -> snake_case (optional convenience)
  if ("ownerId" in out) {
    out.owner_id = out.ownerId;
    delete out.ownerId;
  }
  if ("tabId" in out) {
    out.tab_id = out.tabId;
    delete out.tabId;
  }

  // never write timestamps
  delete out.createdAt;
  delete out.updatedAt;

  if (mode === "update") {
    for (const [k, v] of Object.entries(out)) {
      if (v === undefined) delete out[k];
    }
  }

  return out;
}

function whitelistInsert(db) {
  return {
    owner_id: db.owner_id,
    tab_id: db.tab_id,
    title: db.title ?? "",
    body: db.body ?? "",
    pinned: db.pinned ?? false,
    visibility: db.visibility ?? "table",
  };
}

function whitelistUpdate(db) {
  const allowed = ["tab_id", "title", "body", "pinned", "visibility"];
  const out = {};
  for (const k of allowed) if (k in db) out[k] = db[k];
  return out;
}

export async function fetchNotes({ ownerId, tabIds, pinnedOnly = false, limit = 200 }) {
  if (!ownerId || !UUID_RE.test(ownerId)) return [];
  const cleanTabIds = normalizeTabIds(tabIds);
  if (!cleanTabIds.length) return [];

  let q = supabase
    .from("notes")
    .select("*")
    .eq("owner_id", ownerId)
    .in("tab_id", cleanTabIds);

  if (pinnedOnly) q = q.eq("pinned", true);

  const { data, error } = await q
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(toUi);
}

export async function createNote(payload) {
  const db = toDb(payload, { mode: "insert" });
  const insertPayload = whitelistInsert(db);

  if (!insertPayload.owner_id || !UUID_RE.test(insertPayload.owner_id)) {
    throw new Error("createNote: owner_id missing/invalid");
  }
  if (!insertPayload.tab_id || !UUID_RE.test(insertPayload.tab_id)) {
    throw new Error("createNote: tab_id missing/invalid");
  }

  const { data, error } = await supabase
    .from("notes")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;
  return toUi(data);
}

export async function updateNote(id, updates) {
  if (!id || !UUID_RE.test(id)) throw new Error("updateNote: id missing/invalid");

  const db = toDb(updates, { mode: "update" });
  const updatePayload = whitelistUpdate(db);

  const { data, error } = await supabase
    .from("notes")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toUi(data);
}

export async function deleteNote(id) {
  if (!id || !UUID_RE.test(id)) throw new Error("deleteNote: id missing/invalid");
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
  return true;
}
