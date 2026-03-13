import { useMemo, useRef, useState, useEffect } from "react";
import {
  Search,
  AlertTriangle,
  Activity,
  Copy,
  CheckCheck,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Network,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { analyzeWallet, type WalletAnalysisResponse, type FlowTransaction } from "../api/walletAnalyzerApi";
import { getRiskColor, getRiskLabel, formatAddress, timeAgo } from "../data/mockData";

interface Counterparty {
  address: string;
  txCount: number;
  suspiciousTxCount: number;
  risk: number;
}

function MiniFlowGraph({
  walletAddress,
  counterparties,
  suspiciousPairs,
}: {
  walletAddress: string;
  counterparties: Counterparty[];
  suspiciousPairs: Set<string>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 420;
    canvas.height = 240;

    const width = 420;
    const height = 240;
    const cx = width / 2;
    const cy = height / 2;

    ctx.fillStyle = "#070d1a";
    ctx.fillRect(0, 0, width, height);

    const nodes = counterparties.slice(0, 8);

    nodes.forEach((node, index) => {
      const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
      const radius = 88;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const pairKey = [walletAddress, node.address].sort().join("|");
      const isSuspicious = suspiciousPairs.has(pairKey);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const mx = (cx + x) / 2 + (cy - y) * 0.12;
      const my = (cy + y) / 2 + (x - cx) * 0.12;
      ctx.quadraticCurveTo(mx, my, x, y);
      ctx.strokeStyle = isSuspicious ? "#ff2b4a88" : "#0e6cc477";
      ctx.lineWidth = isSuspicious ? 1.8 : 1;
      ctx.setLineDash(isSuspicious ? [] : [4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#0a1628";
      ctx.fill();
      ctx.strokeStyle = getRiskColor(node.risk);
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#7a9cc0";
      ctx.fillText(formatAddress(node.address), x, y + 18);
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#0a1628";
    ctx.fill();
    ctx.strokeStyle = "#00aaff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#00aaff";
    ctx.font = "bold 11px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU", cx, cy);
  }, [walletAddress, counterparties, suspiciousPairs]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", borderRadius: 8 }} />;
}

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color: string; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0a1628",
        border: "1px solid #1a3050",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div style={{ color: "#7a9cc0", marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value.toFixed(4)} ETH</strong>
        </div>
      ))}
    </div>
  );
};

