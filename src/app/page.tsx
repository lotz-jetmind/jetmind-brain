"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const modules = [
    {
        id: "knowledge-graph", title: "Regulation Graph",
        subtitle: "EASA requirements as machine-readable knowledge",
        icon: "⬡", color: "#00D4FF", href: "/graph", status: "building",
        description: "Live compliance score · Automatic gap detection · Linked evidence",
    },
    {
        id: "safety-intel", title: "Safety Intelligence",
        subtitle: "Pattern recognition across all safety data",
        icon: "◈", color: "#10B981", href: "/safety", status: "live",
        description: "Weak signal detection · Predictive alerts · Cross-fleet anonymised trends",
    },
    {
        id: "query", title: "AI Query",
        subtitle: "Natural language over all Jetmind data",
        icon: "◎", color: "#7C3AED", href: "/query", status: "live",
        description: "Ask anything about findings, audits, safety, compliance, flights",
    },
    {
        id: "shadow-audit", title: "Shadow Audit",
        subtitle: "Continuous compliance monitoring",
        icon: "◇", color: "#F59E0B", href: "/audit", status: "live",
        description: "Always-on audit state · Auditor export on demand · Zero-prep compliance",
    },
    {
        id: "manuals", title: "Auto-Manual",
        subtitle: "Manuals that update themselves",
        icon: "▣", color: "#EC4899", href: "/manuals", status: "live",
        description: "EASA change → diff-based manual update proposal · Structured content engine",
    },
    {
        id: "tenants", title: "Tenant Overview",
        subtitle: "All organisations in one view",
        icon: "⊞", color: "#64748B", href: "/tenants", status: "live",
        description: "Health scores · AI usage · Compliance status across all tenants",
    },
];

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
    live:     { label: "LIVE",     color: "#10B981", bg: "rgba(16,185,129,0.1)" },
    building: { label: "BUILDING", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
    planned:  { label: "PLANNED",  color: "#64748B", bg: "rgba(100,116,139,0.1)" },
};

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    if (status === "loading" || !session) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--brain-bg)" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)" }}>
                <div style={{ maxWidth: 1152, margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #00D4FF20, #7C3AED20)", border: "1px solid rgba(0,212,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
                                jetmind <span style={{ color: "#00D4FF" }}>brain</span>
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>AI Intelligence Layer</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{session.user.email}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "#00D4FF", letterSpacing: "0.08em" }}>SUPERADMIN</div>
                        <a href="https://hyp.jetmind.io" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}>← Jetmind</a>
                        <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", fontFamily: "inherit" }}>Logout</button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <div style={{ maxWidth: 1152, margin: "0 auto", padding: "64px 24px 48px" }} className="animate-slide-up">
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#00D4FF", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 20, height: 1, background: "#00D4FF", display: "inline-block" }} />
                    AI-First Intelligence System
                </div>
                <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 16, background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.5) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Regulation as a<br />Knowledge Graph.
                </h1>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 480 }}>
                    Not documents. Not reports. Live compliance scores, pattern recognition across safety data, and natural language queries over all of Jetmind.
                </p>
            </div>

            {/* Modules */}
            <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 24px 120px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                    {modules.map((mod) => {
                        const s = statusLabel[mod.status];
                        const isLive = mod.status === "live";
                        return (
                            <Link key={mod.id} href={mod.href} style={{ display: "block", textDecoration: "none", opacity: mod.status === "planned" ? 0.5 : 1 }} className="animate-slide-up">
                                <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${isLive ? `${mod.color}25` : "rgba(255,255,255,0.05)"}`, borderRadius: 16, padding: 24, transition: "all 0.2s ease", cursor: isLive ? "pointer" : "default" }}
                                    onMouseEnter={e => { if (isLive) { const el = e.currentTarget as HTMLDivElement; el.style.background = `${mod.color}08`; el.style.borderColor = `${mod.color}40`; el.style.transform = "translateY(-2px)"; } }}
                                    onMouseLeave={e => { if (isLive) { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,0.02)"; el.style.borderColor = `${mod.color}25`; el.style.transform = "translateY(0)"; } }}
                                >
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${mod.color}12`, border: `1px solid ${mod.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: mod.color }}>{mod.icon}</div>
                                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 4, color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}>{s.label}</span>
                                    </div>
                                    <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.01em" }}>{mod.title}</div>
                                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{mod.subtitle}</div>
                                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>{mod.description}</div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Status bar */}
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, borderTop: "1px solid var(--brain-border)", background: "rgba(4,6,8,0.95)", backdropFilter: "blur(20px)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 24, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} className="animate-pulse-glow" />
                    Connected to Jetmind DB
                </span>
                <span>brain.jetmind.io</span>
                <span style={{ marginLeft: "auto" }}>v0.1.0 — Phase 1</span>
            </div>
        </div>
    );
}
