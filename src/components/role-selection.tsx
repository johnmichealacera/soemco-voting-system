"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserRole } from "@prisma/client"
import { 
  User, 
  Shield, 
  Users, 
  Vote,
  Building2,
  ClipboardCheck,
  Settings,
  BarChart3,
  Megaphone
} from "lucide-react"

const roles = [
  // {
  //   id: "MEMBER" as UserRole,
  //   name: "Voting Kiosk",
  //   description: "Member Voting Portal",
  //   icon: User,
  //   color: "bg-blue-500",
  //   gradient: "from-blue-500 to-blue-700",
  //   features: ["View Elections", "Cast Votes", "View Results"],
  // },
  // Commenting them out for now since it is not specified to be used
  // {
  //   id: "MEMBER" as UserRole,
  //   name: "Member",
  //   description: "Regular Cooperative Member",
  //   icon: User,
  //   color: "bg-blue-500",
  //   gradient: "from-blue-500 to-blue-700",
  //   features: ["View Elections", "Cast Votes", "View Results"],
  // },
  // {
  //   id: "BOARD_MEMBER" as UserRole,
  //   name: "Board Member",
  //   description: "Board of Directors",
  //   icon: Users,
  //   color: "bg-green-500",
  //   gradient: "from-green-500 to-green-700",
  //   features: ["Manage Elections", "Candidate Approvals", "Board Actions"],
  // },
  // {
  //   id: "ELECTION_COMMITTEE" as UserRole,
  //   name: "Election Committee",
  //   description: "Election Oversight Committee",
  //   icon: Shield,
  //   color: "bg-purple-500",
  //   gradient: "from-purple-500 to-purple-700",
  //   features: ["Election Oversight", "Configuration", "Certification"],
  // },
  {
    id: "ADMIN" as UserRole,
    name: "SOEMCO LOGIN",
    description: "Administrative & Branch Manager Access",
    icon: Settings,
    color: "bg-red-500",
    gradient: "from-red-500 to-red-700",
    features: ["Administrative Access", "Branch Management", "System Operations"],
  },
  {
    id: "BRANCH_MANAGER" as UserRole,
    name: "Kiosk Management",
    description: "Staff Kiosk Login",
    icon: Shield,
    color: "bg-green-500",
    gradient: "from-green-500 to-green-700",
    features: ["Staff Authentication", "Member ID Entry", "Assisted Voting"],
  },
]

export function RoleSelection() {
  const router = useRouter()

  const selectRole = (role: UserRole) => {
    // Store selected role in sessionStorage
    sessionStorage.setItem("selectedRole", role)
    // Redirect based on role
    if (role === "MEMBER") {
      router.push("/auth/kiosk")
    } else if (role === "BRANCH_MANAGER") {
      // Kiosk Management for Branch Managers
      router.push("/auth/kiosk-admin")
    } else {
      // SOEMCO LOGIN for ADMIN and other authenticated users
      router.push("/auth/signin")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-16">
          <div className="mb-8">
            <img
              src="/soemcologo-bgremove.png"
              alt="SOEMCO Logo"
              className="h-20 w-auto mx-auto"
            />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-4">
            SOEMCO Voting System
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-3 font-medium">
            Choose your access method
          </p>
          <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto">
            Select Voting Kiosk for members or SOEMCO LOGIN for administrative access
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch justify-center gap-8 mb-12 max-w-5xl mx-auto">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <Card
                key={role.id}
                className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border-2 border-slate-200 hover:border-primary group bg-white w-full md:w-[420px] flex-1 shadow-md"
                onClick={() => selectRole(role.id)}
              >
                <CardContent className="p-10 text-center flex flex-col h-full">
                  <div className={`inline-flex p-6 rounded-full bg-gradient-to-br ${role.gradient} mb-6 group-hover:scale-110 transition-transform shadow-xl`}>
                    <Icon className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                    {role.name}
                  </h3>
                  <p className="text-base md:text-lg text-slate-600 mb-6 font-medium">
                    {role.description}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {role.features.map((feature, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-md"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-auto pt-6 border-t border-slate-200">
                    <p className="text-sm text-slate-500 font-medium group-hover:text-primary transition-colors">
                      Click to continue →
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {/* View Results Card */}
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border-2 border-slate-200 hover:border-green-500 group bg-white w-full md:w-[420px] flex-1 shadow-md"
            onClick={() => router.push("/results")}
          >
            <CardContent className="p-10 text-center flex flex-col h-full">
              <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-green-500 to-green-700 mb-6 group-hover:scale-110 transition-transform shadow-xl">
                <BarChart3 className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                View Results
              </h3>
              <p className="text-base md:text-lg text-slate-600 mb-6 font-medium">
                Election Results & Statistics
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <Badge
                  variant="secondary"
                  className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-md"
                >
                  Live Results
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-md"
                >
                  Vote Counts
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-md"
                >
                  Statistics
                </Badge>
              </div>
              <div className="mt-auto pt-6 border-t border-slate-200">
                <p className="text-sm text-slate-500 font-medium group-hover:text-green-600 transition-colors">
                  Click to view →
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Information Card */}
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border-2 border-slate-200 hover:border-purple-500 group bg-white w-full md:w-[420px] flex-1 shadow-md"
            onClick={() => router.push("/campaigns")}
          >
            <CardContent className="p-10 text-center flex flex-col h-full">
              <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 mb-6 group-hover:scale-110 transition-transform shadow-xl">
                <Megaphone className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                Campaigns
              </h3>
              <p className="text-base md:text-lg text-slate-600 mb-6 font-medium">
                Candidate Information & Profiles
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <Badge
                  variant="secondary"
                  className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-md"
                >
                  Candidate Info
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-md"
                >
                  Profiles
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-md"
                >
                  Positions
                </Badge>
              </div>
              <div className="mt-auto pt-6 border-t border-slate-200">
                <p className="text-sm text-slate-500 font-medium group-hover:text-purple-600 transition-colors">
                  Click to view →
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <Vote className="h-4 w-4" />
            Secure and transparent cooperative voting system
          </p>
        </div>
      </div>
    </div>
  )
}

