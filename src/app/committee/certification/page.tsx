import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"

export default async function CommitteeCertificationPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">Certification</h1>
          <p className="text-gray-600 mt-2">
            Certify election results and integrity
          </p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
            <CardTitle style={{ color: '#2c3e50' }}>
              <Shield className="inline mr-2 h-5 w-5" />
              Result Certification
            </CardTitle>
            <CardDescription>
              Review and certify election results
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white p-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Certification interface coming soon...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

