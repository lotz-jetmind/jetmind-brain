"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Alert } from "@/app/api/alerts/route";

const modules = [
    { id: "knowledge-graph", title: "Regulation Graph", subtitle: "EASA requirements as machine-readable knowledge", icon: "⬡", color: "#00D4FF", href: "/graph", status: "building", description: "Live compliance score · Automatic gap detection · Linked evidence" },
    { id: "safety-intel",    title: "Safety Intelligence", subtitle: "Pattern recognition across all safety data", icon: "◈", color: "#10B981", href: "/safety", status: "live", description: "Weak signal detection · Predictive alerts · Cross-fleet anonymised trends" },
    { id: "query",           title: "AI Query", subtitle: "Natural language over all Jetmind data", icon: "◎", color: "#7C3AED", href: "/query", status: "live", description: "Ask anything about findings, audits, safety, compliance, flights" },
    { id: "shadow-audit",    title: "Shadow Audit", subtitle: "Continuous compliance monitoring", icon: "◇", color: "#F59E0B", href: "/audit", status: "live", description: "Always-on audit state · Auditor export on demand · Zero-prep compliance" },
    { id: "manuals",         title: "Auto-Manual", subtitle: "Manuals that update themselves", icon: "▣", color: "#EC4899", href: "/manuals", status: "live", description: "EASA change → diff-based manual update proposal · Structured content engine" },
    { id: "tenants",         title: "Tenant Command Center", subtitle: "Health scores per organisation", icon: "⊞", color: "#64748B", href: "/tenants", status: "live", description: "Health scores · Compliance status · Findings & occurrences per tenant" },
    { id: "memory",          title: "Brain Memory", subtitle: "AI insights and morning briefing", icon: "◉", color: "#6366F1", href: "/memory", status: "live", description: "Daily AI briefing · Saved queries · Institutional knowledge base" },
];

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
    live:     { label: "LIVE",     color: "#10B981", bg: "rgba(16,185,129,0.1)" },
    building: { label: "BUILDING", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
    planned:  { label: "PLANNED",  color: "#64748B", bg: "rgba(100,116,139,0.1)" },
};

