"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Vote, Building2, FileText, UserCheck, Calendar } from "lucide-react"

export function BranchManagerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="module-title text-3xl font-bold mb-0">Branch Manager Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Branch operations and member management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-office text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Branch Members</CardTitle>
            <Users className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>0</div>
            <p className="text-xs text-gray-600">Active members</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-success text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Active Elections</CardTitle>
            <Vote className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>0</div>
            <p className="text-xs text-gray-600">Current elections</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-warning text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Branch Operations</CardTitle>
            <Building2 className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>0</div>
            <p className="text-xs text-gray-600">Operations</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-danger text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Reports</CardTitle>
            <FileText className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>0</div>
            <p className="text-xs text-gray-600">Generated reports</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader className="stat-office text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Member Management
            </CardTitle>
            <CardDescription className="text-white/80">
              Manage branch members and their information
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-white rounded-b-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Members</span>
                <span className="text-2xl font-bold" style={{ color: '#2c3e50' }}>0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Members</span>
                <span className="text-2xl font-bold text-green-600">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Inactive Members</span>
                <span className="text-2xl font-bold text-red-600">0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="stat-success text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Election Oversight
            </CardTitle>
            <CardDescription className="text-white/80">
              Monitor and manage election processes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-white rounded-b-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Upcoming Elections</span>
                <span className="text-2xl font-bold" style={{ color: '#2c3e50' }}>0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Voting</span>
                <span className="text-2xl font-bold text-blue-600">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completed</span>
                <span className="text-2xl font-bold text-green-600">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}