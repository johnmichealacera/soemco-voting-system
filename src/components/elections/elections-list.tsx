"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ElectionStatus } from "@prisma/client"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { Vote, Clock, CheckCircle } from "lucide-react"

async function getElections() {
  const res = await fetch("/api/elections")
  if (!res.ok) throw new Error("Failed to fetch elections")
  return res.json()
}

function getStatusBadgeVariant(status: ElectionStatus) {
  switch (status) {
    case ElectionStatus.VOTING_ACTIVE:
      return "default"
    case ElectionStatus.ANNOUNCED:
      return "secondary"
    case ElectionStatus.RESULTS_CERTIFIED:
      return "outline"
    case ElectionStatus.CANCELLED:
      return "destructive"
    default:
      return "outline"
  }
}

export function ElectionsList() {
  const { data: elections, isLoading } = useQuery({
    queryKey: ["elections"],
    queryFn: getElections,
  })

  if (isLoading) {
    return <div>Loading elections...</div>
  }

  if (!elections || elections.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-10 text-center bg-white">
          <p className="text-gray-600">No elections available at this time.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {elections.map((election: any) => (
        <Card key={election.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl" style={{ color: '#2c3e50' }}>{election.title}</CardTitle>
                <CardDescription>{election.description}</CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(election.status)}>
                {election.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="bg-white">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold" style={{ color: '#2c3e50' }}>Election Type</p>
                  <p className="text-sm text-gray-600">{election.electionType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold" style={{ color: '#2c3e50' }}>Vote Type</p>
                  <p className="text-sm text-gray-600">
                    {election.voteType.replace("_", " ")}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold" style={{ color: '#2c3e50' }}>Voting Period</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(election.votingStartDate)} - {formatDate(election.votingEndDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold" style={{ color: '#2c3e50' }}>Statistics</p>
                  <p className="text-sm text-gray-600">
                    {election._count.candidates} candidates, {election._count.votes} votes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: '#dee2e6' }}>
                {election.status === ElectionStatus.VOTING_ACTIVE && (
                  <Button asChild style={{ backgroundColor: '#3498db' }}>
                    <Link href={`/voting/${election.id}`}>
                      <Vote className="mr-2 h-4 w-4" />
                      Vote Now
                    </Link>
                  </Button>
                )}
                {election.status === ElectionStatus.ANNOUNCED && (
                  <Button variant="outline" disabled>
                    <Clock className="mr-2 h-4 w-4" />
                    Voting Not Started
                  </Button>
                )}
                {election.status === ElectionStatus.RESULTS_CERTIFIED && (
                  <Button variant="outline" asChild>
                    <Link href={`/elections/${election.id}/results`}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      View Results
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" asChild>
                  <Link href={`/elections/${election.id}`}>View Details</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

