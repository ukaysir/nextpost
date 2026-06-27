import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWon(value?: number | null) {
  if (!value || Number.isNaN(value)) return "계약정보 없음";
  if (value >= 1_0000_0000_0000) {
    return `${(value / 1_0000_0000_0000).toFixed(1)}조원`;
  }
  if (value >= 1_0000_0000) {
    return `${Math.round(value / 1_0000_0000).toLocaleString("ko-KR")}억원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

export function normalizeCompanyName(value: string) {
  return value
    .toLowerCase()
    .replace(/\(주\)|주식회사|㈜|유한회사|재단법인|사단법인/g, "")
    .replace(/[^0-9a-z가-힣]/g, "")
    .trim();
}