type PlatformStats = {
    platform: { users: number; orgs: number; flights: number; healthScore: number };
    safety: { occurrences: number; highRisk: number; pendingTriage: number };
    audit: { openL1: number; openL2: number; overdueFindings: number; totalAudits: number };
    manuals: { totalManuals: number; outdatedManuals: number; openAmendments: number };
    brain: { memories: number };
};

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
            fetch("/api/alerts")
                .then(r => r.json())
                .then(data => { if (Array.isArray(data)) setAlerts(data); })
                .catch(() => {});
        }
    }, [status]);

    if (status === "loading" || !session) {
        return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--brain-bg)" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading...</div></div>;
    }

    const hs = stats?.platform.healthScore ?? null;
    const hsColor = hs === null ? "#64748B" : hs >= 80 ? "#10B981" : hs >= 60 ? "#F59E0B" : "#EF4444";

    return (
        <div className="min-h-screen" style={{ background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)" }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #00D4FF20, #7C3AED20)", border: "1px solid rgba(0,212,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>jetmind <span style={{ color: "#00D4FF" }}>brain</span></div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>AI Intelligence Layer</div>
                        </div>
                    </div>
                    {/* Platform health pill */}
                    {hs !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: `${hsColor}12`, border: `1px solid ${hsColor}30` }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: hsColor, display: "inline-block" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: hsColor }}>Platform Health {hs}/100</span>
                        </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{session.user.email}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "#00D4FF", letterSpacing: "0.08em" }}>SUPERADMIN</div>
                        <a href="https://hyp.jetmind.io" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}>← Jetmind</a>
                        <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", fontFamily: "inherit" }}>Logout</button>
                    </div>
                </div>
            </header>

            {/* Global Alert Banner */}
            {alerts.length > 0 && (
                <div style={{ maxWidth: 1152, margin: "0 auto", padding: "24px 24px 0" }}>
                    {alerts.slice(0, 3).map(a => (
                        <a
                            href={a.href}
                            key={a.id}
                            style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "10px 16px", borderRadius: 10, marginBottom: 6,
                                textDecoration: "none",
                                background:
                                    a.severity === "CRITICAL" ? "rgba(239,68,68,0.08)"
                                    : a.severity === "HIGH" ? "rgba(245,158,11,0.08)"
                                    : "rgba(100,116,139,0.08)",
                                border: `1px solid ${
                                    a.severity === "CRITICAL" ? "rgba(239,68,68,0.25)"
                                    : a.severity === "HIGH" ? "rgba(245,158,11,0.25)"
                                    : "rgba(100,116,139,0.15)"
                                }`,
                                transition: "opacity 0.15s ease",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                        >
                            <span style={{
                                fontSize: 11, fontWeight: 800, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                                background:
                                    a.severity === "CRITICAL" ? "rgba(239,68,68,0.2)"
                                    : a.severity === "HIGH" ? "rgba(245,158,11,0.2)"
                                    : "rgba(100,116,139,0.15)",
                                color:
                                    a.severity === "CRITICAL" ? "#EF4444"
                                    : a.severity === "HIGH" ? "#F59E0B"
                                    : "#94A3B8",
                            }}>
                                {a.severity}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "white", flexShrink: 0 }}>
                                {a.title}
                            </span>
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {a.description}
                            </span>
                            <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>→</span>
                        </a>
                    ))}
                </div>
            )}

            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 120px" }}>

                {/* Platform stats bar */}
                {stats && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 36, padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14 }}>
                        {[
                            { label: "Organisations", value: stats.platform.orgs, color: "#00D4FF" },
                            { label: "Occurrences", value: stats.safety.occurrences, color: "#10B981", alert: stats.safety.highRisk > 0 },
                            { label: "Open L1 Findings", value: stats.audit.openL1, color: "#EF4444", alert: stats.audit.openL1 > 0 },
                            { label: "Overdue Items", value: stats.audit.overdueFindings, color: "#F59E0B", alert: stats.audit.overdueFindings > 0 },
                            { label: "Brain Memories", value: stats.brain.memories, color: "#6366F1" },
                        ].map(s => (
                            <div key={s.label} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: s.alert ? s.color : s.color, letterSpacing: "-0.02em" }}>{s.value.toLocaleString()}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Hero */}
                <div style={{ marginBottom: 36 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#00D4FF", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 20, height: 1, background: "#00D4FF", display: "inline-block" }} />
                        AI-First Intelligence System
                    </div>
                    <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 12, background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.5) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Regulation as a<br />Knowledge Graph.
                    </h1>
                    <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 480 }}>
                        Not documents. Not reports. Live compliance scores, pattern recognition, and natural language queries over all of Jetmind.
                    </p>
                </div>

                {/* Modules */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                    {modules.map((mod) => {
                        const s = statusLabel[mod.status];
                        const isLive = mod.status === "live";
                        return (
                            <Link key={mod.id} href={mod.href} style={{ display: "block", textDecoration: "none", opacity: mod.status === "planned" ? 0.4 : 1 }}>
                                <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${isLive ? `${mod.color}25` : "rgba(255,255,255,0.05)"}`, borderRadius: 16, padding: 22, transition: "all 0.2s ease", cursor: isLive ? "pointer" : "default", height: "100%" }}
                                    onMouseEnter={e => { if (isLive) { const el = e.currentTarget as HTMLDivElement; el.style.background = `${mod.color}08`; el.style.borderColor = `${mod.color}45`; el.style.transform = "translateY(-2px)"; } }}
                                    onMouseLeave={e => { if (isLive) { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,0.02)"; el.style.borderColor = `${mod.color}25`; el.style.transform = "translateY(0)"; } }}
                                >
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
                                        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${mod.color}12`, border: `1px solid ${mod.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: mod.color }}>{mod.icon}</div>
                                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 4, color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}>{s.label}</span>
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.01em" }}>{mod.title}</div>
                                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>{mod.subtitle}</div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", lineHeight: 1.6 }}>{mod.description}</div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Status bar */}
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, borderTop: "1px solid var(--brain-border)", background: "rgba(4,6,8,0.96)", backdropFilter: "blur(20px)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 24, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
                    Connected to Jetmind DB
                </span>
                <span>brain.jetmind.io</span>
                <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.15)" }}>
                    {stats ? `${stats.platform.users} users · ${stats.platform.orgs} orgs · ${stats.platform.flights} flights` : "Loading…"}
                </span>
                <span>v0.6.0 — Phase 6</span>
            </div>
        </div>
    );
}
