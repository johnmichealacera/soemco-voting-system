"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Vote, Clock, CheckCircle, FileText } from "lucide-react"
import Link from "next/link"

async function getMemberDashboardData() {
  const res = await fetch("/api/dashboard/member")
  if (!res.ok) throw new Error("Failed to fetch dashboard data")
  return res.json()
}

export function MemberDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["member-dashboard"],
    queryFn: getMemberDashboardData,
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  const stats = data?.stats || {
    activeElections: 0,
    pendingVotes: 0,
    completedVotes: 0,
    totalElections: 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="module-title text-3xl font-bold mb-0">Member Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome to your voting dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-office text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Active Elections</CardTitle>
            <Vote className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>{stats.activeElections}</div>
            <p className="text-xs text-gray-600">
              Elections you can vote in
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-warning text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Pending Votes</CardTitle>
            <Clock className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>{stats.pendingVotes}</div>
            <p className="text-xs text-gray-600">
              Votes waiting for you
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-success text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Completed Votes</CardTitle>
            <CheckCircle className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>{stats.completedVotes}</div>
            <p className="text-xs text-gray-600">
              Votes you&apos;ve cast
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-office text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Total Elections</CardTitle>
            <FileText className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>{stats.totalElections}</div>
            <p className="text-xs text-gray-600">
              All elections
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
            <CardTitle style={{ color: '#2c3e50' }}>Active Elections</CardTitle>
            <CardDescription>
              Elections currently open for voting
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white">
            {data?.activeElections?.length > 0 ? (
              <div className="space-y-2">
                {data.activeElections.map((election: any) => (
                  <div
                    key={election.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{election.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {election.electionType}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/voting/${election.id}`}>Vote</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active elections at this time
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
            <CardTitle style={{ color: '#2c3e50' }}>Recent Activity</CardTitle>
            <CardDescription>Your recent voting activity</CardDescription>
          </CardHeader>
          <CardContent className="bg-white">
            {data?.recentActivity?.length > 0 ? (
              <div className="space-y-2">
                {data.recentActivity.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

