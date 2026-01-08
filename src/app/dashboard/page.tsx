import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { UserRole } from "@prisma/client"
import { MemberDashboard } from "@/components/dashboard/member-dashboard"
import { BoardDashboard } from "@/components/dashboard/board-dashboard"
import { CommitteeDashboard } from "@/components/dashboard/committee-dashboard"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const renderDashboard = () => {
    switch (session.user.role) {
      case UserRole.ADMIN:
        return <AdminDashboard />
      case UserRole.ELECTION_COMMITTEE:
        return <CommitteeDashboard />
      case UserRole.BOARD_MEMBER:
        return <BoardDashboard />
      default:
        return <MemberDashboard />
    }
  }

  return <DashboardLayout>{renderDashboard()}</DashboardLayout>
}

