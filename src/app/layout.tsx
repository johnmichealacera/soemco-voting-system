import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SOEMCO Voting System",
  description: "Cooperative voting system for secure and transparent elections",
  icons: {
    icon: [
      { url: "/soemcologo-bgremove.ico", sizes: "any" },
      { url: "/soemcologo-bgremove.ico", type: "image/x-icon" }
    ],
    shortcut: "/soemcologo-bgremove.ico",
    apple: "/soemcologo-bgremove.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SOEMCO Voting",
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

