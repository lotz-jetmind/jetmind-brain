"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Summary = {
    totalAudits: number; recentAudits: number; closedAudits: number;
    closureRate: number; overdueAudits: number; avgFindings: number;
    totalFindings: number; openL1: number; openL2: number;
    overdueFindings: number; pendingContainment: number;
    safetyLinked: number; complianceScore: number;
};
type TopOrg = { orgId: string; audits: number; findings: number; open: number };
type Charts = {
    auditByStatus: [string, number][];
    auditByType: [string, number][];
    findingBySeverity: [string, number][];
    findingByState: [string, number][];
    auditTimeline: [string, number][];
    topOrgs: TopOrg[];
};
type AuditData = { summary: Summary; charts: Charts };

const SEVERITY_COLOR: Record<string, string> = {
    LEVEL1: "#EF4444", LEVEL2: "#F59E0B", LEVEL3: "#10B981", OBS: "#64748B",
};

function ScoreGauge({ score }: { score: number }) {
    const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";
    const label = score >= 80 ? "COMPLIANT" : score >= 60 ? "AT RISK" : "NON-COMPLIANT";
    return (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 12px" }}>
                <svg viewBox="0 0 100 100" style={{ width: "100%", transform: "rotate(-90deg)" }}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="10"
                        strokeDasharray={`${score * 2.638} ${263.8}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: "-0.04em" }}>{score}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>/ 100</div>
                </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color, padding: "3px 10px", borderRadius: 4, background: `${color}15`, border: `1px solid ${color}30`, display: "inline-block" }}>{label}</div>
        </div>
    );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label.replace(/_/g, " ")}</span>
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
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 60 }}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
            {values.map((v, i) => <circle key={i} cx={i * w} cy={100 - (v / max) * 80} r="3" fill={color} />)}
        </svg>
    );
}

export default function AuditPage() {
    const { status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<AuditData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/audit")
                .then(r => r.json())
                .then(d => { if (d.error) setError(d.error); else setData(d); setLoading(false); })
                .catch(e => { setError(String(e)); setLoading(false); });
        }
    }, [status]);

    if (status === "loading" || loading) return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading Shadow Audit…</div>
        </div>
    );

    const s = data?.summary;
    const c = data?.charts;

    const kpis = s ? [
        { label: "Total Audits", value: s.totalAudits, sub: `${s.recentAudits} in last 30 days`, color: "#F59E0B", icon: "◇" },
        { label: "Closure Rate", value: `${s.closureRate}%`, sub: `${s.closedAudits} closed`, color: "#10B981", icon: "☑" },
        { label: "Overdue Audits", value: s.overdueAudits, sub: "past planned date", color: "#EF4444", icon: "⚠", alert: s.overdueAudits > 0 },
        { label: "Open L1 Findings", value: s.openL1, sub: "critical non-conformances", color: "#EF4444", icon: "⛔", alert: s.openL1 > 0 },
        { label: "Open L2 Findings", value: s.openL2, sub: "major non-conformances", color: "#F59E0B", icon: "⚠", alert: s.openL2 > 5 },
        { label: "Overdue Findings", value: s.overdueFindings, sub: "past closure date", color: "#EF4444", icon: "◷", alert: s.overdueFindings > 0 },
        { label: "Pending Containment", value: s.pendingContainment, sub: "no containment action yet", color: "#7C3AED", icon: "◈" },
        { label: "Safety Linked", value: s.safetyLinked, sub: "cross-module findings", color: "#00D4FF", icon: "◎" },
    ] : [];

    return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)", position: "sticky", top: 0, background: "rgba(4,6,8,0.95)", backdropFilter: "blur(20px)", zIndex: 10 }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                        <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                        <span style={{ fontSize: 13, color: "#F59E0B" }}>Shadow Audit</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", display: "inline-block" }} />
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Continuous monitoring</span>
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
                {/* Title */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Shadow Audit</h1>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                        Always-on compliance monitoring — audits, findings, containment, and cross-module safety links.
                    </p>
                </div>

                {error && (
                    <div style={{ padding: "14px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, fontSize: 13, color: "#FCA5A5", marginBottom: 24 }}>
                        ⚠ {error}
                    </div>
                )}

                {s && (
                    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, marginBottom: 28 }}>
                        {/* Compliance Score */}
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>Compliance Score</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4, textAlign: "center" }}>Live calculation</div>
                            <ScoreGauge score={s.complianceScore} />
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.5 }}>
                                Based on open L1/L2 findings,<br />overdue items & audits
                            </div>
                        </div>

                        {/* KPI Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                            {kpis.map(kpi => (
                                <div key={kpi.label} style={{
                                    background: kpi.alert ? `${kpi.color}08` : "rgba(255,255,255,0.02)",
                                    border: `1px solid ${kpi.alert ? `${kpi.color}30` : "rgba(255,255,255,0.06)"}`,
                                    borderRadius: 12, padding: "14px 16px",
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                        <span style={{ fontSize: 16, color: kpi.color }}>{kpi.icon}</span>
                                        {kpi.alert && <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: `${kpi.color}20`, color: kpi.color }}>!</span>}
                                    </div>
                                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 3 }}>{kpi.label}</div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{kpi.sub}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Charts */}
                {c && (
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                            {/* Timeline */}
                            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Audit Activity</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>New audits per month</div>
                                <Sparkline data={c.auditTimeline} color="#F59E0B" />
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                                    {c.auditTimeline.map(([k, v]) => (
                                        <div key={k} style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{k.slice(5)}</div>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "#F59E0B" }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Finding Severity */}
                            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Finding Severity</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>All findings by level</div>
                                {c.findingBySeverity.map(([k, v]) => (
                                    <MiniBar key={k} label={k} value={v} max={c.findingBySeverity[0]?.[1] || 1} color={SEVERITY_COLOR[k] || "#64748B"} />
                                ))}
                            </div>

                            {/* Finding State */}
                            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Finding States</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Lifecycle distribution</div>
                                {c.findingByState.slice(0, 7).map(([k, v]) => (
                                    <MiniBar key={k} label={k} value={v} max={c.findingByState[0]?.[1] || 1} color="#7C3AED" />
                                ))}
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {/* Audit Status */}
                            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Audit Status</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Current audit pipeline</div>
                                {c.auditByStatus.map(([k, v]) => (
                                    <MiniBar key={k} label={k} value={v} max={c.auditByStatus[0]?.[1] || 1} color="#F59E0B" />
                                ))}
                            </div>

                            {/* Top Orgs by finding count */}
                            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Top Orgs by Findings</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Which tenants have most activity</div>
                                {c.topOrgs.length > 0 ? c.topOrgs.map(org => (
                                    <div key={org.orgId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12 }}>
                                        <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 11 }}>{org.orgId}</span>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <span style={{ color: "#F59E0B", fontWeight: 700 }}>{org.findings} findings</span>
                                            {org.open > 0 && <span style={{ color: "#EF4444", fontWeight: 700 }}>{org.open} open</span>}
                                        </div>
                                    </div>
                                )) : <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No data</div>}
                            </div>
                        </div>
                    </>
                )}

                {/* Export & AI */}
                <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ padding: 20, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Audit Export</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Generate auditor-ready compliance report</div>
                        </div>
                        <div style={{ fontSize: 11, padding: "6px 14px", borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B", fontWeight: 700 }}>Phase 5 →</div>
                    </div>
                    <div style={{ padding: 20, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>AI Audit Analysis</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Ask Gemini about audit patterns & risks</div>
                        </div>
                        <a href="/query" style={{ fontSize: 11, padding: "6px 14px", borderRadius: 8, background: "#7C3AED", color: "white", textDecoration: "none", fontWeight: 700 }}>Query →</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
