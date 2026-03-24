const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isExpandedRecurringInstanceId(value) {
  return typeof value === "string" && value.includes("__");
}

export function splitExpandedInstanceId(value) {
  if (!isExpandedRecurringInstanceId(value)) {
    return {
      masterId: UUID_RE.test(value || "") ? value : null,
      occurrenceStartAt: null,
    };
  }

  const [masterId, occurrenceStartAt] = value.split("__");

  return {
    masterId: UUID_RE.test(masterId || "") ? masterId : null,
    occurrenceStartAt: occurrenceStartAt || null,
  };
}

export function getRealEventId(eventLike) {
  if (!eventLike) return null;

  if (typeof eventLike === "string") {
    if (isExpandedRecurringInstanceId(eventLike)) {
      return splitExpandedInstanceId(eventLike).masterId;
    }
    return UUID_RE.test(eventLike) ? eventLike : null;
  }

  if (
    eventLike.recurringInstanceOf &&
    UUID_RE.test(eventLike.recurringInstanceOf)
  ) {
    return eventLike.recurringInstanceOf;
  }

  if (
    typeof eventLike.id === "string" &&
    isExpandedRecurringInstanceId(eventLike.id)
  ) {
    return splitExpandedInstanceId(eventLike.id).masterId;
  }

  if (UUID_RE.test(eventLike.id || "")) {
    return eventLike.id;
  }

  return null;
}

export function getOccurrenceStartAt(eventLike) {
  if (!eventLike) return null;

  if (typeof eventLike === "string") {
    if (isExpandedRecurringInstanceId(eventLike)) {
      return splitExpandedInstanceId(eventLike).occurrenceStartAt;
    }
    return null;
  }

  if (eventLike.originalStartAt) return eventLike.originalStartAt;
  if (eventLike.original_start_at) return eventLike.original_start_at;

  if (
    typeof eventLike.id === "string" &&
    isExpandedRecurringInstanceId(eventLike.id)
  ) {
    return splitExpandedInstanceId(eventLike.id).occurrenceStartAt;
  }

  if (eventLike.recurringInstanceOf) {
    return eventLike.start_at || eventLike.start_date || null;
  }

  return null;
}

export function isRecurringInstance(eventLike) {
  if (!eventLike) return false;

  if (typeof eventLike === "string") {
    return isExpandedRecurringInstanceId(eventLike);
  }

  return Boolean(
    eventLike.recurringInstanceOf ||
      eventLike.originalStartAt ||
      eventLike.original_start_at ||
      (typeof eventLike.id === "string" &&
        isExpandedRecurringInstanceId(eventLike.id))
  );
}

export function assertRealDbId(eventLike) {
  const id = getRealEventId(eventLike);

  if (!id || isExpandedRecurringInstanceId(id)) {
    throw new Error(`Invalid DB event id: ${String(id)}`);
  }

  return id;
}