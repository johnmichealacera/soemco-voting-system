"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Vote, Building2, FileText, TrendingUp } from "lucide-react"

async function fetchDashboardStats() {
  const res = await fetch("/api/dashboard/stats")
  if (!res.ok) throw new Error("Failed to fetch dashboard stats")
  return res.json()
}

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img
          src="/soemcologo-bgremove.png"
          alt="SOEMCO Logo"
          className="h-12 w-auto"
        />
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            System administration and management
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-office text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Total Users</CardTitle>
            <Users className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>
              {stats?.totalUsers || 0}
            </div>
            <p className="text-xs text-gray-600">System users</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-success text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Branches</CardTitle>
            <Building2 className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>
              {stats?.totalBranches || 0}
            </div>
            <p className="text-xs text-gray-600">Active: {stats?.activeBranches || 0}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-warning text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Total Members</CardTitle>
            <TrendingUp className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>
              {stats?.totalMembers || 0}
            </div>
            <p className="text-xs text-gray-600">Registered members</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-danger text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Active Elections</CardTitle>
            <Vote className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>
              {stats?.activeElections || 0}
            </div>
            <p className="text-xs text-gray-600">Total: {stats?.totalElections || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Branch Breakdown Section */}
      {stats?.branchBreakdown && stats.branchBreakdown.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#2c3e50' }}>
            Branch Member Distribution
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.branchBreakdown.map((branch: any) => (
              <Card key={branch.id} className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{branch.name}</span>
                    <span className="text-sm font-normal text-gray-500">({branch.code})</span>
                  </CardTitle>
                  <CardDescription>
                    {branch.isActive ? 'Active' : 'Inactive'} Branch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Members</span>
                    <span className="text-2xl font-bold" style={{ color: '#2c3e50' }}>
                      {branch.memberCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

