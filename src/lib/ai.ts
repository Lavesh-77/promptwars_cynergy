import { z } from "zod";
import { equipment } from "../data";
import type { AccessRequest, LabState } from "../types";
import {
  isAvailable,
  rankRequests,
  recommendSlots,
  requestSchema,
} from "./scheduler";

export const aiInputSchema = z
  .object({
    requests: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            equipmentId: z.string().max(100),
            student: z.string().min(1).max(60),
            description: z.string().max(1000),
            deadline: z.string().max(10),
            date: z.string().max(10),
            start: z.number().int(),
            duration: z.number().int(),
            flexible: z.boolean(),
            status: z.enum(["pending", "approved"]),
            createdAt: z.string().datetime(),
          })
          .strict(),
      )
      .max(100),
    stock: z
      .record(
        z.string().refine((id) => equipment.some((e) => e.id === id)),
        z.number().int().min(1).max(100),
      )
      .optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const ids = new Set<string>();
    input.requests.forEach((r, index) => {
      const valid = requestSchema.safeParse({
        ...r,
        student: "Demo student",
        project: "Demo project",
      });
      // Historic approvals are retained for capacity and fair-share calculations.
      const structural =
        equipment.some((e) => e.id === r.equipmentId) &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        r.start >= 540 &&
        r.start + r.duration <= 1020 &&
        r.start % 30 === 0 &&
        r.duration >= 30 &&
        r.duration <= 240 &&
        r.duration % 30 === 0;
      if (
        ids.has(r.id) ||
        !structural ||
        (r.status === "pending" && !valid.success)
      )
        ctx.addIssue({
          code: "custom",
          path: ["requests", index],
          message: "Invalid or duplicate scheduling request.",
        });
      ids.add(r.id);
    });
  });
export type AIInput = z.infer<typeof aiInputSchema>;

// Names and titles never leave the browser. Stable aliases retain fair-share grouping.
export function aiPayload(state: LabState): AIInput {
  const aliases = new Map<string, string>();
  const requests = state.requests
    .filter((r) => r.status !== "rejected")
    .map((r) => {
      const name = r.student.toLowerCase();
      if (!aliases.has(name)) aliases.set(name, `student-${aliases.size + 1}`);
      return {
        id: r.id,
        equipmentId: r.equipmentId,
        student: aliases.get(name)!,
        description: r.description,
        deadline: r.deadline,
        date: r.date,
        start: r.start,
        duration: r.duration,
        flexible: r.flexible,
        status: r.status as "pending" | "approved",
        createdAt: r.createdAt,
      };
    });
  return { requests, stock: state.stock };
}
export function allocationCandidates(input: AIInput) {
  const requests: AccessRequest[] = input.requests.map((r) => ({
    ...r,
    project: "Demo project",
  }));
  const reserved = [...requests];
  return rankRequests(requests)
    .slice(0, 8)
    .map((r, index) => {
      const slots = recommendSlots(r, reserved, input.stock);
      // Reserve the first candidate before processing lower-priority requests.
      // This makes the proposed plan jointly feasible, not merely feasible per row.
      const slot = slots[0];
      if (slot)
        reserved.push({
          ...r,
          id: `proposal-${r.id}`,
          ...slot,
          status: "approved",
        });
      return {
        requestId: r.id,
        priority: index + 1,
        equipmentId: r.equipmentId,
        equipment: equipment.find((e) => e.id === r.equipmentId)!.name,
        requirements: r.description,
        deadline: r.deadline,
        flexible: r.flexible,
        duration: r.duration,
        slots: slot ? [{ date: slot.date, start: slot.start }] : [],
      };
    });
}
export const aiOutputSchema = z
  .object({
    recommendations: z
      .array(
        z
          .object({
            requestId: z.string().min(1).max(100),
            equipmentId: z.string().min(1).max(100),
            slot: z
              .object({
                date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
                start: z.number().int(),
              })
              .strict()
              .nullable(),
            reason: z.string().min(10).max(800),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();
export type AIOutput = z.infer<typeof aiOutputSchema>;
export function validateAIOutput(input: AIInput, raw: unknown): AIOutput {
  const output = aiOutputSchema.parse(raw);
  const candidates = allocationCandidates(input);
  if (output.recommendations.length !== candidates.length)
    throw new Error("Incomplete recommendation plan.");
  const reserved = input.requests.map((r) => ({
    ...r,
    project: "Demo project",
  }));
  output.recommendations.forEach((row, index) => {
    const candidate = candidates[index];
    if (
      row.requestId !== candidate.requestId ||
      row.equipmentId !== candidate.equipmentId
    )
      throw new Error("Priority or equipment mismatch.");
    const expected = candidate.slots[0];
    if (!expected) {
      if (row.slot !== null) throw new Error("Invented slot.");
    } else {
      if (
        !row.slot ||
        row.slot.date !== expected.date ||
        row.slot.start !== expected.start
      )
        throw new Error("Slot not in feasible plan.");
      const request = reserved.find((r) => r.id === row.requestId)!;
      if (
        !isAvailable(
          reserved,
          row.equipmentId,
          row.slot.date,
          row.slot.start,
          request.duration,
          undefined,
          input.stock,
        )
      )
        throw new Error("Plan exceeds capacity.");
      reserved.push({
        ...request,
        ...row.slot,
        id: `proposal-${request.id}`,
        status: "approved",
      });
    }
  });
  return output;
}
