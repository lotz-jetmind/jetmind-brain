"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Summary = {
    totalManuals: number; outdatedManuals: number; pendingAmendments: number;
    approvedAmendments: number; pendingProposals: number; totalAmendments: number; totalProposals: number;
};
type ManualItem = {
    id: string; code: string; title: string; revision: string;
    status: string; compliance: string; chapters: number; amendments: number; effectiveDate: string | null;
};
type Amendment = {
    id: string; proposed_revision: string; status: string; change_classification: string;
    requires_prior_approval: boolean; ai_summary_of_changes: string | null; created_at: string;
};
type Proposal = { id: string; regulationRef: string; authority: string; status: string; proposedAt: string };
type ManualsData = {
    summary: Summary; manuals: ManualItem[]; recentAmendments: Amendment[];
    proposals: Proposal[]; needsRevision: ManualItem[];
    charts: { manualByStatus: [string, number][]; manualByCompliance: [string, number][]; amendmentByStatus: [string, number][] };
};

const COMPLIANCE_COLOR: Record<string, string> = {
    UP_TO_DATE: "#10B981", PENDING_REVIEW: "#F59E0B", OUTDATED: "#EF4444",
    DRAFT: "#7C3AED", IN_REVISION: "#00D4FF",
};

const STATUS_COLOR: Record<string, string> = {
    Active: "#10B981", Drafting: "#F59E0B", "Pending Approval": "#7C3AED", DRAFT: "#64748B",
    Draft_Editing: "#F59E0B", Quarantine_Awaiting_LBA: "#EF4444",
    Approved_Live: "#10B981", Rejected: "#EF4444",
};

function MarkdownBlock({ text }: { text: string }) {
    const lines = text.split("\n");
    return (
        <div style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(255,255,255,0.8)" }}>
            {lines.map((line, i) => {
                if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: "white", marginTop: 16, marginBottom: 4 }}>{line.slice(4)}</h3>;
                if (line.startsWith("## "))  return <h2 key={i} style={{ fontSize: 16, fontWeight: 800, color: "white", marginTop: 20, marginBottom: 6 }}>{line.slice(3)}</h2>;
                if (line.startsWith("**ALT:") || line.startsWith("ALT:")) return <div key={i} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "6px 10px", marginBottom: 4, fontSize: 12, fontFamily: "monospace", color: "#FCA5A5" }}>{line}</div>;
                if (line.startsWith("**NEU:") || line.startsWith("NEU:")) return <div key={i} style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: "6px 10px", marginBottom: 8, fontSize: 12, fontFamily: "monospace", color: "#6EE7B7" }}>{line}</div>;
                if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3 }}><span style={{ color: "#EC4899", flexShrink: 0 }}>•</span><span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} /></div>;
                if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
                return <p key={i} style={{ marginBottom: 3 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong style='color:white'>$1</strong>") }} />;
            })}
        </div>
    );
}

const SAMPLE_REGULATIONS = [
    { ref: "EU 2024/1234 — ORO.FTL.210 Amendment 12", text: "Die maximale Flugdienstzeit für Einpilotenbetrieb unter IFR wurde von 10 auf 9 Stunden reduziert. Zusätzlich müssen alle FTL-relevanten Abschnitte des Operations Manual um einen Verweis auf die neue Berechnungsmethode für kumulierte Ermüdung ergänzt werden. Inkrafttreten: 01.03.2025." },
    { ref: "EU 2024/567 — CAMO.A.305 Revision", text: "Die Anforderungen an die Qualifikation von CAMO-Personal wurden überarbeitet. Alle Continued Airworthiness Management Expositions (CAME) müssen das neue Kompetenz-Framework für Certifying Staff und Support Staff integrieren. Änderung der Trainingsanforderungen von 24 auf 36 Monate Rezertifizierungsintervall." },
    { ref: "EU 2025/89 — CAT.OP.MPA.140", text: "Neue Anforderungen für Performance-basierte Navigation: Alle Betriebshandbücher müssen überarbeitete Minima für PBN-Anflüge gemäß der neuen ICAO DOC 9613 Ed. 5 enthalten. Betrifft OM-A Kapitel Flugvorbereitung sowie OM-B Kapitel Anflugverfahren. Frist: 6 Monate nach Inkrafttreten." },
];

