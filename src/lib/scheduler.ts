import { z } from "zod";
import type { AccessRequest, Slot } from "../types";
import { equipment } from "../data";

export const OPEN = 9 * 60;
export const CLOSE = 17 * 60;
// All dates are campus wall-clock dates; no UTC conversion is used for slots.
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}
const validDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const d = new Date(`${value}T12:00:00`);
    return !Number.isNaN(d.getTime()) && dateKey(d) === value;
  }, "Enter a valid calendar date.");
export const requestSchema = z
  .object({
    equipmentId: z
      .string()
      .refine(
        (id) => equipment.some((item) => item.id === id),
        "Select valid equipment.",
      ),
    student: z
      .string()
      .trim()
      .min(2, "Enter at least 2 characters for your name.")
      .max(60),
    project: z
      .string()
      .trim()
      .min(3, "Enter a project title with at least 3 characters.")
      .max(100),
    description: z
      .string()
      .trim()
      .min(10, "Describe your project in at least 10 characters.")
      .max(1000),
    deadline: validDate,
    date: validDate,
    start: z
      .number()
      .int()
      .min(OPEN)
      .max(CLOSE - 30)
      .multipleOf(30),
    duration: z.number().int().min(30).max(240).multipleOf(30),
    flexible: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.start + value.duration > CLOSE)
      ctx.addIssue({
        code: "custom",
        path: ["start"],
        message: "Your session must finish by 17:00.",
      });
    if (value.date < dateKey())
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "Choose today or a future date.",
      });
    if (value.date > addDays(dateKey(), 30))
      ctx.addIssue({
        code: "custom",
        path: ["date"],
        message: "Book within the next 30 days.",
      });
    if (value.deadline < value.date)
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "The project deadline must be on or after the session date.",
      });
    if (
      value.date === dateKey() &&
      value.start <= new Date().getHours() * 60 + new Date().getMinutes()
    )
      ctx.addIssue({
        code: "custom",
        path: ["start"],
        message: "Choose a session that has not started yet.",
      });
  });
export function timeLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
export function prettyDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}
export function overlaps(
  a: Pick<AccessRequest, "start" | "duration">,
  b: Pick<AccessRequest, "start" | "duration">,
): boolean {
  return a.start < b.start + b.duration && b.start < a.start + a.duration;
}
export function isAvailable(
  requests: AccessRequest[],
  equipmentId: string,
  date: string,
  start: number,
  duration: number,
  excludeId?: string,
): boolean {
  return (
    start >= OPEN &&
    start % 30 === 0 &&
    duration >= 30 &&
    duration <= 240 &&
    duration % 30 === 0 &&
    start + duration <= CLOSE &&
    !requests.some(
      (r) =>
        r.id !== excludeId &&
        r.status === "approved" &&
        r.equipmentId === equipmentId &&
        r.date === date &&
        overlaps(r, { start, duration }),
    )
  );
}
export function recommendSlots(
  request: Pick<
    AccessRequest,
    "equipmentId" | "date" | "deadline" | "start" | "duration" | "flexible"
  >,
  requests: AccessRequest[],
): Slot[] {
  const options: Slot[] = [];
  const last =
    request.deadline < addDays(dateKey(), 30)
      ? request.deadline
      : addDays(dateKey(), 30);
  for (let date = request.date; date <= last; date = addDays(date, 1)) {
    for (let start = OPEN; start + request.duration <= CLOSE; start += 30) {
      if (
        !request.flexible &&
        (date !== request.date || start !== request.start)
      )
        continue;
      if (
        date < dateKey() ||
        (date === dateKey() &&
          start <= new Date().getHours() * 60 + new Date().getMinutes())
      )
        continue;
      if (
        isAvailable(
          requests,
          request.equipmentId,
          date,
          start,
          request.duration,
        )
      ) {
        options.push({
          date,
          start,
          reason:
            date === request.date && start === request.start
              ? "Your preferred slot is available and finishes before your deadline."
              : `No booking overlap · full ${request.duration}-minute session · within your deadline.`,
        });
      }
    }
    if (options.length >= 16) break;
  }
  return options
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        Math.abs(a.start - request.start) - Math.abs(b.start - request.start) ||
        a.start - b.start,
    )
    .slice(0, 3);
}
export function rankRequests(requests: AccessRequest[]): AccessRequest[] {
  const used = (student: string) =>
    requests
      .filter(
        (r) =>
          r.status === "approved" &&
          r.student.toLowerCase() === student.toLowerCase(),
      )
      .reduce((sum, r) => sum + r.duration, 0);
  return requests
    .filter((r) => r.status === "pending")
    .sort(
      (a, b) =>
        a.deadline.localeCompare(b.deadline) ||
        used(a.student) - used(b.student) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
}
