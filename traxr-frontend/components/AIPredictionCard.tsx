"use client"

import { useEffect, useState } from "react"

export default function AIPredictionCard({ prediction }: { prediction: string | null }) {
  const [displayPrediction, setDisplayPrediction] = useState(prediction)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timer = window.setTimeout(() => {
      setDisplayPrediction(prediction)
      setLoading(false)
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [prediction])

  return (
    <div style={{
      background: "rgba(99,102,241,0.08)",
      border: "1px solid rgba(99,102,241,0.25)",
      borderRadius: "12px",
      padding: "16px 20px",
      marginBottom: "16px",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: "linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)"
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "16px" }}>✦</span>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "#a5b4fc" }}>AI Prediction</span>
        <span style={{
          marginLeft: "auto", fontSize: "10px",
          background: "rgba(99,102,241,0.2)",
          color: "#818cf8", padding: "2px 8px", borderRadius: "20px"
        }}>Gemini</span>
      </div>

      {loading ? (
        <div>
          {[100, 85, 60].map((w, i) => (
            <div key={i} style={{
              height: "14px", marginBottom: "8px",
              width: `${w}%`,
              background: "linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 75%)",
              backgroundSize: "200% 100%",
              borderRadius: "4px",
              animation: "shimmer 1.5s infinite"
            }} />
          ))}
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
      ) : displayPrediction ? (
        <p style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: "#e2e8f0",
          margin: 0,
          opacity: 1,
          transition: "opacity 300ms ease"
        }}>
          {displayPrediction}
        </p>
      ) : null}

      <div style={{ marginTop: "10px", fontSize: "11px", color: "#475569" }}>
        Powered by Google Gemini - updates with each status change
      </div>
    </div>
  )
}
