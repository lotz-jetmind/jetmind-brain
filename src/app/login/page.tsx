"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await signIn("credentials", {
            email, password, redirect: false,
        });
        if (res?.error) {
            setError("Zugang verweigert — nur SuperAdmins.");
            setLoading(false);
        } else {
            window.location.href = "/";
        }
    }

    return (
        <div style={{
            minHeight: "100vh", display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "var(--brain-bg)",
            backgroundImage: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,212,255,0.08), transparent)",
        }}>
            <div style={{ width: "100%", maxWidth: 380, padding: "0 24px" }} className="animate-slide-up">
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))",
                        border: "1px solid rgba(0,212,255,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24, margin: "0 auto 16px",
                    }}>⬡</div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
                        jetmind <span style={{ color: "#00D4FF" }}>brain</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                        SuperAdmin access only
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 12 }}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            style={{
                                width: "100%", padding: "13px 16px",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 10, color: "white",
                                fontSize: 15, outline: "none", fontFamily: "inherit",
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={{
                                width: "100%", padding: "13px 16px",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 10, color: "white",
                                fontSize: 15, outline: "none", fontFamily: "inherit",
                            }}
                        />
                    </div>
                    {error && (
                        <div style={{
                            marginBottom: 16, padding: "10px 14px",
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            borderRadius: 8, fontSize: 13, color: "#EF4444",
                        }}>{error}</div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%", padding: "13px",
                            background: loading ? "rgba(0,212,255,0.3)" : "rgba(0,212,255,0.15)",
                            border: "1px solid rgba(0,212,255,0.3)",
                            borderRadius: 10, color: "#00D4FF",
                            fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                            fontFamily: "inherit", transition: "all 0.15s",
                        }}
                    >
                        {loading ? "Checking..." : "Access Brain →"}
                    </button>
                </form>

                <div style={{
                    marginTop: 32, textAlign: "center",
                    fontSize: 12, color: "rgba(255,255,255,0.2)",
                }}>
                    <a href="https://hyp.jetmind.io" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>
                        ← Back to Jetmind
                    </a>
                </div>
            </div>
        </div>
    );
}
