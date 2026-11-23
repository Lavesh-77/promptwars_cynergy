import { equipment } from "../data.js";
import type { LabState } from "../types";
import { addDays, dateKey, stockCount } from "./scheduler.js";

export interface UtilizationSummary {
  bookedMinutes: number;
  capacityMinutes: number;
  utilizationPercent: number;
  pendingMinutes: number;
  approvedSessions: number;
  busiest: { equipmentId: string; name: string; bookedMinutes: number } | null;
}

/** Seven-day forward capacity, based on daily 09:00–17:00 operating hours. */
export function utilizationSummary(
  state: LabState,
  startDate = dateKey(),
): UtilizationSummary {
  const endDate = addDays(startDate, 6);
  const inWindow = (date: string) => date >= startDate && date <= endDate;
  const approved = state.requests.filter(
    (request) => request.status === "approved" && inWindow(request.date),
  );
  const pending = state.requests.filter(
    (request) => request.status === "pending" && inWindow(request.date),
  );
  const bookedMinutes = approved.reduce(
    (total, request) => total + request.duration,
    0,
  );
  const capacityMinutes = equipment.reduce(
    (total, item) => total + stockCount(item.id, state.stock) * 8 * 60 * 7,
    0,
  );
  const byEquipment = equipment
    .map((item) => ({
      equipmentId: item.id,
      name: item.name,
      bookedMinutes: approved
        .filter((request) => request.equipmentId === item.id)
        .reduce((total, request) => total + request.duration, 0),
    }))
    .sort(
      (a, b) =>
        b.bookedMinutes - a.bookedMinutes || a.name.localeCompare(b.name),
    );
  return {
    bookedMinutes,
    capacityMinutes,
    utilizationPercent: capacityMinutes
      ? Math.round((bookedMinutes / capacityMinutes) * 1000) / 10
      : 0,
    pendingMinutes: pending.reduce(
      (total, request) => total + request.duration,
      0,
    ),
    approvedSessions: approved.length,
    busiest: byEquipment[0]?.bookedMinutes ? byEquipment[0] : null,
  };
}
