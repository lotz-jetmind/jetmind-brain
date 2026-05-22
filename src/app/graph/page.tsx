import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function GraphPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const nodes = [
        { id: "part-oro", label: "Part-ORO", type: "regulation", color: "#00D4FF", x: 50, y: 30 },
        { id: "part-cat", label: "Part-CAT", type: "regulation", color: "#00D4FF", x: 80, y: 50 },
        { id: "part-m",   label: "Part-M",   type: "regulation", color: "#00D4FF", x: 20, y: 55 },
        { id: "sms",      label: "SMS Manual",    type: "manual",     color: "#10B981", x: 50, y: 70 },
        { id: "ops",      label: "OPS Manual",    type: "manual",     color: "#10B981", x: 75, y: 75 },
        { id: "camo",     label: "CAMO Findings", type: "evidence",   color: "#F59E0B", x: 25, y: 80 },
        { id: "safety",   label: "Safety Reports",type: "evidence",   color: "#F59E0B", x: 60, y: 85 },
    ];

    return (
        <div className="min-h-screen" style={{ background: "var(--brain-bg)" }}>
            <header style={{ borderBottom: "1px solid var(--brain-border)" }}>
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
                    <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                    <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                    <span style={{ fontSize: 13, color: "#00D4FF" }}>Regulation Graph</span>
                    <span style={{
                        marginLeft: "auto", fontSize: 9, fontWeight: 800,
                        padding: "2px 8px", borderRadius: 4, letterSpacing: "0.1em",
                        color: "#F59E0B", background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.2)",
                    }}>BUILDING</span>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-12">
                <div className="animate-slide-up" style={{ marginBottom: 40 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>
                        Regulation Knowledge Graph
                    </h1>
                    <p style={{ fontSize: 15, color: "rgba(255,255,255,0.35)", maxWidth: 520, lineHeight: 1.7 }}>
                        EASA requirements as machine-readable nodes — linked to manuals, findings, 
                        and evidence. Live compliance score per requirement.
                    </p>
                </div>

                {/* Placeholder Graph Visualization */}
                <div style={{
                    height: 480, borderRadius: 20,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(0,212,255,0.1)",
                    position: "relative", overflow: "hidden",
                }}>
                    {/* Background grid */}
                    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.05 }}>
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {/* Nodes */}
                    {nodes.map(node => (
                        <div key={node.id} style={{
                            position: "absolute",
                            left: `${node.x}%`, top: `${node.y}%`,
                            transform: "translate(-50%, -50%)",
                            padding: "8px 14px",
                            background: `${node.color}15`,
                            border: `1px solid ${node.color}40`,
                            borderRadius: 8, fontSize: 12, fontWeight: 600,
                            color: node.color, whiteSpace: "nowrap",
                            cursor: "pointer", transition: "all 0.2s",
                            backdropFilter: "blur(10px)",
                        }}>
                            {node.label}
                        </div>
                    ))}

                    {/* Coming soon overlay */}
                    <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        background: "rgba(4,6,8,0.7)", backdropFilter: "blur(2px)",
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>⬡</div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Phase 2 — Building</div>
                        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", textAlign: "center", maxWidth: 320 }}>
                            Importing EASA regulations as structured nodes. 
                            Linking to findings, manuals and evidence from Jetmind.
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
                    {[
                        { color: "#00D4FF", label: "Regulation (EASA Part)" },
                        { color: "#10B981", label: "Manual / Document" },
                        { color: "#F59E0B", label: "Evidence / Finding" },
                    ].map(l => (
                        <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                            {l.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
