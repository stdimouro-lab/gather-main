/**
 * Pip — lightweight list assistant (rule-based, no API key required).
 * Suggests starter items from list/event titles and skips duplicates.
 */

const TEMPLATES = [
  {
    match: /grocery|groceries|shopping|market|costco|trader|whole foods/i,
    items: [
      "Milk",
      "Eggs",
      "Bread",
      "Fresh fruit",
      "Vegetables",
      "Snacks",
      "Coffee or tea",
      "Paper towels",
    ],
  },
  {
    match: /packing|pack|suitcase|trip|travel|flight|vacation/i,
    items: [
      "Toiletries",
      "Phone charger",
      "Comfortable shoes",
      "Weather-appropriate clothes",
      "Medications",
      "Travel documents",
      "Snacks for the road",
    ],
  },
  {
    match: /camping|hike|outdoor|tent/i,
    items: [
      "Tent and stakes",
      "Sleeping bag",
      "Flashlight or headlamp",
      "Water bottles",
      "Snacks",
      "First aid kit",
      "Sunscreen",
      "Warm layer",
    ],
  },
  {
    match: /party|birthday|celebration|bbq|barbecue/i,
    items: [
      "Decorations",
      "Plates and cups",
      "Drinks",
      "Ice",
      "Main dish or catering",
      "Dessert",
      "Garbage bags",
      "Music playlist",
    ],
  },
  {
    match: /school|class|homework|supplies/i,
    items: [
      "Notebooks",
      "Pens and pencils",
      "Backpack check",
      "Lunch or snacks",
      "Permission slips",
      "Calendar review",
    ],
  },
  {
    match: /baby|shower|newborn/i,
    items: [
      "Diapers",
      "Wipes",
      "Onesies",
      "Blankets",
      "Bottles",
      "Gift for parents",
    ],
  },
  {
    match: /wedding|rehearsal/i,
    items: [
      "Outfit ready",
      "Gift",
      "RSVP confirmations",
      "Transportation",
      "Speech or card",
      "Phone charged for photos",
    ],
  },
  {
    match: /clean|cleaning|chores|house/i,
    items: [
      "Kitchen counters",
      "Floors",
      "Bathrooms",
      "Laundry",
      "Trash",
      "Vacuum",
    ],
  },
  {
    match: /meal|dinner|lunch|prep|cook|recipe/i,
    items: [
      "Check recipe",
      "Buy ingredients",
      "Prep vegetables",
      "Set the table",
      "Timing for oven/stove",
      "Leftover containers",
    ],
  },
];

function normalizeItem(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase();
}

function pickTemplate(haystack) {
  for (const template of TEMPLATES) {
    if (template.match.test(haystack)) {
      return template;
    }
  }
  return null;
}

function titleBasedItems(title) {
  const clean = String(title ?? "").trim();
  if (!clean || clean.length < 3) {
    return [
      "First thing to remember",
      "Second thing to remember",
      "Anything else?",
    ];
  }

  return [
    `Plan for ${clean}`,
    `Supplies for ${clean}`,
    `Day-of checklist for ${clean}`,
    "Review and mark done",
  ];
}

/**
 * @param {object} options
 * @param {string} [options.listTitle]
 * @param {string} [options.eventTitle]
 * @param {string[]} [options.existingItems]
 * @returns {{ items: string[], summary: string }}
 */
export function generatePipListSuggestions({
  listTitle = "",
  eventTitle = "",
  existingItems = [],
}) {
  const haystack = `${listTitle} ${eventTitle}`.trim();
  const template = pickTemplate(haystack);
  const rawItems = template ? template.items : titleBasedItems(listTitle || eventTitle);

  const existing = new Set(
    existingItems.map(normalizeItem).filter(Boolean)
  );

  const items = rawItems.filter((item) => !existing.has(normalizeItem(item)));

  const summary = template
    ? `Pip found ${items.length} ${items.length === 1 ? "item" : "items"} for your ${listTitle || "list"}.`
    : items.length
      ? `Pip suggested ${items.length} starter ${items.length === 1 ? "item" : "items"} based on your list name.`
      : "Your list already has these suggestions — add a few items manually or rename the list.";

  return { items, summary };
}
