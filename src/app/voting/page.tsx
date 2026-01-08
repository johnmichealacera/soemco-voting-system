"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { VotingElectionsList } from "@/components/voting/voting-elections-list"

export default function VotingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    router.push("/")
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">Voting</h1>
          <p className="text-gray-600 mt-2">
            Access your voting interface and cast your votes
          </p>
        </div>
        <VotingElectionsList />
      </div>
    </DashboardLayout>
  )
}

