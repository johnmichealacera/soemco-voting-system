"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, Plus } from "lucide-react"
import { PositionsTable } from "@/components/admin/positions-table"
import { PositionForm } from "@/components/admin/position-form"

export default function AdminPositionsPage() {
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
            <h1 className="module-title text-3xl font-bold mb-0">Position Management</h1>
            <p className="text-gray-600 mt-2">
              Manage election positions and roles
            </p>
          </div>
          <Button
            onClick={() => setIsFormOpen(true)}
            style={{ backgroundColor: '#3498db' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Position
          </Button>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
            <CardTitle style={{ color: '#2c3e50' }}>
              <Briefcase className="inline mr-2 h-5 w-5" />
              All Positions
            </CardTitle>
            <CardDescription>
              Manage positions available for elections
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white p-6">
            <PositionsTable />
          </CardContent>
        </Card>

        {isFormOpen && (
          <PositionForm
            position={null}
            open={isFormOpen}
            onClose={() => setIsFormOpen(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

