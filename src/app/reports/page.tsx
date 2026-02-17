import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ReportsContent } from "@/components/reports/reports-content"
import { UserRole } from "@prisma/client"

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const role = session.user?.role as UserRole
  const allowedRoles = [
    UserRole.ADMIN,
    UserRole.BOARD_MEMBER,
    UserRole.ELECTION_COMMITTEE,
    UserRole.BRANCH_MANAGER,
  ]
  if (!role || !allowedRoles.includes(role as any)) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <ReportsContent />
    </DashboardLayout>
  )
}
