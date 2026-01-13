"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { KioskVotingInterface } from "@/components/voting/kiosk-voting-interface"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

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
    // This shouldn't happen as auth should redirect, but fallback to kiosk admin login
    router.push("/auth/kiosk-admin")
    return null
  }

  // Check if user has admin or branch manager role
  const isAuthorized = session.user.role === "ADMIN" || session.user.role === "BRANCH_MANAGER"
  if (!isAuthorized) {
    router.push("/auth/kiosk-admin")
    return null
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/kiosk-admin" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8 text-center relative">
          <div className="absolute top-0 right-0 sm:right-0">
            <Button
              variant="outline"
              onClick={handleLogout}
              size="sm"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Logout</span>
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#2c3e50' }}>
            Staff Voting Kiosk
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 px-4">
            Welcome, {session.user?.name || "Staff Member"}! Manage member voting.
          </p>
        </div>
        <KioskVotingInterface />
      </div>
    </div>
  )
}
