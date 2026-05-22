"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { TenantHealth } from "@/app/api/tenants/health/route";

function HealthGauge({ score, label }: { score: number; label: TenantHealth["healthLabel"] }) {
    const color =
        label === "HEALTHY" ? "#10B981" : label === "AT_RISK" ? "#F59E0B" : "#EF4444";
    const size = 48;
    const r = 20;
    const circ = 2 * Math.PI * r;
    const progress = ((100 - score) / 100) * circ;

    return (
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={4}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={4}
                    strokeDasharray={`${circ}`}
                    strokeDashoffset={progress}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
            </svg>
            <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color,
            }}>
                {score}
            </div>
        </div>
    );
}

function HealthBadge({ label }: { label: TenantHealth["healthLabel"] }) {
    const cfg = {
        HEALTHY: { color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
        AT_RISK: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
        CRITICAL: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
    }[label];
    return (
        <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
            padding: "2px 7px", borderRadius: 4,
            color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
        }}>
            {label}
        </span>
    );
}

export default function TenantsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [tenants, setTenants] = useState<TenantHealth[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/tenants/health")
                .then(r => r.json())
                .then(data => {
                    setTenants(Array.isArray(data) ? data : []);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [status]);

    if (status === "loading") return <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }} />;

    const filtered = tenants.filter(t =>
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.toLowerCase().includes(search.toLowerCase()),
    );

    const totalOrgs = tenants.length;
    const healthy = tenants.filter(t => t.healthLabel === "HEALTHY").length;
    const atRisk = tenants.filter(t => t.healthLabel === "AT_RISK").length;
    const critical = tenants.filter(t => t.healthLabel === "CRITICAL").length;

    return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                    <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                    <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                    <span style={{ fontSize: 13, color: "#64748B" }}>Tenant Health Command Center</span>
                </div>
            </header>

            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 120px" }}>
                {/* Title */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36, gap: 16, flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#64748B", textTransform: "uppercase", marginBottom: 8 }}>
                            Plattform-Übersicht
                        </div>
                        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
                            Tenant Health Command Center
                        </h1>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                            {loading ? "Lade Daten…" : `${totalOrgs} Organisationen · automatisch bewertet`}
                        </p>
                    </div>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Organisation suchen…"
                        style={{
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8, padding: "8px 14px", color: "white", fontSize: 13,
                            outline: "none", fontFamily: "inherit", width: 220,
                        }}
                    />
                </div>

                {/* Header stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
                    {[
                        { label: "Gesamt", value: totalOrgs, color: "#64748B", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.15)" },
                        { label: "Healthy", value: healthy, color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
                        { label: "At Risk", value: atRisk, color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
                        { label: "Critical", value: critical, color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
                    ].map(c => (
                        <div key={c.label} style={{
                            background: c.bg, border: `1px solid ${c.border}`,
                            borderRadius: 12, padding: "16px 20px", textAlign: "center",
                        }}>
                            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: c.color }}>
                                {loading ? "—" : c.value}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{c.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tenant list */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                        Lade Tenant Health Scores…
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                        Keine Ergebnisse für „{search}"
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {filtered.map(tenant => {
                            const accentColor =
                                tenant.healthLabel === "HEALTHY"
                                    ? "#10B981"
                                    : tenant.healthLabel === "AT_RISK"
                                      ? "#F59E0B"
                                      : "#EF4444";
                            return (
                                <div
                                    key={tenant.orgId}
                                    style={{
                                        background: "rgba(255,255,255,0.02)",
                                        border: `1px solid rgba(255,255,255,0.05)`,
                                        borderRadius: 12, padding: "14px 20px",
                                        display: "flex", alignItems: "center", gap: 16,
                                        transition: "border-color 0.15s ease, background 0.15s ease",
                                        cursor: "default",
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = `${accentColor}30`;
                                        e.currentTarget.style.background = `${accentColor}05`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                                        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                                    }}
                                >
                                    {/* Health gauge */}
                                    <HealthGauge score={tenant.healthScore} label={tenant.healthLabel} />

                                    {/* Avatar + name */}
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 9,
                                        background: `${accentColor}12`, border: `1px solid ${accentColor}25`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 14, fontWeight: 800, color: accentColor, flexShrink: 0,
                                    }}>
                                        {tenant.name[0]?.toUpperCase()}
                                    </div>

                                    {/* Name + slug */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {tenant.name}
                                            </span>
                                            <HealthBadge label={tenant.healthLabel} />
                                        </div>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                                            {tenant.slug} · {tenant.users} {tenant.users === 1 ? "User" : "Users"}
                                        </div>
                                    </div>

                                    {/* Alert badges */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                        {tenant.findings.openL1 > 0 && (
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                                                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                                                color: "#EF4444",
                                            }}>
                                                L1 ×{tenant.findings.openL1}
                                            </span>
                                        )}
                                        {tenant.occurrences.highRisk > 0 && (
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                                                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                                                color: "#EF4444",
                                            }}>
                                                ⚠ {tenant.occurrences.highRisk}
                                            </span>
                                        )}
                                        {tenant.occurrences.pendingTriage > 0 && (
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                                                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                                                color: "#F59E0B",
                                            }}>
                                                Triage ×{tenant.occurrences.pendingTriage}
                                            </span>
                                        )}
                                        {tenant.findings.openL1 === 0 && tenant.occurrences.highRisk === 0 && tenant.occurrences.pendingTriage === 0 && (
                                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>—</span>
                                        )}
                                    </div>

                                    {/* Findings summary */}
                                    <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: tenant.findings.total > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}>
                                                {tenant.findings.total}
                                            </div>
                                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>Findings</div>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: tenant.occurrences.total > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}>
                                                {tenant.occurrences.total}
                                            </div>
                                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>Occurrences</div>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: tenant.manuals.outdated > 0 ? "#F59E0B" : "rgba(255,255,255,0.2)" }}>
                                                {tenant.manuals.outdated}/{tenant.manuals.total}
                                            </div>
                                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>Manuals</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
