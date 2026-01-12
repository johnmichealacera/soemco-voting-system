"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { UserRole } from "@prisma/client"
import {
  LayoutDashboard,
  Vote,
  Users,
  FileText,
  Settings,
  BarChart3,
  Shield,
  ClipboardCheck,
  UserCircle,
  Briefcase,
  UserCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

const menuItems = {
  [UserRole.MEMBER]: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/elections", label: "Elections", icon: Vote },
    { href: "/voting", label: "Vote", icon: ClipboardCheck },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ],
  [UserRole.BOARD_MEMBER]: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/board/elections", label: "Manage Elections", icon: Vote },
    { href: "/board/candidates", label: "Candidates", icon: Users },
    { href: "/board/approvals", label: "Approvals", icon: ClipboardCheck },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ],
  [UserRole.ELECTION_COMMITTEE]: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/committee/elections", label: "Election Oversight", icon: Vote },
    { href: "/committee/config", label: "Configuration", icon: Settings },
    { href: "/committee/certification", label: "Certification", icon: Shield },
    { href: "/committee/audit", label: "Audit Reports", icon: FileText },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ],
  [UserRole.BRANCH_MANAGER]: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/members", label: "Members", icon: UserCircle },
  ],
  [UserRole.ADMIN]: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/elections", label: "Elections", icon: Vote },
    { href: "/admin/members", label: "Members", icon: UserCircle },
    { href: "/admin/positions", label: "Positions", icon: Briefcase },
    { href: "/admin/candidates", label: "Candidates", icon: UserCheck },
    // { href: "/admin/users", label: "User Management", icon: Users },
    // { href: "/admin/system", label: "System Config", icon: Settings },
    // { href: "/admin/audit", label: "Audit Logs", icon: FileText },
    // { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ],
}

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role || UserRole.MEMBER
  const items = menuItems[role] || menuItems[UserRole.MEMBER]

  return (
    <div className="flex h-full w-64 flex-col border-r bg-white shadow-sm">
      <div className="flex h-16 items-center border-b px-6" style={{ borderColor: '#dee2e6' }}>
        <h2 className="text-lg font-semibold" style={{ color: '#2c3e50' }}>SOEMCO Voting</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 border-l-4",
                isActive
                  ? "bg-blue-50 text-blue-600 border-blue-500 font-semibold"
                  : "text-gray-700 hover:bg-gray-50 hover:text-blue-600 border-transparent"
              )}
              style={isActive ? { borderLeftColor: '#3498db' } : {}}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