export function WalletAnalyzerPage() {
  const [query, setQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<WalletAnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const executeAnalysis = async () => {
    const walletAddress = query.trim();
    if (!walletAddress) return;

    setAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await analyzeWallet(walletAddress);
      setAnalysis(response);
    } catch (err) {
      setAnalysis(null);
      setErrorMessage(err instanceof Error ? err.message : "Unexpected error during wallet analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const suspiciousHashes = useMemo(() => {
    if (!analysis) return new Set<string>();
    return new Set(analysis.suspicious_transactions.map((tx) => tx.hash));
  }, [analysis]);

  const transactions = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.transaction_flow].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [analysis]);

  const counterparties = useMemo(() => {
    if (!analysis) return [] as Counterparty[];

    const map = new Map<string, Counterparty>();
    analysis.transaction_flow.forEach((tx) => {
      const me = analysis.wallet_address.toLowerCase();
      const from = tx.from.toLowerCase();
      const other = from === me ? tx.to : tx.from;
      if (!other || other === analysis.wallet_address) return;

      const entry = map.get(other) ?? {
        address: other,
        txCount: 0,
        suspiciousTxCount: 0,
        risk: 10,
      };
      entry.txCount += 1;
      if (suspiciousHashes.has(tx.hash)) {
        entry.suspiciousTxCount += 1;
      }
      const riskBoost = Math.min(80, entry.suspiciousTxCount * 25 + Math.min(20, entry.txCount * 3));
      entry.risk = Math.min(100, 10 + riskBoost);
      map.set(other, entry);
    });

    return [...map.values()].sort((a, b) => b.risk - a.risk);
  }, [analysis, suspiciousHashes]);

  const suspiciousPairs = useMemo(() => {
    if (!analysis) return new Set<string>();
    const pairs = new Set<string>();
    analysis.suspicious_transactions.forEach((tx) => {
      pairs.add([tx.from.toLowerCase(), tx.to.toLowerCase()].sort().join("|"));
    });
    return pairs;
  }, [analysis]);

  const historyData = useMemo(() => {
    if (!analysis) return [] as { date: string; volume: number }[];

    const buckets = new Map<string, number>();
    analysis.transaction_flow.forEach((tx: FlowTransaction) => {
      const date = tx.timestamp.slice(0, 10);
      const prev = buckets.get(date) ?? 0;
      buckets.set(date, prev + tx.value_eth);
    });

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, volume]) => ({ date, volume: Number(volume.toFixed(6)) }));
  }, [analysis]);

  const totalVolumeEth = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + tx.value_eth, 0);
  }, [transactions]);

  const firstSeen = transactions.at(-1)?.timestamp;
  const lastSeen = transactions.at(0)?.timestamp;

  const copyAddress = async () => {
    if (!analysis) return;
    await navigator.clipboard.writeText(analysis.wallet_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Space Grotesk', sans-serif", background: "#050912", minHeight: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#e2f0ff", margin: 0, fontSize: 22, fontWeight: 700 }}>
          Wallet <span style={{ color: "#00aaff" }}>Analyzer</span>
        </h1>
        <p style={{ color: "#5b7fa6", fontSize: 13, margin: "4px 0 0" }}>
          Live Ethereum wallet analysis powered by backend risk heuristics
        </p>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
          border: "1px solid #1a3050",
          borderRadius: 12,
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div style={{ color: "#7a9cc0", fontSize: 11, letterSpacing: "0.05em", marginBottom: 8 }}>
          ETHEREUM WALLET ADDRESS
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#5b7fa6",
              }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void executeAnalysis();
              }}
              placeholder="0x..."
              style={{
                width: "100%",
                background: "#050912",
                border: "1px solid #1a3050",
                borderRadius: 8,
                padding: "12px 14px 12px 40px",
                color: "#e2f0ff",
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => {
              void executeAnalysis();
            }}
            disabled={analyzing}
            style={{
              padding: "12px 28px",
              background: analyzing ? "rgba(0,170,255,0.15)" : "linear-gradient(135deg, #0060cc, #00aaff)",
              border: "none",
              borderRadius: 8,
              color: analyzing ? "#00aaff" : "#050912",
              fontSize: 13,
              fontWeight: 700,
              cursor: analyzing ? "not-allowed" : "pointer",
              letterSpacing: "0.05em",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {analyzing ? "ANALYZING..." : "ANALYZE"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            background: "rgba(255,43,74,0.1)",
            border: "1px solid rgba(255,43,74,0.35)",
            borderRadius: 10,
            padding: "12px 14px",
            color: "#ff9090",
            fontSize: 12,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertTriangle size={14} />
          {errorMessage}
        </div>
      )}

      {!analysis && !analyzing && (
        <div
          style={{
            background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
            border: "1px solid #1a3050",
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
            color: "#5b7fa6",
            fontSize: 13,
          }}
        >
          Enter an Ethereum wallet address to start live analysis.
        </div>
      )}

      {analysis && !analyzing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
              border: `1px solid ${analysis.risk_score >= 70 ? "#ff2b4a44" : "#1a3050"}`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ color: "#e2f0ff", fontSize: 17, fontWeight: 700 }}>Analyzed Wallet</div>
                  <button
                    onClick={() => {
                      void copyAddress();
                    }}
                    style={{ background: "none", border: "none", color: copied ? "#00ff9d" : "#5b7fa6", cursor: "pointer" }}
                  >
                    {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                  </button>
                </div>
                <div style={{ color: "#7a9cc0", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginBottom: 14 }}>
                  {analysis.wallet_address}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#7a9cc0", fontSize: 11 }}>Risk Score</span>
                    <span style={{ color: getRiskColor(analysis.risk_score), fontSize: 11, fontWeight: 700 }}>
                      {analysis.risk_score}/100 - {getRiskLabel(analysis.risk_score)}
                    </span>
                  </div>
                  <div style={{ height: 8, background: "#0f1e35", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${analysis.risk_score}%`,
                        background: `linear-gradient(90deg, #00ff9d, ${getRiskColor(analysis.risk_score)})`,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { icon: Activity, label: "Total Transactions", value: analysis.total_transactions.toLocaleString() },
                    { icon: AlertTriangle, label: "Suspicious", value: analysis.suspicious_transactions.length.toLocaleString() },
                    { icon: Network, label: "Counterparties", value: counterparties.length.toLocaleString() },
                    { icon: Clock, label: "Last Activity", value: lastSeen ? timeAgo(lastSeen) : "N/A" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} style={{ background: "#050912", border: "1px solid #0f1e35", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Icon size={11} color="#5b7fa6" />
                        <span style={{ color: "#5b7fa6", fontSize: 10 }}>{label}</span>
                      </div>
                      <div style={{ color: "#e2f0ff", fontSize: 13, fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ width: 420, maxWidth: "100%" }}>
                <div style={{ color: "#7a9cc0", fontSize: 11, letterSpacing: "0.05em", marginBottom: 8 }}>
                  CONNECTION GRAPH
                </div>
                <div style={{ background: "#070d1a", border: "1px solid #1a3050", borderRadius: 10, height: 240, overflow: "hidden" }}>
                  <MiniFlowGraph
                    walletAddress={analysis.wallet_address.toLowerCase()}
                    counterparties={counterparties}
                    suspiciousPairs={suspiciousPairs}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div
              style={{
                flex: 2,
                minWidth: 320,
                background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
                border: "1px solid #1a3050",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div style={{ color: "#e2f0ff", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Volume History</div>
              <div style={{ color: "#5b7fa6", fontSize: 11, marginBottom: 14 }}>
                Total analyzed volume: {totalVolumeEth.toFixed(4)} ETH
                {firstSeen ? ` • first seen ${new Date(firstSeen).toLocaleDateString()}` : ""}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00aaff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00aaff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: "#5b7fa6", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#5b7fa6", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="volume" name="Volume" stroke="#00aaff" strokeWidth={2} fill="url(#historyGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 280,
                background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
                border: "1px solid #1a3050",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div style={{ color: "#e2f0ff", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Top Counterparties</div>
              <div style={{ color: "#5b7fa6", fontSize: 11, marginBottom: 14 }}>
                Ranked by derived counterparty risk
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {counterparties.slice(0, 6).map((party) => (
                  <div
                    key={party.address}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      background: party.risk >= 70 ? "rgba(255,43,74,0.07)" : "rgba(0,0,0,0.2)",
                      border: `1px solid ${party.risk >= 70 ? "#ff2b4a22" : "#0f1e35"}`,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: getRiskColor(party.risk), flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#e2f0ff", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatAddress(party.address)}
                      </div>
                      <div style={{ color: "#5b7fa6", fontSize: 10 }}>
                        {party.txCount} txs • {party.suspiciousTxCount} suspicious
                      </div>
                    </div>
                    <span style={{ color: getRiskColor(party.risk), fontSize: 10, fontWeight: 700 }}>{party.risk}</span>
                  </div>
                ))}
                {counterparties.length === 0 && <div style={{ color: "#5b7fa6", fontSize: 12 }}>No counterparties found.</div>}
              </div>
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
              border: "1px solid #1a3050",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a3050", color: "#e2f0ff", fontWeight: 700, fontSize: 14 }}>
              Recent Transactions ({transactions.length} total)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                  {["Direction", "Counterparty", "Amount", "Risk", "Time"].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "10px 16px",
                        color: "#3d5a7a",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textAlign: "left",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((tx) => {
                  const isOutbound = tx.from.toLowerCase() === analysis.wallet_address.toLowerCase();
                  const other = isOutbound ? tx.to : tx.from;
                  const txRisk = suspiciousHashes.has(tx.hash) ? 85 : 15;
                  return (
                    <tr
                      key={tx.hash}
                      style={{
                        borderTop: "1px solid #0f1e35",
                        background: suspiciousHashes.has(tx.hash) ? "rgba(255,43,74,0.05)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: isOutbound ? "#ff7700" : "#00ff9d", fontSize: 11, fontWeight: 600 }}>
                          {isOutbound ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          {isOutbound ? "SENT" : "RECEIVED"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px", color: "#7a9cc0", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                        {formatAddress(other)}
                      </td>
                      <td style={{ padding: "10px 16px", color: "#e2f0ff", fontSize: 12, fontWeight: 600 }}>
                        {tx.value_eth.toFixed(6)} ETH
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            background: `${getRiskColor(txRisk)}18`,
                            border: `1px solid ${getRiskColor(txRisk)}33`,
                            borderRadius: 9999,
                            color: getRiskColor(txRisk),
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {txRisk}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", color: "#5b7fa6", fontSize: 11 }}>{timeAgo(tx.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
