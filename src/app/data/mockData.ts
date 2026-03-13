export interface WalletNode {
  id: string;
  address: string;
  label: string;
  risk: number; // 0-100
  type: "exchange" | "wallet" | "mixer" | "darkweb" | "defi";
  flagged: boolean;
  balance: number;
  currency: string;
  transactionCount: number;
  firstSeen: string;
  lastActive: string;
  country?: string;
  tags: string[];
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  usdValue: number;
  timestamp: string;
  suspicious: boolean;
  reason?: string;
  gasPrice?: number;
  blockNumber?: number;
  hash: string;
  riskScore: number;
}

export interface Alert {
  id: string;
  type: "large_transaction" | "rapid_transactions" | "darkweb_wallet" | "mixer" | "phishing";
  severity: "critical" | "high" | "medium" | "low";
  walletAddress: string;
  description: string;
  amount?: number;
  currency?: string;
  timestamp: string;
  read: boolean;
  resolved: boolean;
}

export const walletNodes: WalletNode[] = [];

export const transactions: Transaction[] = [];

export const alerts: Alert[] = [];

export const volumeData: { date: string; volume: number; suspicious: number }[] = [];

export const riskDistData: { range: string; count: number; label: string }[] = [];

export const hourlyAlerts: { hour: string; alerts: number }[] = [];

export const walletHistory: { date: string; tx: number; volume: number }[] = [];

export function getRiskColor(risk: number): string {
  if (risk >= 80) return "#ff2b4a";
  if (risk >= 60) return "#ff7700";
  if (risk >= 40) return "#f5c518";
  if (risk >= 20) return "#00aaff";
  return "#00ff9d";
}

export function getRiskLabel(risk: number): string {
  if (risk >= 80) return "CRITICAL";
  if (risk >= 60) return "HIGH";
  if (risk >= 40) return "MEDIUM";
  if (risk >= 20) return "LOW";
  return "CLEAN";
}

export function getSeverityColor(severity: Alert["severity"]): string {
  switch (severity) {
    case "critical": return "#ff2b4a";
    case "high": return "#ff7700";
    case "medium": return "#f5c518";
    case "low": return "#00aaff";
  }
}

export function formatAddress(address: string): string {
  return address.length > 20 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

export function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
