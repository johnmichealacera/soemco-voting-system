"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserRole } from "@prisma/client"
import { User, LogOut, Bell, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

function getRoleBadgeVariant(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return "destructive"
    case UserRole.ELECTION_COMMITTEE:
      return "default"
    case UserRole.BOARD_MEMBER:
      return "secondary"
    default:
      return "outline"
  }
}

function getRoleLabel(role: UserRole) {
  switch (role) {
    case UserRole.ADMIN:
      return "Admin"
    case UserRole.ELECTION_COMMITTEE:
      return "Election Committee"
    case UserRole.BOARD_MEMBER:
      return "Board Member"
    default:
      return "Member"
  }
}

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    // Clear selected role from sessionStorage
    sessionStorage.removeItem("selectedRole")
    await signOut({ callbackUrl: "/" })
  }

  const handleSwitchRole = () => {
    // Clear selected role and redirect to role selection
    sessionStorage.removeItem("selectedRole")
    signOut({ callbackUrl: "/" })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b px-6 shadow-sm" style={{ backgroundColor: '#2c3e50' }}>
      <div className="flex items-center gap-4">
        <img
          src="/soemcologo-bgremove.png"
          alt="SOEMCO Logo"
          className="h-10 w-auto"
        />
        <h1 className="text-xl font-bold text-white hidden sm:block">SOEMCO Voting System</h1>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <Bell className="h-5 w-5" />
        </Button>
        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10">
                <User className="h-5 w-5" />
                <span className="hidden md:inline">{session.user.name || session.user.email}</span>
                <Badge variant={getRoleBadgeVariant(session.user.role)}>
                  {getRoleLabel(session.user.role)}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/profile">Profile</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/settings">Settings</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSwitchRole}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Switch Role
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}

