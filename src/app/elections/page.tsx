import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ElectionsList } from "@/components/elections/elections-list"

export default async function ElectionsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">Elections</h1>
          <p className="text-gray-600 mt-2">
            View and participate in available elections
          </p>
        </div>
        <ElectionsList />
      </div>
    </DashboardLayout>
  )
}

