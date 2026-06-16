import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SYSTEM_PROMPT = `You extract calendar events from family schedules (school PDFs, sports schedules, paper calendars, flyers, screenshots).

Return ONLY valid JSON with this shape:
{
  "events": [
    {
      "title": "string",
      "startDate": "YYYY-MM-DD",
      "startTime": "HH:mm" or null if all-day,
      "endTime": "HH:mm" or null,
      "allDay": boolean,
      "location": "string or empty",
      "event_type": "school|sports|appointment|holiday|family|other",
      "recurrence": "none|daily|weekly|monthly|yearly",
      "recurrenceByDay": ["MO","TU"] only for weekly,
      "notes": "extra context from source",
      "confidence": "high|medium|low",
      "isClosure": false
    }
  ],
  "warnings": ["string"],
  "sourceSummary": "one line describing what this schedule is"
}

Rules:
- Use the user's timezone context for ambiguous times.
- Prefer ISO dates. If year missing, infer from context or current school year.
- Tag school closures and holidays with event_type holiday and isClosure true.
- Detect recurring patterns (e.g. "Every Tuesday 6pm" → weekly + TU).
- Do not invent events not present in the source.
- If unsure of a date, set confidence to low and note in notes.`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

function heuristicParse(text: string, timezone: string) {
  const events: Record<string, unknown>[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const dateRe =
    /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?)\b/i;
  const timeRe = /\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\b/i;

  for (const line of lines) {
    const dateMatch = line.match(dateRe);
    if (!dateMatch) continue;
    const timeMatch = line.match(timeRe);
    const title = line
      .replace(dateRe, "")
      .replace(timeRe, "")
      .replace(/[-–—|]/g, " ")
      .trim()
      .slice(0, 120);
    if (title.length < 3) continue;

    events.push({
      title,
      startDate: dateMatch[1],
      startTime: timeMatch ? timeMatch[1] : null,
      endTime: null,
      allDay: !timeMatch,
      location: "",
      event_type: /school|closure|no school/i.test(line)
        ? "school"
        : /soccer|practice|game|sport/i.test(line)
          ? "sports"
          : "other",
      recurrence: "none",
      recurrenceByDay: [],
      notes: "Heuristic parse — please verify dates",
      confidence: "low",
      isClosure: /closure|no school|holiday/i.test(line),
    });
  }

  return {
    events: events.slice(0, 40),
    warnings: [
      "AI key not configured — used basic text parsing. Review every date carefully.",
      `Timezone: ${timezone}`,
    ],
    sourceSummary: "Schedule text (heuristic parse)",
  };
}

async function callOpenAI({
  apiKey,
  mode,
  text,
  base64,
  mimeType,
  hint,
  timezone,
}: {
  apiKey: string;
  mode: string;
  text?: string;
  base64?: string;
  mimeType?: string;
  hint?: string;
  timezone?: string;
}) {
  const userContext = `Timezone: ${timezone || "America/New_York"}. Schedule type hint: ${hint || "general family calendar"}.`;

  let userContent: unknown;
  if (mode === "image" && base64 && mimeType) {
    userContent = [
      { type: "text", text: userContext },
      {
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64}` },
      },
    ];
  } else {
    userContent = `${userContext}\n\nSchedule text:\n${text || ""}`.slice(
      0,
      120000
    );
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty AI response");
  return JSON.parse(raw);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Missing Supabase env" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const mode = body.mode === "image" ? "image" : "text";
    const timezone = body.timezone || "America/New_York";
    const hint = body.hint || "";
    const fileName = body.fileName || "upload";

    let result;
    if (openaiKey) {
      result = await callOpenAI({
        apiKey: openaiKey,
        mode,
        text: body.text,
        base64: body.base64,
        mimeType: body.mimeType,
        hint,
        timezone,
      });
    } else if (mode === "text" && body.text) {
      result = heuristicParse(body.text, timezone);
    } else {
      return json(
        {
          error:
            "OPENAI_API_KEY not configured on Supabase. Add it for photo/PDF scanning, or paste schedule text.",
        },
        503
      );
    }

    const events = (result.events ?? []).map(
      (e: Record<string, unknown>, i: number) => ({
        id: `scan-${i}-${crypto.randomUUID().slice(0, 8)}`,
        selected: (e.confidence as string) !== "low",
        title: String(e.title || "Untitled event").slice(0, 200),
        startDate: e.startDate || null,
        startTime: e.startTime || null,
        endTime: e.endTime || null,
        allDay: Boolean(e.allDay),
        location: String(e.location || "").slice(0, 200),
        event_type: e.event_type || "other",
        recurrence: e.recurrence || "none",
        recurrenceByDay: Array.isArray(e.recurrenceByDay)
          ? e.recurrenceByDay
          : [],
        notes: String(e.notes || "").slice(0, 500),
        confidence: e.confidence || "medium",
        isClosure: Boolean(e.isClosure),
      })
    );

    return json({
      events,
      warnings: result.warnings ?? [],
      sourceSummary: result.sourceSummary || `Imported from ${fileName}`,
      parser: openaiKey ? "openai" : "heuristic",
    });
  } catch (err) {
    console.error("parse-calendar-import:", err);
    return json(
      { error: err instanceof Error ? err.message : "Parse failed" },
      500
    );
  }
});
