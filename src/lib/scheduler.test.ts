import { describe, expect, it } from "vitest";
import {
  addDays,
  dateKey,
  isAvailable,
  overlaps,
  rankRequests,
  recommendSlots,
  requestSchema,
} from "./scheduler";
import { request } from "../test/fixtures";

const date = addDays(dateKey(), 1);
describe("scheduling safety", () => {
  it("detects overlap but allows adjacent sessions", () => {
    expect(
      overlaps({ start: 600, duration: 60 }, { start: 630, duration: 60 }),
    ).toBe(true);
    expect(
      overlaps({ start: 600, duration: 60 }, { start: 660, duration: 60 }),
    ).toBe(false);
  });
  it("only approved bookings reserve equipment and only on the same day", () => {
    expect(isAvailable([request()], "oscilloscope", date, 600, 60)).toBe(true);
    expect(
      isAvailable(
        [request({ status: "approved" })],
        "oscilloscope",
        date,
        600,
        60,
      ),
    ).toBe(false);
    expect(
      isAvailable([request({ status: "approved" })], "gpu", date, 600, 60),
    ).toBe(true);
    expect(
      isAvailable(
        [request({ status: "approved" })],
        "oscilloscope",
        addDays(date, 1),
        600,
        60,
      ),
    ).toBe(true);
  });
  it("rejects out-of-hours and invalid durations", () => {
    expect(isAvailable([], "oscilloscope", date, 990, 60)).toBe(false);
    expect(isAvailable([], "oscilloscope", date, 530, 60)).toBe(false);
    expect(isAvailable([], "oscilloscope", date, 600, 0)).toBe(false);
    expect(isAvailable([], "oscilloscope", date, 600, 45)).toBe(false);
  });
  it("recommends feasible alternatives before the deadline", () => {
    const booked = request({ status: "approved", duration: 120 });
    const options = recommendSlots(request(), [booked]);
    expect(options).toHaveLength(3);
    for (const slot of options) {
      expect(
        isAvailable([booked], "oscilloscope", slot.date, slot.start, 60),
      ).toBe(true);
      expect(slot.date <= request().deadline).toBe(true);
    }
  });
  it("does not move exact-slot requests", () => {
    expect(
      recommendSlots(request({ flexible: false }), [
        request({ status: "approved" }),
      ]),
    ).toEqual([]);
  });
  it("returns no options when the entire deadline day is full", () => {
    const bookings = [
      request({ status: "approved", start: 540, duration: 240 }),
      request({ id: "two", status: "approved", start: 780, duration: 240 }),
    ];
    expect(recommendSlots(request({ deadline: date }), bookings)).toEqual([]);
  });
});
describe("fair ranking", () => {
  it("prioritises deadline, then fewer approved minutes, then submission time", () => {
    const used = request({
      id: "used",
      student: "Heavy User",
      status: "approved",
    });
    const a = request({ id: "a", student: "Heavy User" });
    const b = request({
      id: "b",
      student: "New User",
      createdAt: "2026-01-02T09:00:00Z",
    });
    const urgent = request({ id: "urgent", deadline: date });
    expect(rankRequests([used, a, b, urgent]).map((r) => r.id)).toEqual([
      "urgent",
      "b",
      "a",
    ]);
  });
  it("breaks equal usage ties by submission time", () => {
    expect(
      rankRequests([
        request({ id: "late", createdAt: "2026-01-02" }),
        request({ id: "early" }),
      ]).map((r) => r.id),
    ).toEqual(["early", "late"]);
  });
});
describe("request validation", () => {
  it("accepts valid requests and trims text", () => {
    expect(
      requestSchema.parse(request({ student: "  Alex Demo  " })).student,
    ).toBe("Alex Demo");
  });
  it.each([
    { student: "" },
    { description: "short" },
    { equipmentId: "invented" },
    { duration: -30 },
    { start: 990, duration: 60 },
    { deadline: addDays(date, -1) },
    { date: "2026-02-30" },
    { date: addDays(dateKey(), -1) },
    { date: addDays(dateKey(), 31) },
  ])("rejects invalid input %j", (invalid) => {
    expect(requestSchema.safeParse(request(invalid)).success).toBe(false);
  });
});
