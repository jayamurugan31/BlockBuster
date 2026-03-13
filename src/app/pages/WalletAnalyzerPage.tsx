import { useState, useEffect, useRef } from "react";
import {
  Search,
  Shield,
  AlertTriangle,
  Activity,
  Copy,
  CheckCheck,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Globe,
  Tag,
  Zap,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  walletNodes,
  transactions,
  walletHistory,
  WalletNode,
  getRiskColor,
  getRiskLabel,
  formatAddress,
  timeAgo,
} from "../data/mockData";

const QUICK_ADDRESSES = walletNodes.map((w) => ({
  label: w.label,
  address: w.address,
  risk: w.risk,
}));

function MiniFlowGraph({ wallet }: { wallet: WalletNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 220;

    const W = 400;
    const H = 220;
    const cx = W / 2;
    const cy = H / 2;

    // Background
    ctx.fillStyle = "#070d1a";
    ctx.fillRect(0, 0, W, H);

    const walletTxs = transactions.filter((t) => t.from === wallet.id || t.to === wallet.id);
    const connectedIds = new Set<string>();
    walletTxs.forEach((t) => {
      if (t.from !== wallet.id) connectedIds.add(t.from);
      if (t.to !== wallet.id) connectedIds.add(t.to);
    });
    const connected = walletNodes.filter((w) => connectedIds.has(w.id));

    // Draw center node
    const drawNode = (x: number, y: number, w: WalletNode, isCenter: boolean) => {
      const r = isCenter ? 22 : 14;
      const color = getRiskColor(w.risk);

      // Glow
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
      grd.addColorStop(0, color + "44");
      grd.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Node
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#0a1628";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = isCenter ? 2 : 1.5;
      ctx.stroke();

      // Label
      ctx.font = `${isCenter ? 12 : 9}px 'Space Grotesk', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = color;
      ctx.fillText(w.label.split(" ")[0], x, y - r - 3);

      // Risk badge
      ctx.font = "bold 8px 'Space Grotesk', sans-serif";
      ctx.fillStyle = color;
      ctx.fillText(`${w.risk}`, x, y + r + 12);
    };

    const nodePositions: { id: string; x: number; y: number }[] = [{ id: wallet.id, x: cx, y: cy }];

    connected.forEach((w, i) => {
      const angle = (i / connected.length) * Math.PI * 2 - Math.PI / 2;
      const radius = 85;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      nodePositions.push({ id: w.id, x, y });

      // Edge
      const tx = walletTxs.find((t) => (t.from === w.id || t.to === w.id));
      const suspicious = tx?.suspicious ?? false;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const mx = (cx + x) / 2 + (cy - y) * 0.15;
      const my = (cy + y) / 2 + (x - cx) * 0.15;
      ctx.quadraticCurveTo(mx, my, x, y);
      ctx.strokeStyle = suspicious ? "#ff2b4a66" : "#0e6cc466";
      ctx.lineWidth = suspicious ? 1.5 : 1;
      ctx.setLineDash(suspicious ? [] : [4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawNode(x, y, w, false);
    });

    drawNode(cx, cy, wallet, true);
  }, [wallet]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
    />
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
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
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export function WalletAnalyzerPage() {
  const [query, setQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<WalletNode | null>(null);
  const [copied, setCopied] = useState(false);
  const [suggestions, setSuggestions] = useState(false);

  const handleAnalyze = (address?: string) => {
    const addr = address ?? query;
    if (!addr.trim()) return;
    setAnalyzing(true);
    setResult(null);
    setSuggestions(false);
    setTimeout(() => {
      const found = walletNodes.find(
        (w) =>
          w.address.toLowerCase().includes(addr.toLowerCase()) ||
          w.label.toLowerCase().includes(addr.toLowerCase())
      ) ?? walletNodes[Math.floor(Math.random() * walletNodes.length)];
      setResult(found);
      setAnalyzing(false);
    }, 1200);
  };

  const walletTxs = result
    ? transactions.filter((t) => t.from === result.id || t.to === result.id)
    : [];

  const copyAddress = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Space Grotesk', sans-serif", background: "#050912", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#e2f0ff", margin: 0, fontSize: 22, fontWeight: 700 }}>
          Wallet <span style={{ color: "#00aaff" }}>Analyzer</span>
        </h1>
        <p style={{ color: "#5b7fa6", fontSize: 13, margin: "4px 0 0" }}>
          Deep-dive analysis on any blockchain wallet address
        </p>
      </div>

      {/* Search */}
      <div
        style={{
          background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
          border: "1px solid #1a3050",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#7a9cc0", fontSize: 11, letterSpacing: "0.05em", marginBottom: 8 }}>
            WALLET ADDRESS
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSuggestions(e.target.value.length > 0);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="Paste wallet address (0x...) or ENS name"
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
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#00aaff44";
                  setSuggestions(query.length > 0);
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#1a3050";
                  setTimeout(() => setSuggestions(false), 200);
                }}
              />
              {/* Autocomplete suggestions */}
              {suggestions && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "#0a1628",
                    border: "1px solid #1a3050",
                    borderRadius: 8,
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  {QUICK_ADDRESSES.filter(
                    (w) =>
                      w.label.toLowerCase().includes(query.toLowerCase()) ||
                      w.address.toLowerCase().includes(query.toLowerCase())
                  )
                    .slice(0, 5)
                    .map((w) => (
                      <button
                        key={w.address}
                        onMouseDown={() => {
                          setQuery(w.address);
                          handleAnalyze(w.address);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          padding: "10px 14px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #0f1e35",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#0f1e35")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: getRiskColor(w.risk),
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: "#e2f0ff", fontSize: 12 }}>{w.label}</span>
                        <span
                          style={{
                            color: "#5b7fa6",
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {w.address}
                        </span>
                        <span
                          style={{
                            color: getRiskColor(w.risk),
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {w.risk}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleAnalyze()}
              disabled={analyzing}
              style={{
                padding: "12px 28px",
                background: analyzing
                  ? "rgba(0,170,255,0.15)"
                  : "linear-gradient(135deg, #0060cc, #00aaff)",
                border: "none",
                borderRadius: 8,
                color: analyzing ? "#00aaff" : "#050912",
                fontSize: 13,
                fontWeight: 700,
                cursor: analyzing ? "not-allowed" : "pointer",
                letterSpacing: "0.05em",
                fontFamily: "'Space Grotesk', sans-serif",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
            >
              {analyzing ? (
                <>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      border: "2px solid #00aaff",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  ANALYZING...
                </>
              ) : (
                <>
                  <Search size={13} />
                  ANALYZE
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick access */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "#3d5a7a", fontSize: 11 }}>Quick:</span>
          {QUICK_ADDRESSES.slice(0, 5).map((w) => (
            <button
              key={w.address}
              onClick={() => {
                setQuery(w.address);
                handleAnalyze(w.address);
              }}
              style={{
                padding: "3px 10px",
                background: "#050912",
                border: "1px solid #1a3050",
                borderRadius: 9999,
                color: "#7a9cc0",
                fontSize: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#00aaff44")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1a3050")}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: getRiskColor(w.risk),
                }}
              />
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!result && !analyzing && (
        <div
          style={{
            background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
            border: "1px solid #1a3050",
            borderRadius: 12,
            padding: 60,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ color: "#5b7fa6", fontSize: 14, marginBottom: 8 }}>
            Enter a wallet address above to begin analysis
          </div>
          <div style={{ color: "#3d5a7a", fontSize: 12 }}>
            Supports ETH, BTC, and all EVM-compatible addresses
          </div>
        </div>
      )}

      {/* Loading */}
      {analyzing && (
        <div
          style={{
            background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
            border: "1px solid #00aaff33",
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid #1a3050",
              borderTopColor: "#00aaff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 20px",
            }}
          />
          <div style={{ color: "#00aaff", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Analyzing blockchain data...
          </div>
          <div style={{ color: "#5b7fa6", fontSize: 12 }}>
            Scanning transaction history • Checking watchlists • Computing risk score
          </div>
        </div>
      )}

      {/* Results */}
      {result && !analyzing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Wallet overview */}
          <div
            style={{
              background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
              border: `1px solid ${result.flagged ? "#ff2b4a44" : "#1a3050"}`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {/* Left info */}
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${getRiskColor(result.risk)}18`,
                      border: `1px solid ${getRiskColor(result.risk)}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {result.type === "mixer"
                      ? "⚡"
                      : result.type === "darkweb"
                      ? "💀"
                      : result.type === "exchange"
                      ? "🏦"
                      : result.type === "defi"
                      ? "🔗"
                      : "👛"}
                  </div>
                  <div>
                    <div style={{ color: "#e2f0ff", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                      {result.label}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          color: "#5b7fa6",
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {formatAddress(result.address)}
                      </span>
                      <button
                        onClick={copyAddress}
                        style={{
                          background: "none",
                          border: "none",
                          color: copied ? "#00ff9d" : "#5b7fa6",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                        }}
                      >
                        {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                  {result.flagged && (
                    <div
                      style={{
                        marginLeft: "auto",
                        padding: "6px 12px",
                        background: "rgba(255,43,74,0.12)",
                        border: "1px solid rgba(255,43,74,0.3)",
                        borderRadius: 6,
                        color: "#ff2b4a",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <AlertTriangle size={12} />
                      FLAGGED
                    </div>
                  )}
                </div>

                {/* Risk bar */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#7a9cc0", fontSize: 12 }}>Risk Score</span>
                    <span style={{ color: getRiskColor(result.risk), fontSize: 12, fontWeight: 700 }}>
                      {result.risk}/100 — {getRiskLabel(result.risk)}
                    </span>
                  </div>
                  <div style={{ height: 8, background: "#0f1e35", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${result.risk}%`,
                        background: `linear-gradient(90deg, #00ff9d, ${getRiskColor(result.risk)})`,
                        borderRadius: 4,
                        transition: "width 0.8s ease",
                        boxShadow: `0 0 8px ${getRiskColor(result.risk)}88`,
                      }}
                    />
                  </div>
                </div>

                {/* Grid stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { icon: Activity, label: "Balance", value: `${result.balance} ${result.currency}` },
                    { icon: Zap, label: "Transactions", value: result.transactionCount.toLocaleString() },
                    { icon: Clock, label: "First Seen", value: result.firstSeen },
                    { icon: Globe, label: "Country", value: result.country ?? "Unknown" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      style={{
                        background: "#050912",
                        border: "1px solid #0f1e35",
                        borderRadius: 8,
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <Icon size={12} color="#5b7fa6" />
                        <span style={{ color: "#5b7fa6", fontSize: 10 }}>{label}</span>
                      </div>
                      <div style={{ color: "#e2f0ff", fontSize: 13, fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Tags */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                  <Tag size={12} color="#3d5a7a" />
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: "2px 10px",
                        background: result.flagged ? "rgba(255,43,74,0.1)" : "rgba(0,170,255,0.1)",
                        border: `1px solid ${result.flagged ? "#ff2b4a33" : "#00aaff33"}`,
                        borderRadius: 9999,
                        color: result.flagged ? "#ff9090" : "#5bb0ff",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mini flow graph */}
              <div style={{ width: 400, flexShrink: 0 }}>
                <div style={{ color: "#7a9cc0", fontSize: 11, letterSpacing: "0.05em", marginBottom: 8 }}>
                  CONNECTION GRAPH
                </div>
                <div
                  style={{
                    background: "#070d1a",
                    border: "1px solid #1a3050",
                    borderRadius: 10,
                    overflow: "hidden",
                    height: 220,
                  }}
                >
                  <MiniFlowGraph wallet={result} />
                </div>
              </div>
            </div>
          </div>

          {/* Charts + History */}
          <div style={{ display: "flex", gap: 20 }}>
            {/* Volume chart */}
            <div
              style={{
                flex: 2,
                background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
                border: "1px solid #1a3050",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div style={{ color: "#e2f0ff", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                Transaction History
              </div>
              <div style={{ color: "#5b7fa6", fontSize: 11, marginBottom: 20 }}>Volume over time</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={walletHistory}>
                  <defs>
                    <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00aaff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00aaff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: "#5b7fa6", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#5b7fa6", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    name="Volume (ETH)"
                    stroke="#00aaff"
                    strokeWidth={2}
                    fill="url(#histGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Connected wallets */}
            <div
              style={{
                flex: 1,
                background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
                border: "1px solid #1a3050",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div style={{ color: "#e2f0ff", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                Connected Wallets
              </div>
              <div style={{ color: "#5b7fa6", fontSize: 11, marginBottom: 16 }}>
                {walletTxs.length} linked transactions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...new Set([...walletTxs.map((t) => t.from), ...walletTxs.map((t) => t.to)])]
                  .filter((id) => id !== result.id)
                  .map((id) => {
                    const w = walletNodes.find((n) => n.id === id);
                    if (!w) return null;
                    return (
                      <div
                        key={id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          background: w.flagged ? "rgba(255,43,74,0.05)" : "rgba(0,0,0,0.2)",
                          border: `1px solid ${w.flagged ? "#ff2b4a22" : "#0f1e35"}`,
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: getRiskColor(w.risk),
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: "#e2f0ff", fontSize: 11, fontWeight: 600 }}>{w.label}</div>
                          <div
                            style={{
                              color: "#5b7fa6",
                              fontSize: 9,
                              fontFamily: "'JetBrains Mono', monospace",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatAddress(w.address)}
                          </div>
                        </div>
                        <span
                          style={{
                            color: getRiskColor(w.risk),
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {w.risk}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Transaction table */}
          <div
            style={{
              background: "linear-gradient(135deg, #090f1e 0%, #0a1628 100%)",
              border: "1px solid #1a3050",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #1a3050",
                color: "#e2f0ff",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Transaction History ({walletTxs.length} total)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                  {["Direction", "Counterparty", "Amount", "USD Value", "Risk", "Time"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 20px",
                        color: "#3d5a7a",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {walletTxs.map((tx) => {
                  const isOut = tx.from === result.id;
                  const other = walletNodes.find((w) => w.id === (isOut ? tx.to : tx.from));
                  return (
                    <tr
                      key={tx.id}
                      style={{
                        borderTop: "1px solid #0f1e35",
                        background: tx.suspicious ? "rgba(255,43,74,0.04)" : "transparent",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#0a1628")}
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = tx.suspicious
                          ? "rgba(255,43,74,0.04)"
                          : "transparent")
                      }
                    >
                      <td style={{ padding: "12px 20px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            color: isOut ? "#ff7700" : "#00ff9d",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {isOut ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          {isOut ? "SENT" : "RECEIVED"}
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ color: (other?.risk ?? 0) >= 80 ? "#ff6b7a" : "#e2f0ff", fontSize: 12 }}>
                          {other?.label ?? "Unknown"}
                        </div>
                        <div
                          style={{
                            color: "#5b7fa6",
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {formatAddress(other?.address ?? "")}
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px", color: "#e2f0ff", fontSize: 12, fontWeight: 600 }}>
                        {tx.amount} {tx.currency}
                      </td>
                      <td style={{ padding: "12px 20px", color: "#7a9cc0", fontSize: 12 }}>
                        ${tx.usdValue.toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            background: `${getRiskColor(tx.riskScore)}18`,
                            border: `1px solid ${getRiskColor(tx.riskScore)}33`,
                            borderRadius: 9999,
                            color: getRiskColor(tx.riskScore),
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {tx.riskScore}
                        </span>
                      </td>
                      <td style={{ padding: "12px 20px", color: "#5b7fa6", fontSize: 11 }}>
                        {timeAgo(tx.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: #3d5a7a; }
      `}</style>
    </div>
  );
}
