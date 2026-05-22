"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Org = {
    id: string;
    name: string | null;
    slug: string;
    country: string | null;
    createdAt: string;
    _count: { users: number };
};

export default function TenantsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/tenants")
                .then(r => r.json())
                .then(data => { setOrgs(Array.isArray(data) ? data : []); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [status]);

    const filtered = orgs.filter(o =>
        !search || (o.name ?? "").toLowerCase().includes(search.toLowerCase()) || o.slug.includes(search.toLowerCase())
    );

    if (status === "loading") return <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }} />;

    return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)" }}>
                <div style={{ maxWidth: 1024, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                    <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                    <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                    <span style={{ fontSize: 13, color: "#64748B" }}>Tenants</span>
                </div>
            </header>

            <div style={{ maxWidth: 1024, margin: "0 auto", padding: "48px 24px" }}>
                {/* Title + search */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
                            All Organisations
                        </h1>
                        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
                            {loading ? "Loading…" : `${orgs.length} tenants in Jetmind`}
                        </p>
                    </div>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search…"
                        style={{
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8, padding: "8px 14px", color: "white", fontSize: 13,
                            outline: "none", fontFamily: "inherit", width: 200,
                        }}
                    />
                </div>

                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
                    {[
                        { label: "Total Tenants", value: orgs.length, color: "#64748B" },
                        { label: "Total Users", value: orgs.reduce((a, o) => a + o._count.users, 0), color: "#00D4FF" },
                        { label: "Avg Users/Tenant", value: orgs.length ? Math.round(orgs.reduce((a, o) => a + o._count.users, 0) / orgs.length) : 0, color: "#10B981" },
                    ].map(c => (
                        <div key={c.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
                            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: c.color }}>{c.value}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{c.label}</div>
                        </div>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Loading tenants…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No results for "{search}"</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {filtered.map(org => (
                            <div key={org.id} style={{
                                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                                borderRadius: 12, padding: "14px 20px",
                                display: "flex", alignItems: "center", gap: 16,
                                transition: "border-color 0.15s ease",
                                cursor: "default",
                            }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(100,116,139,0.3)")}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 15, fontWeight: 800, color: "#64748B", flexShrink: 0,
                                }}>
                                    {(org.name ?? "?")[0]?.toUpperCase()}
                                </div>
                                {/* Name */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{org.name ?? "—"}</div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                                        {org.slug}{org.country ? ` · ${org.country}` : ""}
                                    </div>
                                </div>
                                {/* Users badge */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{
                                        fontSize: 11, padding: "3px 10px", borderRadius: 6,
                                        background: org._count.users > 0 ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.03)",
                                        border: `1px solid ${org._count.users > 0 ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.05)"}`,
                                        color: org._count.users > 0 ? "#00D4FF" : "rgba(255,255,255,0.2)",
                                        fontWeight: 700,
                                    }}>
                                        {org._count.users} {org._count.users === 1 ? "user" : "users"}
                                    </div>
                                </div>
                                {/* Date */}
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", minWidth: 80, textAlign: "right" }}>
                                    {new Date(org.createdAt).toLocaleDateString("de-DE")}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
