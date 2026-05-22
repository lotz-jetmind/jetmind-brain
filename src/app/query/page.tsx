"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

type Stats = { users: number; orgs: number; safety: number; flights: number };
type CtxSource = { label: string; count: number };
type QueryResult = { answer: string; context: CtxSource[]; totalRecords: number; latency: number };

const suggestions = [
    "Zeig alle offenen Findings die noch keine CAPA haben",
    "Welche Tenants haben die meisten User?",
    "Zeig alle offenen Defekte mit hoher Priorität",
    "Welche Flights haben einen COMPLETED Status?",
    "Wie viele Organisations sind in der Datenbank?",
    "Zeig alle Findings mit Status OPEN",
    "Welche Aircraft sind aktuell aktiv?",
    "Analysiere die Safety Reports der letzten 30 Tage",
];

function MarkdownAnswer({ text }: { text: string }) {
    // Simple markdown renderer
    const lines = text.split("\n");
    return (
        <div style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.85)" }}>
            {lines.map((line, i) => {
                if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 15, fontWeight: 700, marginTop: 20, marginBottom: 6, color: "white" }}>{line.slice(4)}</h3>;
                if (line.startsWith("## "))  return <h2 key={i} style={{ fontSize: 17, fontWeight: 800, marginTop: 24, marginBottom: 8, color: "white" }}>{line.slice(3)}</h2>;
                if (line.startsWith("# "))   return <h1 key={i} style={{ fontSize: 20, fontWeight: 800, marginTop: 24, marginBottom: 8, color: "white" }}>{line.slice(2)}</h1>;
                if (line.startsWith("- ") || line.startsWith("* ")) {
                    return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: "#7C3AED", flexShrink: 0 }}>•</span><span dangerouslySetInnerHTML={{ __html: boldify(line.slice(2)) }} /></div>;
                }
                if (/^\d+\.\s/.test(line)) {
                    const [num, ...rest] = line.split(". ");
                    return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: "#7C3AED", flexShrink: 0, minWidth: 20 }}>{num}.</span><span dangerouslySetInnerHTML={{ __html: boldify(rest.join(". ")) }} /></div>;
                }
                if (line.startsWith("---") || line.startsWith("___")) return <hr key={i} style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "16px 0" }} />;
                if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
                return <p key={i} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: boldify(line) }} />;
            })}
        </div>
    );
}

function boldify(text: string) {
    return text
        .replace(/\*\*(.+?)\*\*/g, "<strong style='color:white;font-weight:700'>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code style='background:rgba(124,58,237,0.15);padding:1px 5px;border-radius:4px;font-size:12px;color:#A78BFA'>$1</code>");
}

export default function QueryPage() {
    const { status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<Stats>({ users: 0, orgs: 0, safety: 0, flights: 0 });
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
        }
    }, [status]);

    const handleQuery = async () => {
        if (!query.trim() || loading) return;
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const res = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: query }),
            });
            const data = await res.json();
            if (data.error) setError(data.error);
            else setResult(data);
        } catch {
            setError("Verbindungsfehler — bitte erneut versuchen.");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleQuery();
    };

    if (status === "loading") return <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }} />;

    const total = stats.users + stats.orgs + stats.safety + stats.flights;

    return (
        <div style={{ minHeight: "100vh", background: "var(--brain-bg)" }}>
            {/* Header */}
            <header style={{ borderBottom: "1px solid var(--brain-border)", position: "sticky", top: 0, background: "rgba(4,6,8,0.95)", backdropFilter: "blur(20px)", zIndex: 10 }}>
                <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", fontSize: 13 }}>← Brain</a>
                        <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
                        <span style={{ fontSize: 13, color: "#7C3AED" }}>AI Query</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                        {[
                            { label: "Users", v: stats.users },
                            { label: "Orgs", v: stats.orgs },
                            { label: "Safety", v: stats.safety },
                            { label: "Flights", v: stats.flights },
                        ].map(s => (
                            <span key={s.label}><span style={{ fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{s.v}</span> {s.label}</span>
                        ))}
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 120px" }}>
                {/* Hero */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>
                        Ask anything about <span style={{ color: "#7C3AED" }}>Jetmind</span>.
                    </h1>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                        Natural language queries across {total.toLocaleString()} records — findings, defects, flights, tenants, safety reports.
                    </p>
                </div>

                {/* Query input */}
                <div style={{ position: "relative", marginBottom: 16 }}>
                    <textarea
                        ref={textareaRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Zeig alle offenen Findings ohne CAPA… (⌘ + Enter zum Absenden)"
                        rows={3}
                        style={{
                            width: "100%", resize: "none", boxSizing: "border-box",
                            background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.25)",
                            borderRadius: 14, padding: "18px 140px 18px 18px",
                            color: "white", fontSize: 15, lineHeight: 1.6, outline: "none",
                            fontFamily: "inherit", transition: "border-color 0.2s",
                        }}
                        onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
                        onBlur={e => (e.target.style.borderColor = "rgba(124,58,237,0.25)")}
                    />
                    <button
                        onClick={handleQuery}
                        disabled={!query.trim() || loading}
                        style={{
                            position: "absolute", right: 12, bottom: 12,
                            background: loading ? "rgba(124,58,237,0.4)" : "#7C3AED",
                            color: "white", border: "none", borderRadius: 10,
                            padding: "10px 20px", fontSize: 13, fontWeight: 700,
                            cursor: loading ? "not-allowed" : "pointer",
                            fontFamily: "inherit", transition: "all 0.2s",
                            display: "flex", alignItems: "center", gap: 6,
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                                Querying…
                            </>
                        ) : "Query →"}
                    </button>
                </div>

                {/* Result */}
                {result && (
                    <div style={{ marginBottom: 32, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, overflow: "hidden" }}>
                        {/* Meta bar */}
                        <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(124,58,237,0.12)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: "#A78BFA", fontWeight: 700, letterSpacing: "0.05em" }}>⬡ GEMINI RESPONSE</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{result.latency}ms</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{result.totalRecords} records analysed</span>
                            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
                                {result.context.map(c => (
                                    <span key={c.label} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#A78BFA" }}>
                                        {c.label} ({c.count})
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Answer */}
                        <div style={{ padding: "24px 24px" }}>
                            <MarkdownAnswer text={result.answer} />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{ marginBottom: 24, padding: "14px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, fontSize: 13, color: "#FCA5A5" }}>
                        ⚠ {error}
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div style={{ marginBottom: 32, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 16, padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, color: "#A78BFA", fontSize: 13 }}>
                            <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(167,139,250,0.3)", borderTop: "2px solid #A78BFA", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                            Analysing database and generating response…
                        </div>
                        {[80, 100, 65, 90, 45].map((w, i) => (
                            <div key={i} style={{ height: 12, width: `${w}%`, background: "rgba(255,255,255,0.04)", borderRadius: 6, marginBottom: 8 }} />
                        ))}
                    </div>
                )}

                {/* Suggestions */}
                {!result && !loading && (
                    <>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Suggested queries</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setQuery(s); textareaRef.current?.focus(); }}
                                    style={{
                                        textAlign: "left", background: "rgba(255,255,255,0.02)",
                                        border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10,
                                        padding: "12px 16px", color: "rgba(255,255,255,0.45)", fontSize: 13,
                                        cursor: "pointer", fontFamily: "inherit", lineHeight: 1.4,
                                        transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
