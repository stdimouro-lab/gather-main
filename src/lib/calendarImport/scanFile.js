import { supabase } from "@/lib/supabase";
import { getBrowserTimezone } from "@/lib/profileSettings";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const PDF_TYPE = "application/pdf";
const MAX_BYTES = 12 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function extractPdfText(file) {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const parts = [];

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(line);
  }

  return parts.join("\n").trim();
}

/**
 * Scan a schedule file via Supabase Edge Function.
 */
export async function scanCalendarFile({
  file,
  hint = "general",
  timezone = getBrowserTimezone(),
}) {
  if (!file) throw new Error("Choose a file to scan.");
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large (max 12 MB). Try a clearer photo.");
  }

  const mime = file.type || "";
  let body;

  if (IMAGE_TYPES.has(mime)) {
    const base64 = await fileToBase64(file);
    body = {
      mode: "image",
      base64,
      mimeType: mime,
      hint,
      timezone,
      fileName: file.name,
    };
  } else if (mime === PDF_TYPE || file.name.toLowerCase().endsWith(".pdf")) {
    const text = await extractPdfText(file);
    if (!text || text.length < 20) {
      throw new Error(
        "Could not read text from this PDF. Try a photo of the schedule instead."
      );
    }
    body = {
      mode: "text",
      text,
      hint,
      timezone,
      fileName: file.name,
    };
  } else {
    throw new Error("Upload a JPG, PNG, WebP, or PDF schedule.");
  }

  const { data, error } = await supabase.functions.invoke(
    "parse-calendar-import",
    { body }
  );

  if (error) {
    throw new Error(error.message || "Scan failed.");
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    events: data.events ?? [],
    warnings: data.warnings ?? [],
    sourceSummary: data.sourceSummary ?? "",
    parser: data.parser ?? "unknown",
    sourceFileName: file.name,
  };
}

export async function scanCalendarText({
  text,
  hint = "general",
  timezone = getBrowserTimezone(),
}) {
  const clean = String(text ?? "").trim();
  if (clean.length < 10) {
    throw new Error("Paste more schedule text to scan.");
  }

  const { data, error } = await supabase.functions.invoke(
    "parse-calendar-import",
    {
      body: {
        mode: "text",
        text: clean,
        hint,
        timezone,
        fileName: "pasted-text",
      },
    }
  );

  if (error) throw new Error(error.message || "Scan failed.");
  if (data?.error) throw new Error(data.error);

  return {
    events: data.events ?? [],
    warnings: data.warnings ?? [],
    sourceSummary: data.sourceSummary ?? "",
    parser: data.parser ?? "unknown",
    sourceFileName: null,
  };
}
