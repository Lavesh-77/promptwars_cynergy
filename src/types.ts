export type Category =
  "Development kits" | "Lab equipment" | "Workstations" | "Fabrication";
export interface Equipment {
  id: string;
  name: string;
  department: string;
  category: Category;
  location: string;
  description: string;
  tags: string[];
  requirement: string;
  visual: "board" | "scope" | "printer" | "workstation";
}
export interface AccessRequest {
  id: string;
  equipmentId: string;
  student: string;
  project: string;
  description: string;
  deadline: string;
  date: string;
  start: number;
  duration: number;
  flexible: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  history?: RequestEvent[];
}
export interface SessionSlot {
  date: string;
  start: number;
}
export interface RequestEvent {
  action: "submitted" | "approved" | "rejected" | "rescheduled";
  at: string;
  from?: SessionSlot;
  to?: SessionSlot;
  relatedRequestId?: string;
}
export interface Relocation {
  bookingId: string;
  from: SessionSlot;
  to: SessionSlot;
}
export interface LabState {
  version: 1;
  requests: AccessRequest[];
  stock?: Record<string, number>;
}
export interface Slot {
  date: string;
  start: number;
  reason: string;
}
