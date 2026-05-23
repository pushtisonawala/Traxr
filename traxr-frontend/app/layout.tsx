import "./globals.css"
import { Outfit, Space_Mono } from "next/font/google"
import type { Metadata } from "next"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-space-mono", weight: ["400", "700"] })

export const metadata: Metadata = {
  title: "Traxr",
  description: "Real-time shipment tracking with AI delay prediction."
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${spaceMono.variable}`}>
        <div style={{
          background: "#0f172a",
          borderBottom: "1px solid rgba(99,102,241,0.3)",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          fontSize: "13px",
          color: "#94a3b8"
        }}>
          <span style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: "#ef4444",
            boxShadow: "0 0 6px #ef4444",
            display: "inline-block",
            animation: "livepulse 1s infinite",
            flexShrink: 0
          }} />
          <style>{`@keyframes livepulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          <span>Live demo - try your real courier tracking ID, or go to</span>
          <a
            href="/admin"
            style={{
              color: "#818cf8",
              textDecoration: "none",
              fontWeight: 500,
              background: "rgba(99,102,241,0.15)",
              padding: "2px 10px",
              borderRadius: "20px",
              border: "1px solid rgba(99,102,241,0.3)"
            }}
          >
            /admin
          </a>
          <span>to simulate a live shipment journey</span>
        </div>
        {children}
      </body>
    </html>
  )
}
