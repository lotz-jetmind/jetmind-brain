import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function QueryPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    // Pre-load stats from shared Jetmind DB
    const [userCount, orgCount, safetyCount, flightCount] = await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.organisation.count().catch(() => 0),
        prisma.safetyReport.count().catch(() => 0),
        prisma.flight.count().catch(() => 0),
    ]);

    const suggestions = [
        "Zeig alle offenen CAPA aus 2025 die noch keine Evidenz haben",
        "Welche Tenants haben keine Safety-Reports in den letzten 90 Tagen?",
        "Zeig mir alle Flights mit FTL-Verletzungen im letzten Quartal",
        "Welche Regulations sind am häufigsten in Findings referenziert?",
        "Tenants mit dem schlechtesten Compliance-Score",
        "Alle Defekte die seit mehr als 30 Tagen offen sind",
    ];

    return (
        <div className="min-h-screen" style={{ background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)" }}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
                    <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                    <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                    <span style={{ fontSize: 13, color: "#7C3AED" }}>AI Query</span>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-6 py-12">
                {/* Stats bar */}
                <div style={{
                    display: "flex", gap: 16, marginBottom: 40,
                    padding: "16px 24px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 12,
                }}>
                    {[
                        { label: "Users", value: userCount },
                        { label: "Organisations", value: orgCount },
                        { label: "Safety Reports", value: safetyCount },
                        { label: "Flights", value: flightCount },
                    ].map(stat => (
                        <div key={stat.label} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "#7C3AED" }}>
                                {stat.value.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Query input */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{
                        fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em",
                        marginBottom: 8,
                    }}>
                        Ask anything.
                    </h1>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
                        Natural language queries across all Jetmind data — {(userCount + orgCount + safetyCount + flightCount).toLocaleString()} records indexed.
                    </p>

                    <div style={{ position: "relative" }}>
                        <textarea
                            placeholder="Zeig mir alle offenen Findings die mit Part-ORO zusammenhängen..."
                            rows={3}
                            style={{
                                width: "100%", resize: "none",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(124,58,237,0.3)",
                                borderRadius: 12, padding: "16px 120px 16px 16px",
                                color: "white", fontSize: 15, lineHeight: 1.6,
                                outline: "none", fontFamily: "inherit",
                            }}
                        />
                        <button style={{
                            position: "absolute", right: 12, bottom: 12,
                            background: "#7C3AED", color: "white",
                            border: "none", borderRadius: 8, padding: "10px 20px",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                        }}>
                            Query →
                        </button>
                    </div>
                </div>

                {/* Suggestions */}
                <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Suggested queries
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {suggestions.map((s, i) => (
                            <button key={i} style={{
                                textAlign: "left", background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.05)",
                                borderRadius: 8, padding: "12px 16px",
                                color: "rgba(255,255,255,0.5)", fontSize: 13,
                                cursor: "pointer", transition: "all 0.15s",
                                fontFamily: "inherit",
                            }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
