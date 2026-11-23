import { describe, expect, it } from "vitest";
import { request } from "../test/fixtures";
import {
  isAvailable,
  recommendSlots,
  relocationOptions,
  stockCount,
} from "./scheduler";
import {
  approveWithRelocation,
  decideRequest,
  loadState,
  saveState,
  updateStock,
} from "./store";
import type { LabState } from "../types";

describe("equipment stock", () => {
  it("provides multiple units for selected catalogue resources", () => {
    expect(stockCount("arduino")).toBe(3);
    expect(stockCount("pi")).toBe(2);
    expect(stockCount("oscilloscope")).toBe(1);
  });
  it("allows approvals up to capacity, then rejects and recommends alternatives", () => {
    let state: LabState = {
      version: 1,
      stock: { oscilloscope: 2 },
      requests: [request(), request({ id: "two" }), request({ id: "three" })],
    };
    state = decideRequest(state, "one", "approved");
    state = decideRequest(state, "two", "approved");
    expect(() => decideRequest(state, "three", "approved")).toThrow(
      "already booked",
    );
    expect(
      recommendSlots(state.requests[2], state.requests, state.stock).every(
        (slot) => slot.start !== 600 || slot.date !== request().date,
      ),
    ).toBe(true);
  });
  it("counts simultaneous use, not every booking intersecting a long session", () => {
    const bookings = [
      request({ status: "approved", start: 600, duration: 30 }),
      request({ id: "two", status: "approved", start: 630, duration: 30 }),
    ];
    expect(
      isAvailable(
        bookings,
        "oscilloscope",
        request().date,
        600,
        60,
        undefined,
        { oscilloscope: 2 },
      ),
    ).toBe(true);
    expect(isAvailable(bookings, "oscilloscope", request().date, 660, 60)).toBe(
      true,
    );
  });
  it("validates stock and refuses reductions that overbook approvals without changing state", () => {
    const state: LabState = {
      version: 1,
      stock: { oscilloscope: 2 },
      requests: [
        request({ status: "approved" }),
        request({ id: "two", status: "approved" }),
      ],
    };
    expect(() => updateStock(state, "oscilloscope", 1)).toThrow(
      "existing simultaneous",
    );
    expect(state.stock?.oscilloscope).toBe(2);
    for (const value of [0, -1, 1.5, 101, NaN])
      expect(() => updateStock(state, "oscilloscope", value)).toThrow(
        "whole number",
      );
    expect(() => updateStock(state, "unknown", 2)).toThrow();
    expect(updateStock(state, "oscilloscope", 3).stock?.oscilloscope).toBe(3);
  });
  it("preserves legacy requests and persists stock edits", () => {
    const legacy: LabState = { version: 1, requests: [request()] };
    saveState(legacy);
    expect(loadState()).toEqual(legacy);
    saveState(updateStock(loadState(), "oscilloscope", 3));
    expect(loadState().stock?.oscilloscope).toBe(3);
    expect(loadState().requests).toEqual(legacy.requests);
  });
  it("moves only one flexible booking when stock is full and does not move when capacity is free", () => {
    const fixed = request({ id: "fixed", flexible: false });
    const state: LabState = {
      version: 1,
      stock: { oscilloscope: 2 },
      requests: [
        request({ status: "approved" }),
        request({ id: "two", status: "approved", flexible: false }),
        fixed,
      ],
    };
    const plan = relocationOptions(fixed, state.requests, state.stock)!;
    expect(plan.booking.id).toBe("one");
    const updated = approveWithRelocation(state, fixed.id, {
      bookingId: plan.booking.id,
      from: plan.booking,
      to: plan.slots[0],
    });
    expect(updated.requests.find((r) => r.id === fixed.id)?.status).toBe(
      "approved",
    );
    expect(updated.requests.find((r) => r.id === "two")).toEqual(
      state.requests[1],
    );
    expect(
      relocationOptions(fixed, state.requests, { oscilloscope: 3 }),
    ).toBeNull();
  });
});
