"use client"

import { Sidebar } from "./sidebar"
import { Header } from "./header"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#f5f7fa' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-6" style={{ backgroundColor: '#f8f9fa' }}>
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

