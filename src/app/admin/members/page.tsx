"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCircle, Plus } from "lucide-react"
import { MembersTable } from "@/components/admin/members-table"
import { MemberForm } from "@/components/admin/member-form"

export default function AdminMembersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isFormOpen, setIsFormOpen] = useState(false)

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="module-title text-3xl font-bold mb-0">Member Management</h1>
            <p className="text-gray-600 mt-2">
              Manage cooperative members and their profiles
            </p>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            style={{ backgroundColor: '#3498db' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
            <CardTitle style={{ color: '#2c3e50' }}>
              <UserCircle className="inline mr-2 h-5 w-5" />
              All Members
            </CardTitle>
            <CardDescription>
              View and manage member profiles and status
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white p-6">
            <MembersTable />
          </CardContent>
        </Card>

        {isFormOpen && (
          <MemberForm
            member={null}
            open={isFormOpen}
            onClose={() => setIsFormOpen(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

