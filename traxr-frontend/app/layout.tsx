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
      <body className={`${outfit.variable} ${spaceMono.variable}`}>{children}</body>
    </html>
  )
}
