"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const regulations = [
    { id: "ORO.FTL", label: "ORO.FTL", desc: "Flight & Duty Time Limitations", color: "#00D4FF", refs: 234, status: "active" },
    { id: "ORO.GEN", label: "ORO.GEN", desc: "General Requirements", color: "#7C3AED", refs: 187, status: "active" },
    { id: "CAT.OP", label: "CAT.OP", desc: "Commercial Air Transport Operations", color: "#10B981", refs: 156, status: "active" },
    { id: "CAMO.A", label: "CAMO.A", desc: "Airworthiness Management", color: "#F59E0B", refs: 143, status: "active" },
    { id: "Part-66", label: "Part-66", desc: "Aircraft Maintenance Licencing", color: "#EC4899", refs: 98, status: "active" },
    { id: "Part-145", label: "Part-145", desc: "Maintenance Organisation", color: "#64748B", refs: 87, status: "active" },
    { id: "NCC.OP", label: "NCC.OP", desc: "Non-Commercial Complex Aircraft", color: "#6366F1", refs: 54, status: "planned" },
    { id: "NCO.OP", label: "NCO.OP", desc: "Non-Commercial Non-Complex", color: "#14B8A6", refs: 32, status: "planned" },
];

export default function GraphPage() {
    const { status } = useSession();
    const router = useRouter();
    const [selected, setSelected] = useState<string | null>(null);
    const [stats, setStats] = useState({ findings: 0, orgs: 0 });

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/stats").then(r => r.json()).then(d => setStats({ findings: d.safety || 0, orgs: d.orgs || 0 })).catch(() => {});
        }
    }, [status]);

    const selectedReg = regulations.find(r => r.id === selected);

    if (status === "loading") return <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }} />;

    return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)" }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                        <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                        <span style={{ fontSize: 13, color: "#00D4FF" }}>Regulation Graph</span>
                    </div>
                    <div style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B", fontWeight: 700, letterSpacing: "0.05em" }}>
                        PHASE 2 — BUILDING
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
                {/* Left — Graph visualization */}
                <div>
                    <div style={{ marginBottom: 24 }}>
                        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Regulation Knowledge Graph</h1>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                            EASA regulations as a machine-readable graph — linked to findings, audits, and compliance evidence across {stats.orgs} tenants.
                        </p>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                        {[
                            { label: "Regulation Nodes", value: regulations.filter(r => r.status === "active").length, color: "#00D4FF" },
                            { label: "Linked Findings", value: stats.findings, color: "#F59E0B" },
                            { label: "Active Tenants", value: stats.orgs, color: "#10B981" },
                            { label: "Coverage", value: "61%", color: "#7C3AED" },
                        ].map(s => (
                            <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 16px" }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Graph grid */}
                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, minHeight: 380, position: "relative" }}>
                        <div style={{ position: "absolute", top: 12, right: 12, fontSize: 10, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>EASA AIR OPS / CAMO</div>

                        {/* Regulation nodes */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                            {regulations.map(reg => (
                                <button
                                    key={reg.id}
                                    onClick={() => setSelected(selected === reg.id ? null : reg.id)}
                                    style={{
                                        background: selected === reg.id ? `${reg.color}15` : "rgba(255,255,255,0.02)",
                                        border: `1px solid ${selected === reg.id ? `${reg.color}50` : "rgba(255,255,255,0.06)"}`,
                                        borderRadius: 12, padding: "16px 12px",
                                        cursor: reg.status === "active" ? "pointer" : "default",
                                        textAlign: "center", fontFamily: "inherit",
                                        opacity: reg.status === "planned" ? 0.4 : 1,
                                        transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={e => { if (reg.status === "active") e.currentTarget.style.borderColor = `${reg.color}40`; }}
                                    onMouseLeave={e => { if (selected !== reg.id) e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                                >
                                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${reg.color}15`, border: `1px solid ${reg.color}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontSize: 10, fontWeight: 800, color: reg.color }}>
                                        ⬡
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2, color: selected === reg.id ? reg.color : "white" }}>{reg.label}</div>
                                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", lineHeight: 1.3 }}>{reg.desc}</div>
                                    <div style={{ fontSize: 10, marginTop: 8, color: reg.color, fontWeight: 700 }}>{reg.refs} refs</div>
                                </button>
                            ))}
                        </div>

                        {/* Coming soon overlay */}
                        <div style={{ marginTop: 24, padding: "16px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 10, textAlign: "center" }}>
                            <div style={{ fontSize: 12, color: "rgba(0,212,255,0.5)", marginBottom: 4 }}>⬡ Interactive force-directed graph visualization in Phase 2</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Nodes = regulation articles · Edges = evidence links · Heatmap = compliance gaps</div>
                        </div>
                    </div>
                </div>

                {/* Right — Detail panel */}
                <div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, position: "sticky", top: 24 }}>
                        {selectedReg ? (
                            <>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${selectedReg.color}12`, border: `1px solid ${selectedReg.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: selectedReg.color, fontSize: 16 }}>⬡</div>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: selectedReg.color }}>{selectedReg.label}</div>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{selectedReg.desc}</div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {[
                                        { label: "References in findings", value: selectedReg.refs },
                                        { label: "Coverage", value: "Phase 2" },
                                        { label: "Last updated", value: "—" },
                                        { label: "Linked requirements", value: "Phase 2" },
                                    ].map(item => (
                                        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{item.label}</span>
                                            <span style={{ fontSize: 12, fontWeight: 600 }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: "center", padding: "48px 0" }}>
                                <div style={{ fontSize: 24, marginBottom: 8 }}>⬡</div>
                                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Select a regulation node to see details</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
