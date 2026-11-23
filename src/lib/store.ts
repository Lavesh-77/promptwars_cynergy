import { z } from "zod";
import type {
  AccessRequest,
  LabState,
  Relocation,
  RequestEvent,
} from "../types";
import {
  addDays,
  blockingBookings,
  dateKey,
  isAvailable,
  requestSchema,
} from "./scheduler";

const KEY = "lablink-demo-v1";
const sessionSlot = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.number().int().min(540).max(990).multipleOf(30),
});
const storedRequest = z.object({
  id: z.string(),
  equipmentId: z.string(),
  student: z.string().max(60),
  project: z.string().max(100),
  description: z.string().max(1000),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.number().int().min(540).max(990).multipleOf(30),
  duration: z.number().int().min(30).max(240).multipleOf(30),
  flexible: z.boolean(),
  status: z.enum(["pending", "approved", "rejected"]),
  createdAt: z.string(),
  history: z
    .array(
      z.object({
        action: z.enum(["submitted", "approved", "rejected", "rescheduled"]),
        at: z.string(),
        from: sessionSlot.optional(),
        to: sessionSlot.optional(),
        relatedRequestId: z.string().optional(),
      }),
    )
    .max(3000)
    .optional(),
});
const stateSchema = z.object({
  version: z.literal(1),
  requests: z.array(storedRequest).max(1000),
});
export function initialState(): LabState {
  const date = addDays(dateKey(), 1);
  return {
    version: 1,
    requests: [
      {
        id: "seed-1",
        equipmentId: "oscilloscope",
        student: "Aarav Shah",
        project: "Smart energy monitor",
        description:
          "Measure power sensor signals for a campus energy monitoring prototype.",
        deadline: addDays(date, 3),
        date,
        start: 600,
        duration: 120,
        flexible: true,
        status: "approved",
        createdAt: new Date().toISOString(),
      },
      {
        id: "seed-2",
        equipmentId: "gpu",
        student: "Maya Rao",
        project: "Accessible sign-language recognition",
        description:
          "Train a small computer vision model to recognise common hand gestures.",
        deadline: addDays(date, 2),
        date,
        start: 780,
        duration: 120,
        flexible: true,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
export function loadState(): LabState {
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return initialState();
  if (raw.length > 2_000_000)
    throw new Error(
      "Saved demo data is too large. Reset the demo to restore sample data.",
    );
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      "Saved demo data could not be read. Reset the demo to restore the sample data.",
    );
  }
  const parsed = stateSchema.safeParse(json);
  if (!parsed.success)
    throw new Error(
      "Saved demo data could not be read. Reset the demo to restore the sample data.",
    );
  return parsed.data;
}
export function saveState(state: LabState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    throw new Error(
      "Browser storage is unavailable or full. Enable site storage or reset the demo.",
    );
  }
}
export function createRequest(state: LabState, input: unknown): LabState {
  const validated = requestSchema.parse(input);
  const createdAt = new Date().toISOString();
  if (state.requests.length >= 1000)
    throw new Error(
      "Demo limit reached. Reset the demo before adding more requests.",
    );
  return {
    ...state,
    requests: [
      ...state.requests,
      {
        ...validated,
        id: crypto.randomUUID(),
        status: "pending",
        createdAt,
        history: [
          {
            action: "submitted",
            at: createdAt,
            to: { date: validated.date, start: validated.start },
          },
        ],
      },
    ],
  };
}
export function decideRequest(
  state: LabState,
  id: string,
  decision: "approved" | "rejected",
  slot?: { date: string; start: number },
): LabState {
  const request = state.requests.find((r) => r.id === id);
  if (!request || request.status !== "pending")
    throw new Error(
      "This request is no longer pending. Refresh and try again.",
    );
  const updated: AccessRequest = { ...request, ...slot, status: decision };
  if (decision === "approved") {
    requestSchema.parse(updated);
    if (
      !request.flexible &&
      (updated.date !== request.date || updated.start !== request.start)
    )
      throw new Error(
        "This student requested an exact slot. An alternative requires a new request.",
      );
    if (
      !isAvailable(
        state.requests,
        updated.equipmentId,
        updated.date,
        updated.start,
        updated.duration,
        id,
      )
    )
      throw new Error(
        "This slot is already booked. Choose a suggested alternative.",
      );
  }
  updated.history = [
    ...requestHistory(request),
    {
      action: decision,
      at: new Date().toISOString(),
      from: { date: request.date, start: request.start },
      to: { date: updated.date, start: updated.start },
    },
  ];
  return {
    ...state,
    requests: state.requests.map((r) => (r.id === id ? updated : r)),
  };
}

// Legacy browser data has a submission time, but no reliable approval time.
export function requestHistory(request: AccessRequest): RequestEvent[] {
  return request.history?.length
    ? request.history
    : [{ action: "submitted", at: request.createdAt }];
}

export function approveWithRelocation(
  state: LabState,
  id: string,
  move: Relocation,
): LabState {
  const fixed = state.requests.find((r) => r.id === id);
  const booking = state.requests.find((r) => r.id === move.bookingId);
  if (!fixed || fixed.status !== "pending" || fixed.flexible)
    throw new Error(
      "Only a pending exact-slot request can use this rescheduling workflow.",
    );
  const blockers = blockingBookings(fixed, state.requests);
  if (
    !booking ||
    booking.status !== "approved" ||
    !booking.flexible ||
    blockers.length !== 1 ||
    blockers[0].id !== booking.id
  )
    throw new Error(
      "The conflict has changed. Review the latest bookings before confirming.",
    );
  if (booking.date !== move.from.date || booking.start !== move.from.start)
    throw new Error(
      "The flexible booking has changed. Choose a replacement again.",
    );
  requestSchema.parse(fixed);
  requestSchema.parse(booking); // Do not move a session that has already started.
  const moved = { ...booking, date: move.to.date, start: move.to.start };
  requestSchema.parse(moved);
  const others = state.requests.filter(
    (r) => r.id !== booking.id && r.id !== fixed.id,
  );
  const approved = { ...fixed, status: "approved" as const };
  if (
    !isAvailable(
      others,
      fixed.equipmentId,
      fixed.date,
      fixed.start,
      fixed.duration,
    ) ||
    !isAvailable(
      [...others, approved],
      moved.equipmentId,
      moved.date,
      moved.start,
      moved.duration,
    )
  )
    throw new Error(
      "The replacement slot is no longer available. Neither booking has been changed.",
    );
  const at = new Date().toISOString();
  moved.history = [
    ...requestHistory(booking),
    {
      action: "rescheduled",
      at,
      from: move.from,
      to: move.to,
      relatedRequestId: fixed.id,
    },
  ];
  const newlyApproved: AccessRequest = {
    ...approved,
    history: [
      ...requestHistory(fixed),
      {
        action: "approved",
        at,
        to: { date: fixed.date, start: fixed.start },
        relatedRequestId: booking.id,
      },
    ],
  };
  // Return both changes together; transact persists the entire state once, under one lock.
  return {
    ...state,
    requests: state.requests.map((r) =>
      r.id === moved.id ? moved : r.id === newlyApproved.id ? newlyApproved : r,
    ),
  };
}
export async function transact(
  update: (state: LabState) => LabState,
  reset = false,
): Promise<LabState> {
  const run = () => {
    const next = update(reset ? initialState() : loadState());
    saveState(next);
    return next;
  };
  return navigator.locks
    ? navigator.locks.request("lablink-state", run)
    : run();
}
