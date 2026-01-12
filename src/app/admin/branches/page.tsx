import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { BranchesTable } from "@/components/admin/branches-table"

export default async function BranchesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="module-title text-3xl font-bold mb-0">Branch Management</h1>
            <p className="text-gray-600 mt-2">
              Manage SOEMCO branches and their operations
            </p>
          </div>
        </div>

        <BranchesTable />
      </div>
    </DashboardLayout>
  )
}