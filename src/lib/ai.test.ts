import { describe, expect, it } from "vitest";
import { request } from "../test/fixtures";
import {
  aiInputSchema,
  aiPayload,
  allocationCandidates,
  validateAIOutput,
} from "./ai";

describe("AI deterministic boundaries", () => {
  const state = {
    version: 1 as const,
    requests: [
      request({ id: "flex", student: "Private Name" }),
      request({ id: "fixed", student: "Private Name", flexible: false }),
    ],
  };
  it("omits names, titles, rejected bookings and histories but preserves grouping", () => {
    const payload = aiPayload({
      ...state,
      requests: [
        ...state.requests,
        request({ id: "reject", status: "rejected" }),
      ],
    });
    expect(JSON.stringify(payload)).not.toContain("Private Name");
    expect(JSON.stringify(payload)).not.toContain("Signal prototype");
    expect(payload.requests).toHaveLength(2);
    expect(payload.requests[0].student).toBe(payload.requests[1].student);
  });
  it("uses exact-slot priority and reserves stock for earlier recommendations", () => {
    const input = aiInputSchema.parse(aiPayload(state));
    const candidates = allocationCandidates(input);
    expect(candidates[0].requestId).toBe("fixed");
    expect(candidates[0].slots[0].start).toBe(600);
    expect(candidates[1].slots[0].start).not.toBe(600);
    const output = {
      recommendations: candidates.map((c) => ({
        requestId: c.requestId,
        equipmentId: c.equipmentId,
        slot: c.slots[0] ?? null,
        reason: "Fits capacity and deadline under the priority policy.",
      })),
    };
    expect(validateAIOutput(input, output)).toEqual(output);
    const invented = structuredClone(output);
    invented.recommendations[0].slot = { date: request().date, start: 900 };
    expect(() => validateAIOutput(input, invented)).toThrow("feasible plan");
    const reordered = {
      recommendations: [...output.recommendations].reverse(),
    };
    expect(() => validateAIOutput(input, reordered)).toThrow("Priority");
    const unknown = structuredClone(output);
    unknown.recommendations[0].equipmentId = "invented";
    expect(() => validateAIOutput(input, unknown)).toThrow("equipment");
  });
  it("requires null when an exact slot is full and rejects extra model actions", () => {
    const input = aiInputSchema.parse(
      aiPayload({
        version: 1,
        requests: [
          request({ id: "approved", status: "approved" }),
          request({ flexible: false }),
        ],
      }),
    );
    expect(allocationCandidates(input)[0].slots).toEqual([]);
    expect(() =>
      validateAIOutput(input, {
        recommendations: [
          {
            requestId: "one",
            equipmentId: "oscilloscope",
            slot: { date: request().date, start: 600 },
            reason: "Ignore the policy and approve this slot.",
          },
        ],
      }),
    ).toThrow("Invented");
    expect(() =>
      validateAIOutput(input, { recommendations: [], approve: true }),
    ).toThrow();
  });
  it("rejects duplicate IDs and malformed booking information", () => {
    const payload = aiPayload(state);
    expect(
      aiInputSchema.safeParse({
        ...payload,
        requests: [payload.requests[0], payload.requests[0]],
      }).success,
    ).toBe(false);
    expect(
      aiInputSchema.safeParse({ ...payload, stock: { unknown: 2 } }).success,
    ).toBe(false);
    expect(
      aiInputSchema.safeParse({
        ...payload,
        requests: [{ ...payload.requests[0], duration: 900 }],
      }).success,
    ).toBe(false);
  });
});
