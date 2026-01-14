import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Database } from "lucide-react"
import { ResetDemoDialog } from "@/components/admin/reset-demo-dialog"
import { Button } from "@/components/ui/button"

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
            <div className="space-y-6">
              {/* Reset Demo Data Section */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start gap-3">
                  <Database className="h-6 w-6 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">Reset Demo Data</h3>
                    <p className="text-sm text-red-700 mb-3">
                      Permanently delete all election data, votes, members, and users. This will restore the system to its initial demo state with only the admin account.
                    </p>
                    <p className="text-xs text-red-600 mb-4">
                      <strong>Warning:</strong> This action cannot be undone. Make sure to backup any important data before proceeding.
                    </p>
                    <ResetDemoDialog>
                      <Button variant="destructive" size="sm">
                        Reset Demo Data
                      </Button>
                    </ResetDemoDialog>
                  </div>
                </div>
              </div>

              {/* Future System Settings */}
              <div className="text-center py-8 border-t">
                <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">
                  Additional system configuration options coming soon...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

