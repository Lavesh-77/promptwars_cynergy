import { describe, expect, it } from "vitest";
import { request } from "../test/fixtures";
import {
  addDays,
  dateKey,
  rankRequests,
  relocationOptions,
  requestedFirst,
} from "./scheduler";
import {
  approveWithRelocation,
  decideRequest,
  loadState,
  saveState,
  transact,
} from "./store";
import type { LabState, Relocation } from "../types";

const date = addDays(dateKey(), 1);
function scenario(): LabState {
  return {
    version: 1,
    requests: [
      request({
        id: "flex",
        student: "Flexible Student",
        project: "Flexible project",
        status: "approved",
        createdAt: "2026-01-01T08:00:00Z",
      }),
      request({
        id: "fixed",
        student: "Fixed Student",
        project: "Fixed project",
        flexible: false,
        createdAt: "2026-01-01T09:00:00Z",
      }),
    ],
  };
}
const move: Relocation = {
  bookingId: "flex",
  from: { date, start: 600 },
  to: { date, start: 720 },
};

describe("deadline and flexibility priority", () => {
  it("keeps deadline first, then puts fixed requests before flexible requests", () => {
    const list = [
      request({ id: "flex" }),
      request({ id: "fixed", flexible: false }),
      request({ id: "urgent", deadline: date }),
    ];
    expect(rankRequests(list).map((r) => r.id)).toEqual([
      "urgent",
      "fixed",
      "flex",
    ]);
  });
  it("tags the earliest overlapping submission, not unrelated requests", () => {
    const { requests } = scenario();
    expect(requestedFirst(requests[0], requests)).toBe(true);
    expect(requestedFirst(requests[1], requests)).toBe(false);
    expect(requestedFirst(requests[0], [requests[0]])).toBe(false);
    expect(
      requestedFirst(requests[0], [
        requests[0],
        { ...requests[1], status: "rejected" },
      ]),
    ).toBe(false);
  });
});
describe("relocation recommendations", () => {
  it("offers only slots that make room for the fixed request", () => {
    const { requests } = scenario();
    const plan = relocationOptions(requests[1], requests)!;
    expect(plan.booking.id).toBe("flex");
    expect(plan.slots.length).toBeGreaterThan(0);
    for (const slot of plan.slots) {
      const next = approveWithRelocation(scenario(), "fixed", {
        ...move,
        to: slot,
      });
      expect(next.requests.every((r) => r.status === "approved")).toBe(true);
      expect(slot.date <= requests[0].deadline).toBe(true);
    }
  });
  it("does not propose moving a non-flexible or multiple blocking bookings", () => {
    const { requests } = scenario();
    expect(
      relocationOptions(requests[1], [
        { ...requests[0], flexible: false },
        requests[1],
      ]),
    ).toBeNull();
    const longFixed = { ...requests[1], duration: 120 };
    const blockers = [
      { ...requests[0], duration: 60 },
      request({ id: "second", start: 660, status: "approved" }),
      longFixed,
    ];
    expect(relocationOptions(longFixed, blockers)).toBeNull();
  });
  it("returns no alternatives if all possible time is booked", () => {
    const { requests } = scenario();
    const fixed = { ...requests[1], start: 540, duration: 240, deadline: date };
    const flex = { ...requests[0], start: 540, duration: 240, deadline: date };
    const afternoon = request({
      id: "afternoon",
      status: "approved",
      start: 780,
      duration: 240,
    });
    // Start from today with an additional full-day set of reservations to remove earlier options.
    const today = [
      request({
        id: "today-am",
        date: dateKey(),
        start: 540,
        duration: 240,
        status: "approved",
      }),
      request({
        id: "today-pm",
        date: dateKey(),
        start: 780,
        duration: 240,
        status: "approved",
      }),
    ];
    expect(
      relocationOptions(fixed, [flex, fixed, afternoon, ...today])?.slots,
    ).toEqual([]);
  });
});
describe("atomic faculty-confirmed relocation", () => {
  it("moves flexible booking and approves fixed booking with linked history", () => {
    const original = scenario();
    const next = approveWithRelocation(original, "fixed", move);
    expect(original.requests[0].start).toBe(600);
    expect(original.requests[1].status).toBe("pending");
    expect(next.requests[0]).toMatchObject({ status: "approved", start: 720 });
    expect(next.requests[1]).toMatchObject({ status: "approved", start: 600 });
    expect(next.requests[0].history?.at(-1)).toMatchObject({
      action: "rescheduled",
      from: move.from,
      to: move.to,
      relatedRequestId: "fixed",
    });
    expect(next.requests[1].history?.at(-1)).toMatchObject({
      action: "approved",
      relatedRequestId: "flex",
    });
    expect(next.requests[0].history?.at(-1)?.at).toBe(
      next.requests[1].history?.at(-1)?.at,
    );
  });
  it("can move an earlier-deadline flexible project if its deadline is still met", () => {
    const state = scenario();
    state.requests[0].deadline = date;
    expect(approveWithRelocation(state, "fixed", move).requests[0].start).toBe(
      720,
    );
  });
  it("refuses a replacement after the flexible deadline without mutating either request", () => {
    const state = scenario();
    state.requests[0].deadline = date;
    expect(() =>
      approveWithRelocation(state, "fixed", {
        ...move,
        to: { date: addDays(date, 1), start: 720 },
      }),
    ).toThrow();
    expect(state.requests[0].start).toBe(600);
    expect(state.requests[1].status).toBe("pending");
  });
  it("refuses a replacement overlapping the incoming fixed request", () => {
    expect(() =>
      approveWithRelocation(scenario(), "fixed", {
        ...move,
        to: { date, start: 630 },
      }),
    ).toThrow("no longer available");
  });
  it("rechecks latest availability and saves neither change on failure", async () => {
    saveState(scenario());
    await transact((s) => ({
      ...s,
      requests: [
        ...s.requests,
        request({ id: "new-booking", start: 720, status: "approved" }),
      ],
    }));
    await expect(
      transact((s) => approveWithRelocation(s, "fixed", move)),
    ).rejects.toThrow("no longer available");
    expect(loadState().requests.find((r) => r.id === "flex")?.start).toBe(600);
    expect(loadState().requests.find((r) => r.id === "fixed")?.status).toBe(
      "pending",
    );
  });
  it("refuses stale plans, non-flexible blockers, and repeat confirmation", () => {
    const state = scenario();
    expect(() =>
      approveWithRelocation(state, "fixed", {
        ...move,
        from: { date, start: 570 },
      }),
    ).toThrow("has changed");
    const fixedBlocker = scenario();
    fixedBlocker.requests[0].flexible = false;
    expect(() => approveWithRelocation(fixedBlocker, "fixed", move)).toThrow(
      "conflict has changed",
    );
    const next = approveWithRelocation(state, "fixed", move);
    expect(() => approveWithRelocation(next, "fixed", move)).toThrow(
      "pending exact-slot",
    );
  });
  it("refuses multiple blockers and retains both approvals and the pending request", () => {
    const state = scenario();
    state.requests[1].duration = 120;
    state.requests.push(
      request({ id: "second-blocker", start: 660, status: "approved" }),
    );
    expect(() => approveWithRelocation(state, "fixed", move)).toThrow(
      "conflict has changed",
    );
    expect(state.requests.map((r) => r.status)).toEqual([
      "approved",
      "pending",
      "approved",
    ]);
  });
  it("persists linked rescheduling histories through a reload", async () => {
    saveState(scenario());
    await transact((s) => approveWithRelocation(s, "fixed", move));
    const reloaded = loadState();
    expect(reloaded.requests[0].history?.at(-1)?.action).toBe("rescheduled");
    expect(reloaded.requests[1].history?.at(-1)?.relatedRequestId).toBe("flex");
    expect(reloaded.requests[0].createdAt).toBe(
      scenario().requests[0].createdAt,
    );
  });
  it("preserves old browser data and appends later approval/rejection timestamps", () => {
    saveState(scenario());
    expect(loadState().requests).toHaveLength(2);
    const next = decideRequest(scenario(), "fixed", "rejected");
    expect(next.requests[1].history?.map((e) => e.action)).toEqual([
      "submitted",
      "rejected",
    ]);
  });
});
