import { describe, expect, it } from "vitest";
import { request } from "../test/fixtures";
import { utilizationSummary } from "./utilization";

describe("seven-day utilisation", () => {
  it("accounts for stock capacity, approved time, and pending demand", () => {
    const summary = utilizationSummary(
      {
        version: 1,
        stock: { oscilloscope: 2 },
        requests: [
          request({ status: "approved", duration: 120 }),
          request({ id: "two", status: "pending", duration: 60 }),
          request({
            id: "outside",
            status: "approved",
            date: "2099-12-31",
          }),
        ],
      },
      request().date,
    );
    expect(summary).toMatchObject({
      bookedMinutes: 120,
      pendingMinutes: 60,
      approvedSessions: 1,
      busiest: {
        equipmentId: "oscilloscope",
        bookedMinutes: 120,
      },
    });
    // Default catalogue capacity plus one additional oscilloscope unit.
    expect(summary.capacityMinutes).toBe(18 * 8 * 60 * 7);
    expect(summary.utilizationPercent).toBe(0.2);
  });
  it("returns an honest empty-window summary", () => {
    expect(
      utilizationSummary({ version: 1, requests: [] }, "2099-01-01"),
    ).toMatchObject({
      bookedMinutes: 0,
      pendingMinutes: 0,
      approvedSessions: 0,
      busiest: null,
      utilizationPercent: 0,
    });
  });
});
