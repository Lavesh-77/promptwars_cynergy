import { addDays, dateKey } from "../lib/scheduler";
import type { AccessRequest } from "../types";

const date = addDays(dateKey(), 1);
export const request = (
  overrides: Partial<AccessRequest> = {},
): AccessRequest => ({
  id: "one",
  equipmentId: "oscilloscope",
  student: "Alex Demo",
  project: "Signal prototype",
  description: "Test a sensor with the oscilloscope.",
  date,
  deadline: addDays(date, 3),
  start: 600,
  duration: 60,
  flexible: true,
  status: "pending",
  createdAt: "2026-01-01T09:00:00Z",
  ...overrides,
});
