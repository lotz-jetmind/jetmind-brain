"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const suggestions = [
    "Zeig alle offenen CAPA aus 2025 die noch keine Evidenz haben",
    "Welche Tenants haben keine Safety-Reports in den letzten 90 Tagen?",
    "Zeig mir alle Flights mit FTL-Verletzungen im letzten Quartal",
    "Welche Regulations sind am häufigsten in Findings referenziert?",
    "Tenants mit dem schlechtesten Compliance-Score",
    "Alle Defekte die seit mehr als 30 Tagen offen sind",
];

export default function QueryPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState({ users: 0, orgs: 0, safety: 0, flights: 0 });
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
        }
    }, [status]);

    if (status === "loading") return <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }} />;

    const total = stats.users + stats.orgs + stats.safety + stats.flights;

    return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }}>
            <header style={{ borderBottom: "1px solid var(--brain-border)" }}>
                <div style={{ maxWidth: 896, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                    <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                    <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                    <span style={{ fontSize: 13, color: "#7C3AED" }}>AI Query</span>
                </div>
            </header>

            <div style={{ maxWidth: 896, margin: "0 auto", padding: "48px 24px" }}>
                {/* Stats */}
                <div style={{ display: "flex", gap: 16, marginBottom: 40, padding: "16px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12 }}>
                    {[
                        { label: "Users", value: stats.users },
                        { label: "Organisations", value: stats.orgs },
                        { label: "Safety Reports", value: stats.safety },
                        { label: "Flights", value: stats.flights },
                    ].map(s => (
                        <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "#7C3AED" }}>{s.value.toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Query */}
                <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>Ask anything.</h1>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
                    Natural language queries across all Jetmind data — {total.toLocaleString()} records indexed.
                </p>

                <div style={{ position: "relative", marginBottom: 32 }}>
                    <textarea
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Zeig mir alle offenen Findings die mit Part-ORO zusammenhängen..."
                        rows={3}
                        style={{ width: "100%", resize: "none", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12, padding: "16px 120px 16px 16px", color: "white", fontSize: 15, lineHeight: 1.6, outline: "none", fontFamily: "inherit" }}
                    />
                    <button style={{ position: "absolute", right: 12, bottom: 12, background: "#7C3AED", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        Query →
                    </button>
                </div>

                {/* Suggestions */}
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>Suggested queries</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {suggestions.map((s, i) => (
                        <button key={i} onClick={() => setQuery(s)} style={{ textAlign: "left", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "12px 16px", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
