/** Tipos compartilhados entre frontend e Worker. */

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  tier: "cliente" | "parceiro" | "admin";
  status: "active" | "suspended" | "deleted";
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  assistant: "sofia" | "ana";
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface Referral {
  id: string;
  referrerId: string;
  inviteeEmail: string;
  status: "pending" | "converted" | "expired";
  rewardStatus: "none" | "granted";
  createdAt: number;
  convertedAt: number | null;
}

export interface EventRSVP {
  id: string;
  userId: string;
  eventSlug: string;
  status: "yes" | "maybe" | "no";
  createdAt: number;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}
