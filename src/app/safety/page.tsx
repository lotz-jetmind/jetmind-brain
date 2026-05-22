"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Summary = {
    total: number; last30: number; last7: number; trendPct: number;
    highRisk: number; pendingTriage: number; activeHazards: number;
    openCapTasks: number; overdueCap: number; openDefects: number; riskAssessments: number;
};
type Charts = {
    byStatus: [string, number][];
    byRisk: [string, number][];
    byPhase: [string, number][];
    byCategory: [string, number][];
    timeline: [string, number][];
    topAta: [string, number][];
};
type SafetyData = { summary: Summary; charts: Charts };

const RISK_COLORS: Record<string, string> = {
    HIGH: "#EF4444", CRITICAL: "#DC2626", UNACCEPTABLE: "#DC2626",
    MEDIUM: "#F59E0B", MODERATE: "#F59E0B",
    LOW: "#10B981", ACCEPTABLE: "#10B981",
    Unknown: "#64748B",
};

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{value}</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.8s ease" }} />
            </div>
        </div>
    );
}

function Sparkline({ data, color }: { data: [string, number][]; color: string }) {
    if (!data.length) return null;
    const values = data.map(d => d[1]);
    const max = Math.max(...values, 1);
    const w = 100 / (data.length - 1 || 1);
    const points = values.map((v, i) => `${i * w},${100 - (v / max) * 80}`).join(" ");
    return (
        <svg viewBox={`0 0 100 100`} preserveAspectRatio="none" style={{ width: "100%", height: 60 }}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            {values.map((v, i) => (
                <circle key={i} cx={i * w} cy={100 - (v / max) * 80} r="2.5" fill={color} />
            ))}
        </svg>
    );
}

export default function SafetyPage() {
    const { status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<SafetyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/safety")
                .then(r => r.json())
                .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false); })
                .catch(e => { setError(String(e)); setLoading(false); });
        }
    }, [status]);

    if (status === "loading" || loading) return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading Safety Intelligence…</div>
        </div>
    );

    const s = data?.summary;
    const c = data?.charts;

    const kpis = s ? [
        { label: "Total Occurrences", value: s.total, color: "#00D4FF", sub: `${s.last30} in last 30 days`, icon: "◈" },
        { label: "High Risk", value: s.highRisk, color: "#EF4444", sub: "require immediate action", icon: "⚠", alert: s.highRisk > 0 },
        { label: "Pending Triage", value: s.pendingTriage, color: "#F59E0B", sub: "awaiting Safety Manager", icon: "◷", alert: s.pendingTriage > 0 },
        { label: "Active Hazards", value: s.activeHazards, color: "#7C3AED", sub: "in risk assessment", icon: "◇" },
        { label: "Open CAP Tasks", value: s.openCapTasks, color: "#10B981", sub: `${s.overdueCap} overdue`, icon: "☑", alert: s.overdueCap > 0 },
        { label: "Open Defects", value: s.openDefects, color: "#64748B", sub: "across fleet", icon: "◉" },
    ] : [];

    return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)", position: "sticky", top: 0, background: "rgba(4,6,8,0.95)", backdropFilter: "blur(20px)", zIndex: 10 }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                        <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                        <span style={{ fontSize: 13, color: "#10B981" }}>Safety Intelligence</span>
                    </div>
                    {s && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>
                                {s.trendPct > 0 ? `↑ ${s.trendPct}%` : s.trendPct < 0 ? `↓ ${Math.abs(s.trendPct)}%` : "→ stable"} vs last week
                            </span>
                        </div>
                    )}
                </div>
            </header>

            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
                {/* Title */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Safety Intelligence</h1>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                        Pattern recognition across all safety data — occurrences, hazards, CAP tasks, defects.
                    </p>
                </div>

                {error && (
                    <div style={{ padding: "14px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, fontSize: 13, color: "#FCA5A5", marginBottom: 24 }}>
                        ⚠ {error}
                    </div>
                )}

                {/* KPI Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
                    {kpis.map(kpi => (
                        <div key={kpi.label} style={{
                            background: kpi.alert ? `${kpi.color}08` : "rgba(255,255,255,0.02)",
                            border: `1px solid ${kpi.alert ? `${kpi.color}30` : "rgba(255,255,255,0.06)"}`,
                            borderRadius: 14, padding: "18px 20px",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                <span style={{ fontSize: 20, color: kpi.color }}>{kpi.icon}</span>
                                {kpi.alert && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: `${kpi.color}20`, color: kpi.color, letterSpacing: "0.05em" }}>ALERT</span>}
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{kpi.label}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{kpi.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Charts row */}
                {c && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                        {/* Timeline */}
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Trend (6 Monate)</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Occurrences per month</div>
                            <Sparkline data={c.timeline} color="#00D4FF" />
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                {c.timeline.map(([k, v]) => (
                                    <div key={k} style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{k.slice(5)}</div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "#00D4FF" }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* By Status */}
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>By Status</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Occurrence distribution</div>
                            {c.byStatus.slice(0, 6).map(([k, v]) => (
                                <MiniBar key={k} label={k.replace(/_/g, " ")} value={v} max={c.byStatus[0]?.[1] || 1} color="#7C3AED" />
                            ))}
                        </div>

                        {/* By Risk */}
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>By Risk Level</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Risk distribution</div>
                            {c.byRisk.slice(0, 6).map(([k, v]) => (
                                <MiniBar key={k} label={k} value={v} max={c.byRisk[0]?.[1] || 1} color={RISK_COLORS[k.toUpperCase()] || "#64748B"} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Bottom charts */}
                {c && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {/* By Flight Phase */}
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>By Flight Phase</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>When do occurrences happen?</div>
                            {c.byPhase.slice(0, 8).map(([k, v]) => (
                                <MiniBar key={k} label={k.replace(/_/g, " ")} value={v} max={c.byPhase[0]?.[1] || 1} color="#F59E0B" />
                            ))}
                        </div>

                        {/* Top ATA Chapters */}
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Top ATA Chapters (Defects)</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Where are defects concentrated?</div>
                            {c.topAta.length > 0
                                ? c.topAta.map(([k, v]) => (
                                    <MiniBar key={k} label={`ATA ${k}`} value={v} max={c.topAta[0]?.[1] || 1} color="#EF4444" />
                                ))
                                : <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No defect data</div>
                            }
                        </div>
                    </div>
                )}

                {/* AI Insights button */}
                <div style={{ marginTop: 24, padding: 20, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>AI Safety Analysis</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Ask Gemini to analyse patterns, predict risks, and suggest mitigations</div>
                    </div>
                    <a href="/query" style={{
                        background: "#10B981", color: "white", textDecoration: "none",
                        padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                        whiteSpace: "nowrap",
                    }}>
                        Open AI Query →
                    </a>
                </div>
            </div>
        </div>
    );
}
