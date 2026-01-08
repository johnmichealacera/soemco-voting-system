import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCircle } from "lucide-react"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">My Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
              <CardTitle style={{ color: '#2c3e50' }}>Personal Information</CardTitle>
              <CardDescription>
                Your account details and member information
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-white p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <UserCircle className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: '#2c3e50' }}>
                      {session.user.name || "User"}
                    </h3>
                    <p className="text-gray-600">{session.user.email}</p>
                  </div>
                </div>
                <div className="pt-4 border-t" style={{ borderColor: '#dee2e6' }}>
                  <p className="text-sm text-gray-600">
                    Profile management features coming soon...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
              <CardTitle style={{ color: '#2c3e50' }}>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-white p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <p className="text-gray-600 mt-1">{session.user.role}</p>
                </div>
                <div className="pt-4 border-t" style={{ borderColor: '#dee2e6' }}>
                  <Button className="w-full" style={{ backgroundColor: '#3498db' }}>
                    Update Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

