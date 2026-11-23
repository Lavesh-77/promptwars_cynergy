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
}
export interface LabState {
  version: 1;
  requests: AccessRequest[];
}
export interface Slot {
  date: string;
  start: number;
  reason: string;
}
