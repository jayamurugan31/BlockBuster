export interface SuspiciousTransaction {
  hash: string;
  from: string;
  to: string;
  value_eth: number;
  timestamp: string;
  reasons: string[];
}

export interface FlowTransaction {
  hash: string;
  from: string;
  to: string;
  value_eth: number;
  timestamp: string;
  is_error: boolean;
}

export interface WalletAnalysisResponse {
  wallet_address: string;
  total_transactions: number;
  suspicious_transactions: SuspiciousTransaction[];
  risk_score: number;
  transaction_flow: FlowTransaction[];
}

const DEFAULT_API_BASE_URL = "http://localhost:5000";

function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  return (configured ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

function buildErrorMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (status === 400) return "Please provide a valid Ethereum wallet address.";
  if (status === 500) return "Backend configuration error. Check ETHERSCAN_API_KEY.";
  if (status >= 500) return "The analysis service is temporarily unavailable.";
  return "Unable to analyze this wallet right now.";
}

export async function analyzeWallet(walletAddress: string): Promise<WalletAnalysisResponse> {
  const response = await fetch(`${getApiBaseUrl()}/analyze_wallet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ wallet_address: walletAddress }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, payload));
  }

  return payload as WalletAnalysisResponse;
}