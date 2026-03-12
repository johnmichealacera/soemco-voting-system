import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TAFIMCO Voting System",
  description: "Cooperative voting system for secure and transparent elections",
  icons: {
    icon: [
      { url: "/tafimco-removebg-preview.ico", sizes: "any" },
      { url: "/tafimco-removebg-preview.ico", type: "image/x-icon" }
    ],
    shortcut: "/tafimco-removebg-preview.ico",
    apple: "/tafimco-removebg-preview.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TAFIMCO Voting",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

