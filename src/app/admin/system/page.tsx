import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default async function AdminSystemPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">System Configuration</h1>
          <p className="text-gray-600 mt-2">
            Configure system settings and preferences
          </p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
            <CardTitle style={{ color: '#2c3e50' }}>
              <Settings className="inline mr-2 h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              Manage system-wide configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white p-6">
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                System configuration interface coming soon...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

