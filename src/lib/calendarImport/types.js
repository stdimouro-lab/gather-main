/** @typedef {'school'|'sports'|'appointment'|'holiday'|'family'|'other'} ImportEventType */

/**
 * @typedef {Object} ScannedEvent
 * @property {string} id
 * @property {boolean} selected
 * @property {string} title
 * @property {string|null} startDate
 * @property {string|null} startTime
 * @property {string|null} endTime
 * @property {boolean} allDay
 * @property {string} location
 * @property {ImportEventType} event_type
 * @property {string} recurrence
 * @property {string[]} recurrenceByDay
 * @property {string} notes
 * @property {'high'|'medium'|'low'} confidence
 * @property {boolean} isClosure
 * @property {boolean} [isDuplicate]
 * @property {string} [duplicateReason]
 */

export const IMPORT_HINTS = [
  { id: "school", label: "School calendar / PDF" },
  { id: "sports", label: "Sports / team schedule" },
  { id: "daycare", label: "Daycare / class schedule" },
  { id: "work", label: "Work schedule screenshot" },
  { id: "flyer", label: "Holiday / event flyer" },
  { id: "paper", label: "Paper calendar photo" },
  { id: "general", label: "Other schedule" },
];

export const EVENT_TYPE_OPTIONS = [
  { value: "school", label: "School" },
  { value: "sports", label: "Sports" },
  { value: "appointment", label: "Appointment" },
  { value: "holiday", label: "Holiday" },
  { value: "family", label: "Family" },
  { value: "other", label: "Other" },
];

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];
