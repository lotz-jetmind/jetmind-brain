"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type BriefingItem = {
    priority: string;
    message: string;
    index: number;
};

type Briefing = {
    id: string;
    briefing_date: string;
    items: BriefingItem[];
    generated: boolean;
    created_at: string;
    meta?: {
        openL1: number;
        overdueFindings: number;
        pendingTriage: number;
        activeHazards: number;
        highRisk: number;
        pendingAmendments: number;
    };
};

type Memory = {
    id: string;
    topic: string;
    summary: string;
    confidence: number;
    source: string;
    created_at: string;
    expires_at: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const INDIGO = "#6366F1";

const TOPIC_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    safety:       { label: "Safety",   color: "#10B981", bg: "rgba(16,185,129,0.12)" },
    safety_trend: { label: "Safety",   color: "#10B981", bg: "rgba(16,185,129,0.12)" },
    audit:        { label: "Audit",    color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
    audit_status: { label: "Audit",    color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
    manuals:      { label: "Manuals",  color: "#EC4899", bg: "rgba(236,72,153,0.12)" },
    fleet:        { label: "Fleet",    color: "#00D4FF", bg: "rgba(0,212,255,0.12)"  },
    fleet_health: { label: "Fleet",    color: "#00D4FF", bg: "rgba(0,212,255,0.12)"  },
    capa_load:    { label: "CAPA",     color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    HIGH:      { label: "HIGH",     color: "#EF4444", bg: "rgba(239,68,68,0.15)"   },
    HOCH:      { label: "HOCH",     color: "#EF4444", bg: "rgba(239,68,68,0.15)"   },
    KRITISCH:  { label: "KRITISCH", color: "#DC2626", bg: "rgba(220,38,38,0.15)"   },
    CRITICAL:  { label: "CRITICAL", color: "#DC2626", bg: "rgba(220,38,38,0.15)"   },
    MEDIUM:    { label: "MEDIUM",   color: "#F59E0B", bg: "rgba(245,158,11,0.15)"  },
    MITTEL:    { label: "MITTEL",   color: "#F59E0B", bg: "rgba(245,158,11,0.15)"  },
    LOW:       { label: "LOW",      color: "#10B981", bg: "rgba(16,185,129,0.15)"  },
    NIEDRIG:   { label: "NIEDRIG",  color: "#10B981", bg: "rgba(16,185,129,0.15)"  },
    INFO:      { label: "INFO",     color: "#6366F1", bg: "rgba(99,102,241,0.15)"  },
};

function getPriorityConfig(p: string) {
    return PRIORITY_CONFIG[p.toUpperCase()] ?? { label: p, color: "#6366F1", bg: "rgba(99,102,241,0.15)" };
}

function getTopicConfig(t: string) {
    return TOPIC_CONFIG[t.toLowerCase()] ?? { label: t, color: "#6366F1", bg: "rgba(99,102,241,0.12)" };
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SkeletonLine({ w = "100%" }: { w?: string }) {
    return (
        <div style={{ height: 14, width: w, background: "rgba(255,255,255,0.06)", borderRadius: 6, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
    );
}

function ConfidenceBar({ value }: { value: number }) {
    const pct = Math.round(value * 100);
    const color = pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";
    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10 }}>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>Confidence</span>
                <span style={{ color, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MemoryPage() {
    const { status } = useSession();
    const router = useRouter();

    const [briefing, setBriefing] = useState<Briefing | null>(null);
    const [briefingLoading, setBriefingLoading] = useState(true);
    const [briefingError, setBriefingError] = useState<string | null>(null);

    const [memories, setMemories] = useState<Memory[]>([]);
    const [memoriesLoading, setMemoriesLoading] = useState(true);

    // Save form
    const [showForm, setShowForm] = useState(false);
    const [formTopic, setFormTopic] = useState("safety");
    const [formSummary, setFormSummary] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    const loadBriefing = useCallback(async () => {
        setBriefingLoading(true);
        setBriefingError(null);
        try {
            const r = await fetch("/api/briefing");
            const d = await r.json();
            if (d.error) setBriefingError(d.error);
            else setBriefing(d);
        } catch (e) {
            setBriefingError(String(e));
        } finally {
            setBriefingLoading(false);
        }
    }, []);

    const loadMemories = useCallback(async () => {
        setMemoriesLoading(true);
        try {
            const r = await fetch("/api/memory");
            const d = await r.json();
            if (Array.isArray(d)) setMemories(d);
        } finally {
            setMemoriesLoading(false);
        }
    }, []);

    useEffect(() => {
        if (status === "authenticated") {
            loadBriefing();
            loadMemories();
        }
    }, [status, loadBriefing, loadMemories]);

    const handleSaveMemory = async () => {
        if (!formSummary.trim()) return;
        setSaving(true);
        try {
            const r = await fetch("/api/memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: formTopic, summary: formSummary }),
            });
            if (r.ok) {
                setFormSummary("");
                setShowForm(false);
                await loadMemories();
            }
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading") {
        return (
            <div style={{ minHeight: "100vh", background: "var(--brain-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading…</div>
            </div>
        );
    }

    const today = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const briefingDate = briefing?.briefing_date ? formatDate(briefing.briefing_date) : today;
    const items: BriefingItem[] = Array.isArray(briefing?.items) ? (briefing!.items as BriefingItem[]) : [];

    return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .memory-card:hover {
                    border-color: ${INDIGO}40 !important;
                    background: ${INDIGO}06 !important;
                    transform: translateY(-1px);
                }
                .save-btn:hover { opacity: 0.85; }
                .refresh-btn:hover { background: rgba(99,102,241,0.15) !important; }
            `}</style>

            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)", position: "sticky", top: 0, background: "rgba(4,6,8,0.95)", backdropFilter: "blur(20px)", zIndex: 10 }}>
                <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                        <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                        <span style={{ fontSize: 13, color: INDIGO }}>Brain Memory</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: INDIGO, display: "inline-block", boxShadow: `0 0 8px ${INDIGO}` }} />
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>AI Memory System</span>
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px 80px" }}>
                {/* Title */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>
                        Brain Memory <span style={{ color: INDIGO }}>&amp;</span> Morning Briefing
                    </h1>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                        Daily AI digest · Saved institutional knowledge · Gemini-powered insights
                    </p>
                </div>

                {/* Two-column layout */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

                    {/* ── LEFT: Morning Briefing ─────────────────────────────── */}
                    <div style={{ background: "rgba(99,102,241,0.04)", border: `1px solid ${INDIGO}25`, borderRadius: 20, padding: 24, animation: "fadeIn 0.4s ease" }}>
                        {/* Briefing header */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${INDIGO}20`, border: `1px solid ${INDIGO}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: INDIGO }}>◉</div>
                                    <div style={{ fontSize: 15, fontWeight: 700 }}>Morning Briefing</div>
                                </div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", paddingLeft: 40 }}>{briefingDate}</div>
                            </div>
                            <button
                                onClick={loadBriefing}
                                disabled={briefingLoading}
                                className="refresh-btn"
                                style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, background: "rgba(99,102,241,0.08)", border: `1px solid ${INDIGO}30`, color: INDIGO, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, opacity: briefingLoading ? 0.5 : 1, transition: "all 0.2s ease" }}
                            >
                                {briefingLoading ? "Generating…" : "↻ Refresh"}
                            </button>
                        </div>

                        {/* Loading skeleton */}
                        {briefingLoading && (
                            <div>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} style={{ marginBottom: 16, padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
                                        <SkeletonLine w="30%" />
                                        <SkeletonLine w="90%" />
                                        <SkeletonLine w="70%" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error */}
                        {briefingError && !briefingLoading && (
                            <div style={{ padding: "14px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, fontSize: 13, color: "#FCA5A5" }}>
                                ⚠ {briefingError}
                            </div>
                        )}

                        {/* Briefing items */}
                        {!briefingLoading && !briefingError && items.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {items.map((item, idx) => {
                                    const pc = getPriorityConfig(item.priority);
                                    return (
                                        <div key={idx} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, animation: `fadeIn 0.3s ease ${idx * 0.08}s both` }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                                <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, color: pc.color, background: pc.bg, letterSpacing: "0.06em" }}>
                                                    {pc.label}
                                                </span>
                                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>#{item.index}</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.55 }}>{item.message}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Empty state */}
                        {!briefingLoading && !briefingError && items.length === 0 && (
                            <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                                No briefing items yet. Click Refresh to generate.
                            </div>
                        )}

                        {/* Footer */}
                        {!briefingLoading && briefing && (
                            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>Generated by</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: INDIGO, letterSpacing: "0.04em" }}>Gemini AI</span>
                                {briefing.meta && (
                                    <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                                        {briefing.meta.openL1} L1 · {briefing.meta.overdueFindings} overdue · {briefing.meta.pendingTriage} triage
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT: Brain Memory ────────────────────────────────── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Memory header + save button */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Brain Memory</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Saved institutional knowledge</div>
                            </div>
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="save-btn"
                                style={{ fontSize: 12, padding: "7px 14px", borderRadius: 10, background: INDIGO, color: "white", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "opacity 0.2s" }}
                            >
                                {showForm ? "✕ Cancel" : "+ Save Query"}
                            </button>
                        </div>

                        {/* Save form */}
                        {showForm && (
                            <div style={{ background: `${INDIGO}08`, border: `1px solid ${INDIGO}30`, borderRadius: 16, padding: 20, animation: "fadeIn 0.2s ease" }}>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Topic</label>
                                    <select
                                        value={formTopic}
                                        onChange={e => setFormTopic(e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
                                    >
                                        <option value="safety">Safety</option>
                                        <option value="audit">Audit</option>
                                        <option value="fleet">Fleet</option>
                                        <option value="manuals">Manuals</option>
                                        <option value="capa_load">CAPA</option>
                                        <option value="safety_trend">Safety Trend</option>
                                        <option value="audit_status">Audit Status</option>
                                        <option value="fleet_health">Fleet Health</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Summary / Insight</label>
                                    <textarea
                                        value={formSummary}
                                        onChange={e => setFormSummary(e.target.value)}
                                        placeholder="Describe the insight or query result to remember…"
                                        rows={3}
                                        style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                                    />
                                </div>
                                <button
                                    onClick={handleSaveMemory}
                                    disabled={saving || !formSummary.trim()}
                                    style={{ padding: "8px 18px", background: saving || !formSummary.trim() ? "rgba(99,102,241,0.3)" : INDIGO, color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: saving || !formSummary.trim() ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                                >
                                    {saving ? "Saving…" : "Save to Memory"}
                                </button>
                            </div>
                        )}

                        {/* Memory list */}
                        {memoriesLoading && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 16 }}>
                                        <SkeletonLine w="25%" />
                                        <SkeletonLine w="80%" />
                                        <SkeletonLine w="60%" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {!memoriesLoading && memories.length === 0 && (
                            <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.2)", fontSize: 13, background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)" }}>
                                No memories saved yet.<br />
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Click &quot;Save Query&quot; to add the first one.</span>
                            </div>
                        )}

                        {!memoriesLoading && memories.map((mem, idx) => {
                            const tc = getTopicConfig(mem.topic);
                            const isExpired = mem.expires_at && new Date(mem.expires_at) < new Date();
                            return (
                                <div
                                    key={mem.id}
                                    className="memory-card"
                                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 16, transition: "all 0.2s ease", animation: `fadeIn 0.3s ease ${idx * 0.06}s both`, cursor: "default" }}
                                >
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, color: tc.color, background: tc.bg, letterSpacing: "0.06em" }}>
                                                {tc.label}
                                            </span>
                                            {isExpired && (
                                                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, color: "#64748B", background: "rgba(100,116,139,0.12)" }}>
                                                    EXPIRED
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{formatDate(mem.created_at)}</span>
                                    </div>

                                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.55, marginBottom: 12 }}>
                                        {mem.summary}
                                    </div>

                                    <ConfidenceBar value={mem.confidence} />

                                    <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                                        {mem.source}
                                        {mem.expires_at && (
                                            <span> · expires {formatDate(mem.expires_at)}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
