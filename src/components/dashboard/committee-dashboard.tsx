"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Settings, FileText, BarChart3 } from "lucide-react"

export function CommitteeDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="module-title text-3xl font-bold mb-0">Election Committee Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Oversee elections and ensure integrity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-office text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Oversight</CardTitle>
            <Shield className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>0</div>
            <p className="text-xs text-gray-600">Active oversight</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-warning text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Configuration</CardTitle>
            <Settings className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>0</div>
            <p className="text-xs text-gray-600">Settings</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-success text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Audit Reports</CardTitle>
            <FileText className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>0</div>
            <p className="text-xs text-gray-600">Available reports</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 stat-office text-white rounded-t-lg p-5">
            <CardTitle className="text-sm font-semibold">Certifications</CardTitle>
            <BarChart3 className="h-5 w-5" />
          </CardHeader>
          <CardContent className="p-5 bg-white rounded-b-lg">
            <div className="text-3xl font-bold mb-1" style={{ color: '#2c3e50' }}>0</div>
            <p className="text-xs text-gray-600">Certified results</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

