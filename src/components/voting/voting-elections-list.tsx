"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { Vote, CheckCircle, Clock, AlertCircle } from "lucide-react"

async function getVotingElections() {
  const res = await fetch("/api/voting/elections")
  if (!res.ok) throw new Error("Failed to fetch elections")
  return res.json()
}

export function VotingElectionsList() {
  const { data: elections, isLoading } = useQuery({
    queryKey: ["voting-elections"],
    queryFn: getVotingElections,
  })

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-10 text-center bg-white">
          <p className="text-gray-600">Loading elections...</p>
        </CardContent>
      </Card>
    )
  }

  if (!elections || elections.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
          <CardTitle style={{ color: '#2c3e50' }}>Available Elections</CardTitle>
          <CardDescription>
            Select an election to cast your vote
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No Active Elections</p>
            <p className="text-sm text-gray-500">
              There are currently no elections available for voting at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const availableElections = elections.filter((e: any) => e.canVote)
  const completedElections = elections.filter((e: any) => e.hasVoted)

  return (
    <div className="space-y-6">
      {availableElections.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#2c3e50' }}>
            Elections Available for Voting
          </h2>
          <div className="space-y-4">
            {availableElections.map((election: any) => (
              <Card
                key={election.id}
                className="border-0 shadow-md hover:shadow-lg transition-shadow"
              >
                <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl" style={{ color: '#2c3e50' }}>
                        {election.title}
                      </CardTitle>
                      {election.description && (
                        <CardDescription>{election.description}</CardDescription>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="bg-white">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold" style={{ color: '#2c3e50' }}>
                          Voting Period
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatDate(election.votingStartDate)} -{" "}
                          {formatDate(election.votingEndDate)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold" style={{ color: '#2c3e50' }}>
                          Positions
                        </p>
                        <p className="text-sm text-gray-600">
                          {election.positions?.length || 0} position(s) available
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: '#dee2e6' }}>
                      <Button asChild style={{ backgroundColor: '#3498db' }}>
                        <Link href={`/voting/${election.id}`}>
                          <Vote className="mr-2 h-4 w-4" />
                          Cast Your Vote
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/elections/${election.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {completedElections.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#2c3e50' }}>
            Completed Votes
          </h2>
          <div className="space-y-4">
            {completedElections.map((election: any) => (
              <Card
                key={election.id}
                className="border-0 shadow-md opacity-75"
              >
                <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl" style={{ color: '#2c3e50' }}>
                        {election.title}
                      </CardTitle>
                      {election.description && (
                        <CardDescription>{election.description}</CardDescription>
                      )}
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                      Voted
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="bg-white">
                  <div className="flex items-center gap-2 pt-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-gray-600">
                      You have already cast your vote in this election
                    </span>
                    <Button variant="outline" size="sm" asChild className="ml-auto">
                      <Link href={`/elections/${election.id}`}>
                        View Details
                      </Link>
                    </Button>
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