export default function ManualsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<ManualsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedManual, setSelectedManual] = useState<ManualItem | null>(null);
    const [regulationText, setRegulationText] = useState("");
    const [diffLoading, setDiffLoading] = useState(false);
    const [diffResult, setDiffResult] = useState<{ manualCode: string; diff: string } | null>(null);
    const [tab, setTab] = useState<"overview" | "diff">("overview");

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/manuals").then(r => r.json())
                .then(d => { setData(d); setLoading(false); })
                .catch(() => setLoading(false));
        }
    }, [status]);

    const runDiff = async () => {
        if (!selectedManual || !regulationText.trim() || diffLoading) return;
        setDiffLoading(true);
        setDiffResult(null);
        try {
            const r = await fetch("/api/manuals/diff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ manualId: selectedManual.id, regulationChange: regulationText }),
            });
            const d = await r.json();
            setDiffResult(d);
            setTab("diff");
        } catch (e) {
            console.error(e);
        } finally {
            setDiffLoading(false);
        }
    };

    if (status === "loading" || loading) return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading Auto-Manual…</div>
        </div>
    );

    const s = data?.summary;

    return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)", position: "sticky", top: 0, background: "rgba(4,6,8,0.95)", backdropFilter: "blur(20px)", zIndex: 10 }}>
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                        <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                        <span style={{ fontSize: 13, color: "#EC4899" }}>Auto-Manual</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {(["overview", "diff"] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)} style={{
                                fontSize: 12, padding: "5px 14px", borderRadius: 6, fontFamily: "inherit", cursor: "pointer",
                                background: tab === t ? "#EC4899" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${tab === t ? "#EC4899" : "rgba(255,255,255,0.08)"}`,
                                color: tab === t ? "white" : "rgba(255,255,255,0.4)", fontWeight: tab === t ? 700 : 400,
                            }}>
                                {t === "overview" ? "📋 Overview" : "⚡ AI Diff"}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>Auto-Manual</h1>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                        Manuals that update themselves — EASA regulation change → AI diff proposal → approval workflow.
                    </p>
                </div>

                {/* KPIs */}
                {s && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
                        {[
                            { label: "Total Manuals", value: s.totalManuals, color: "#EC4899", icon: "▣" },
                            { label: "Need Revision", value: s.outdatedManuals, color: "#EF4444", icon: "⚠", alert: s.outdatedManuals > 0 },
                            { label: "Pending Amendments", value: s.pendingAmendments, color: "#F59E0B", icon: "◷" },
                            { label: "EASA Proposals", value: s.pendingProposals, color: "#7C3AED", icon: "◈", alert: s.pendingProposals > 0 },
                        ].map(k => (
                            <div key={k.label} style={{
                                background: k.alert ? `${k.color}08` : "rgba(255,255,255,0.02)",
                                border: `1px solid ${k.alert ? `${k.color}30` : "rgba(255,255,255,0.06)"}`,
                                borderRadius: 14, padding: "18px 20px",
                            }}>
                                <div style={{ fontSize: 20, color: k.color, marginBottom: 8 }}>{k.icon}</div>
                                <div style={{ fontSize: 30, fontWeight: 800, color: k.color, letterSpacing: "-0.03em" }}>{k.value}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 3 }}>{k.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab: Overview */}
                {tab === "overview" && data && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
                        {/* Manual list */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                All Manuals ({data.manuals.length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {data.manuals.map(m => {
                                    const cc = COMPLIANCE_COLOR[m.compliance] || "#64748B";
                                    const sc = STATUS_COLOR[m.status] || "#64748B";
                                    const selected = selectedManual?.id === m.id;
                                    return (
                                        <div key={m.id}
                                            onClick={() => { setSelectedManual(m); setTab("diff"); }}
                                            style={{
                                                background: selected ? "rgba(236,72,153,0.06)" : "rgba(255,255,255,0.02)",
                                                border: `1px solid ${selected ? "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.06)"}`,
                                                borderRadius: 12, padding: "14px 18px", cursor: "pointer",
                                                display: "flex", alignItems: "center", gap: 14,
                                                transition: "all 0.15s",
                                            }}
                                            onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = "rgba(236,72,153,0.15)"; }}
                                            onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                                        >
                                            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#EC4899", flexShrink: 0 }}>
                                                {m.code.slice(0, 4)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Rev {m.revision} · {m.chapters} chapters · {m.amendments} amendments</div>
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                                                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${sc}15`, border: `1px solid ${sc}30`, color: sc, fontWeight: 700 }}>{m.status}</span>
                                                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${cc}15`, border: `1px solid ${cc}30`, color: cc, fontWeight: 700 }}>{m.compliance}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {data.manuals.length === 0 && (
                                    <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No manuals found</div>
                                )}
                            </div>
                        </div>

                        {/* Recent amendments */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Recent Amendments</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                                {data.recentAmendments.slice(0, 6).map(a => {
                                    const sc = STATUS_COLOR[a.status] || "#64748B";
                                    return (
                                        <div key={a.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>Rev {a.proposed_revision}</span>
                                                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${sc}15`, border: `1px solid ${sc}30`, color: sc, fontWeight: 700 }}>{a.status.replace(/_/g, " ")}</span>
                                            </div>
                                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{a.change_classification.replace(/_/g, " ")} {a.requires_prior_approval ? "· Prior Approval" : ""}</div>
                                            {a.ai_summary_of_changes && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, lineHeight: 1.4 }}>{a.ai_summary_of_changes.slice(0, 100)}…</div>}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>EASA Proposals</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {data.proposals.slice(0, 5).map(p => (
                                    <div key={p.id} style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 10, padding: "12px 14px" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "#A78BFA", marginBottom: 2 }}>{p.regulationRef}</div>
                                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{p.authority} · {new Date(p.proposedAt).toLocaleDateString("de-DE")}</div>
                                    </div>
                                ))}
                                {data.proposals.length === 0 && (
                                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", padding: "12px 0" }}>No EASA proposals in DB</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: AI Diff */}
                {tab === "diff" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        {/* Left: Input */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>1. Select Manual</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
                                {(data?.manuals || []).slice(0, 8).map(m => (
                                    <div key={m.id} onClick={() => setSelectedManual(m)} style={{
                                        background: selectedManual?.id === m.id ? "rgba(236,72,153,0.08)" : "rgba(255,255,255,0.02)",
                                        border: `1px solid ${selectedManual?.id === m.id ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.06)"}`,
                                        borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                                        display: "flex", alignItems: "center", gap: 10,
                                    }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#EC4899", minWidth: 60 }}>{m.code}</span>
                                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
                                    </div>
                                ))}
                                {(!data?.manuals || data.manuals.length === 0) && (
                                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", padding: "10px 0" }}>No manuals available — go to Overview tab first</div>
                                )}
                            </div>

                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>2. EASA Regulation Change</div>
                            <textarea
                                value={regulationText}
                                onChange={e => setRegulationText(e.target.value)}
                                placeholder="Füge den EASA-Regulierungstext hier ein… z.B. 'EU 2024/1234 ändert ORO.FTL.210 Absatz (b)…'"
                                rows={6}
                                style={{
                                    width: "100%", resize: "vertical", boxSizing: "border-box",
                                    background: "rgba(236,72,153,0.03)", border: "1px solid rgba(236,72,153,0.2)",
                                    borderRadius: 12, padding: "14px", color: "white", fontSize: 13,
                                    lineHeight: 1.6, outline: "none", fontFamily: "inherit", marginBottom: 10,
                                }}
                            />

                            {/* Sample regulations */}
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>Quick examples:</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                                {SAMPLE_REGULATIONS.map((r, i) => (
                                    <button key={i} onClick={() => setRegulationText(r.text)} style={{
                                        textAlign: "left", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                                        borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit",
                                        fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4,
                                    }}>
                                        {r.ref}
                                    </button>
                                ))}
                            </div>

                            <button onClick={runDiff} disabled={!selectedManual || !regulationText.trim() || diffLoading} style={{
                                width: "100%", background: !selectedManual || !regulationText.trim() ? "rgba(236,72,153,0.3)" : "#EC4899",
                                color: "white", border: "none", borderRadius: 12, padding: "14px",
                                fontSize: 14, fontWeight: 700, cursor: !selectedManual || !regulationText.trim() ? "not-allowed" : "pointer",
                                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            }}>
                                {diffLoading ? (
                                    <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> Generating Diff…</>
                                ) : `⚡ Generate AI Diff${selectedManual ? ` for ${selectedManual.code}` : ""}`}
                            </button>
                        </div>

                        {/* Right: Result */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>3. AI Diff Result</div>
                            {diffResult ? (
                                <div style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 16, padding: 20 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(236,72,153,0.1)" }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: "#EC4899" }}>{diffResult.manualCode}</div>
                                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>AI-generated diff proposal</div>
                                        </div>
                                        <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)", color: "#EC4899", fontWeight: 700 }}>DRAFT</span>
                                    </div>
                                    <div style={{ maxHeight: 600, overflowY: "auto" }}>
                                        <MarkdownBlock text={diffResult.diff} />
                                    </div>
                                </div>
                            ) : diffLoading ? (
                                <div style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.1)", borderRadius: 16, padding: 24 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, color: "#EC4899", fontSize: 13 }}>
                                        <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(236,72,153,0.3)", borderTop: "2px solid #EC4899", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                                        Gemini analysiert die Regulierungsänderung…
                                    </div>
                                    {[70, 90, 55, 80, 40].map((w, i) => (
                                        <div key={i} style={{ height: 10, width: `${w}%`, background: "rgba(255,255,255,0.04)", borderRadius: 5, marginBottom: 8 }} />
                                    ))}
                                </div>
                            ) : (
                                <div style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, padding: 40, textAlign: "center" }}>
                                    <div style={{ fontSize: 28, marginBottom: 12 }}>▣</div>
                                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>Select a manual and paste a regulation change</div>
                                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>Gemini will generate a precise diff with affected chapters, change classification, and next steps</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
