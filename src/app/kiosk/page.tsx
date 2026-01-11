"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { KioskVotingInterface } from "@/components/voting/kiosk-voting-interface"

export default function KioskPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push("/auth/kiosk")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#2c3e50' }}>
            Voting Kiosk
          </h1>
          <p className="text-xl text-gray-600">
            Welcome, {session.user?.name || "Member"}! You can now vote.
          </p>
        </div>
        <KioskVotingInterface />
      </div>
    </div>
  )
}
