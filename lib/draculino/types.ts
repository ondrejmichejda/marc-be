export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type TrainingCategory =
  | "BJJ Gi"
  | "BJJ No-Gi / Grappling"
  | "Kids / Junioři"
  | "Box / Striking"
  | "Strength / Fitness"
  | "Open Mat / Sparing"
  | "Other";

export type TrainingStatus = "upcoming" | "in_progress" | "past";

export interface TrainingUnit {
  time: string; // e.g. "18:00 - 19:30"
  title: string; // e.g. "BJJ Gi Pokročilí"
  category: TrainingCategory;
  level?: string; // e.g. "Pokročilí", "Začátečníci", "Všichni", "Děti 8-10 let"
  coach?: string; // e.g. "Robin Javorek", "Jiří Smiga"
  branchId: string; // e.g. "frydek-mistek"
  branchName: string; // e.g. "Frýdek-Místek"
  notes?: string;
  status?: TrainingStatus;
  startTime?: string;
  endTime?: string;
  startMinutes?: number;
  endMinutes?: number;
}

export interface GymBranch {
  id: string;
  name: string;
  slug: string;
  url: string;
  address: string;
  coach?: string;
  phone?: string;
  email?: string;
  timetableImageUrl?: string;
  schedule: Record<DayOfWeek, TrainingUnit[]>;
}

export interface SitemapItem {
  branchId: string;
  branchName: string;
  pageUrl: string;
  timetableUrl?: string;
  hasSchedule: boolean;
  status: "active" | "external" | "not_found";
  lastChecked?: string;
}

export interface WhereQueryResult {
  day: DayOfWeek;
  dayNameCz: string;
  dateStr: string;
  isToday: boolean;
  currentTimeStr?: string;
  sitemap: SitemapItem[];
  branches: {
    branch: GymBranch;
    units: TrainingUnit[];
    upcomingUnits?: TrainingUnit[];
    inProgressUnits?: TrainingUnit[];
    pastUnits?: TrainingUnit[];
  }[];
  totalUnits: number;
  upcomingCount?: number;
  inProgressCount?: number;
  pastCount?: number;
  remainingCount?: number; // upcoming + inProgress
}
