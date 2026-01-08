"use client"

import { use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { VotingInterface } from "@/components/voting/voting-interface"

export default function VotingPage({
  params,
}: {
  params: Promise<{ electionId: string }>
}) {
  const { electionId } = use(params)
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
      <VotingInterface electionId={electionId} />
    </DashboardLayout>
  )
}

