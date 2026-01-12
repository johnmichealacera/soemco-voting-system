"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { User, TrendingUp, Users, BarChart3, Award, Briefcase, RefreshCw, Building2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ElectionStatus } from "@prisma/client"

async function getElections() {
  // Use public API endpoint that doesn't require authentication
  const res = await fetch("/api/elections/public")
  if (!res.ok) throw new Error("Failed to fetch elections")
  return res.json()
}

async function getElectionResults(electionId: string) {
  const res = await fetch(`/api/elections/${electionId}/results`)
  if (!res.ok) throw new Error("Failed to fetch election results")
  return res.json()
}

// Hook to track ranking changes for animations
function useRankingAnimation(results: any[]) {
  const prevRankingsRef = useRef<Map<string, number>>(new Map())
  const [animations, setAnimations] = useState<Map<string, { type: 'up' | 'down' | 'new', delay: number }>>(new Map())

  const updateRankings = useCallback((newResults: any[]) => {
    const newRankings = new Map<string, number>()
    const newAnimations = new Map<string, { type: 'up' | 'down' | 'new', delay: number }>()

    // Calculate new rankings
    newResults.forEach((position, positionIndex) => {
      position.candidates.forEach((candidate: any, candidateIndex: number) => {
        const candidateId = candidate.id
        const newRank = candidateIndex

        const prevRank = prevRankingsRef.current.get(candidateId)

        if (prevRank === undefined) {
          // New candidate
          newAnimations.set(candidateId, { type: 'new', delay: candidateIndex * 100 })
        } else if (newRank < prevRank) {
          // Moved up
          newAnimations.set(candidateId, { type: 'up', delay: candidateIndex * 100 })
        } else if (newRank > prevRank) {
          // Moved down
          newAnimations.set(candidateId, { type: 'down', delay: candidateIndex * 100 })
        }

        newRankings.set(candidateId, newRank)
      })
    })

    prevRankingsRef.current = newRankings
    setAnimations(newAnimations)

    // Clear animations after they complete
    setTimeout(() => setAnimations(new Map()), 2000)
  }, [])

  useEffect(() => {
    if (results) {
      updateRankings(results)
    }
  }, [results])

  return animations
}

function ResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const electionIdParam = searchParams.get("electionId")

  const { data: elections, isLoading: electionsLoading } = useQuery({
    queryKey: ["elections"],
    queryFn: getElections,
  })

  // Filter to get active elections (VOTING_ACTIVE or RESULTS_CERTIFIED)
  const activeElections = elections?.filter(
    (e: any) =>
      e.status === ElectionStatus.VOTING_ACTIVE ||
      e.status === ElectionStatus.RESULTS_CERTIFIED
  ) || []

  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(
    electionIdParam || null
  )

  // Update selectedElectionId when elections load or URL param changes
  useEffect(() => {
    if (electionIdParam) {
      // URL param takes precedence
      setSelectedElectionId(electionIdParam)
    } else if (activeElections.length > 0) {
      // Set to first active election if no URL param
      const firstElectionId = activeElections[0].id
      setSelectedElectionId(firstElectionId)
      // Update URL to reflect the selected election
      router.replace(`/results?electionId=${firstElectionId}`, { scroll: false })
    }
  }, [elections, electionIdParam, activeElections, router])

  const { data: resultsData, isLoading: resultsLoading, error } = useQuery({
    queryKey: ["election-results", selectedElectionId],
    queryFn: () => getElectionResults(selectedElectionId!),
    enabled: !!selectedElectionId,
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  })

  // Memoize results to prevent unnecessary re-renders
  const memoizedResults = useMemo(() => resultsData?.results || [], [resultsData?.results])

  // Animation hook for ranking changes
  const animations = useRankingAnimation(memoizedResults)

  const handleElectionChange = (electionId: string) => {
    setSelectedElectionId(electionId)
    router.push(`/results?electionId=${electionId}`, { scroll: false })
  }

  if (electionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading elections...</p>
        </div>
      </div>
    )
  }

  if (!activeElections || activeElections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">
              No active elections available for results.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (resultsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading election results...</p>
        </div>
      </div>
    )
  }

  if (error || !resultsData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-red-600 text-lg">
              Error loading results. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { election, results, summary, anonymity, branchBreakdown } = resultsData

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Election Selector */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold" style={{ color: "#2c3e50" }}>
              Election Results
            </h1>
            {activeElections.length > 1 && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">
                  Select Election:
                </label>
                <Select
                  value={selectedElectionId || ""}
                  onValueChange={handleElectionChange}
                >
                  <SelectTrigger className="w-64" style={{ borderColor: "#dee2e6" }}>
                    <SelectValue placeholder="Select an election" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeElections.map((election: any) => (
                      <SelectItem key={election.id} value={election.id}>
                        {election.title} ({election.status.replace("_", " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            style={{ borderColor: "#3498db", color: "#3498db" }}
          >
            Back to Home
          </Button>
        </div>

        {/* Election Title */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold" style={{ color: "#2c3e50" }}>
            {election.title}
          </h2>
          {election.description && (
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {election.description}
            </p>
          )}
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <span>
                Status:{" "}
                <span className="font-semibold" style={{ color: "#3498db" }}>
                  {election.status.replace("_", " ")}
                </span>
              </span>
            </div>
            {anonymity?.isEnabled && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-200">
                <span className="text-sm font-medium text-orange-700">
                  🔒 Results are anonymous - Only admins can reveal candidate identities
                </span>
              </div>
            )}
            {!anonymity?.isEnabled && anonymity?.canReveal && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
                <span className="text-sm font-medium text-green-700">
                  ✅ Anonymity revealed - Candidate identities are now visible
                </span>
              </div>
            )}
          </div>
            {/* Live Update Indicator */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
              <RefreshCw className="w-4 h-4 text-green-600 animate-spin" style={{ animationDuration: '2s' }} />
              <span className="text-sm font-medium text-green-700">
                Live Results - Auto-updating every 5 seconds
              </span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Positions</p>
                  <p className="text-3xl font-bold" style={{ color: "#2c3e50" }}>
                    {summary.totalPositions}
                  </p>
                </div>
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: "#ebf5fb" }}
                >
                  <Briefcase className="w-6 h-6" style={{ color: "#3498db" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Candidates</p>
                  <p className="text-3xl font-bold" style={{ color: "#2c3e50" }}>
                    {summary.totalCandidates}
                  </p>
                </div>
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: "#ebf5fb" }}
                >
                  <Users className="w-6 h-6" style={{ color: "#3498db" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Votes</p>
                  <p className="text-3xl font-bold" style={{ color: "#2c3e50" }}>
                    {summary.totalVotes}
                  </p>
                </div>
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: "#ebf5fb" }}
                >
                  <BarChart3 className="w-6 h-6" style={{ color: "#3498db" }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Participation</p>
                  <p className="text-3xl font-bold" style={{ color: "#2c3e50" }}>
                    {summary.overallParticipationRate}%
                  </p>
                </div>
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: "#ebf5fb" }}
                >
                  <TrendingUp className="w-6 h-6" style={{ color: "#3498db" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Branch Voting Breakdown */}
        {branchBreakdown && branchBreakdown.length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold" style={{ color: "#2c3e50" }}>
                Voting Breakdown by Branch
              </h2>
              <p className="text-gray-600 mt-2">
                See how each branch participated in the election
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {branchBreakdown.map((branch: any) => (
                <Card key={branch.id} className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg" style={{ color: "#2c3e50" }}>
                      {branch.name}
                      {branch.code && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({branch.code})
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Votes</p>
                        <p className="text-xl font-bold" style={{ color: "#3498db" }}>
                          {branch.totalVotes}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Participation</p>
                        <p className="text-xl font-bold" style={{ color: "#2c3e50" }}>
                          {branch.participationRate}%
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-2">
                        {branch.totalMembers} active members in branch
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${branch.participationRate}%`,
                            backgroundColor: "#3498db",
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Branch Summary Table */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle style={{ color: "#2c3e50" }}>
                  Branch Participation Summary
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of voting activity across all branches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold" style={{ color: "#2c3e50" }}>
                          Branch
                        </th>
                        <th className="text-center py-3 px-4 font-semibold" style={{ color: "#2c3e50" }}>
                          Active Members
                        </th>
                        <th className="text-center py-3 px-4 font-semibold" style={{ color: "#2c3e50" }}>
                          Total Votes
                        </th>
                        <th className="text-center py-3 px-4 font-semibold" style={{ color: "#2c3e50" }}>
                          Participation Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchBreakdown.map((branch: any) => (
                        <tr key={branch.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium" style={{ color: "#2c3e50" }}>
                            {branch.name}
                            {branch.code && (
                              <span className="text-gray-500 ml-2">({branch.code})</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {branch.totalMembers}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold" style={{ color: "#3498db" }}>
                            {branch.totalVotes}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-semibold ${
                              branch.participationRate >= 80 ? 'text-green-600' :
                              branch.participationRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {branch.participationRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results by Position */}
        <div className="space-y-8">
          {results.map((position: any) => (
            <Card key={position.id} className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl" style={{ color: "#2c3e50" }}>
                  {position.title}
                </CardTitle>
                {position.description && (
                  <p className="text-gray-600 mt-2">{position.description}</p>
                )}
                <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
                  <span>
                    <strong>{position.totalVotes}</strong> votes cast
                  </span>
                  <span>
                    <strong>{position.participationRate}%</strong> participation
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {position.candidates.length > 0 ? (
                  <div className="space-y-4">
                    {position.candidates.map((candidate: any, index: number) => {
                      // Only show "Leading" if this candidate is first AND has more votes than the next candidate
                      const isWinner = index === 0 && candidate.voteCount > 0 &&
                        (position.candidates.length === 1 || candidate.voteCount > (position.candidates[1]?.voteCount || 0))
                      const animation = animations.get(candidate.id)

                      return (
                        <div
                          key={candidate.id}
                          className={`rounded-lg border-2 p-6 transition-all duration-1000 transform ${
                            isWinner
                              ? "bg-gradient-to-r from-blue-50 to-blue-100"
                              : "bg-white hover:bg-gray-50"
                          } ${
                            animation?.type === 'up' ? 'ranking-up-animation' : ''
                          } ${
                            animation?.type === 'down' ? 'ranking-down-animation' : ''
                          } ${
                            animation?.type === 'new' ? 'ranking-new-animation' : ''
                          }`}
                          style={{
                            borderColor: isWinner ? "#3498db" : "#dee2e6",
                            animationDelay: animation ? `${animation.delay}ms` : '0ms',
                          }}
                        >
                          <div className="flex items-start gap-6">
                            {/* Rank Badge */}
                            <div className="flex-shrink-0">
                              <div
                                className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl ${
                                  isWinner
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {index + 1}
                              </div>
                            </div>

                            {/* Candidate Image */}
                            <div className="flex-shrink-0">
                              {candidate.imageUrl ? (
                                <div
                                  className="relative w-20 h-20 rounded-full overflow-hidden border-2"
                                  style={{ borderColor: "#3498db" }}
                                >
                                  <Image
                                    src={candidate.imageUrl}
                                    alt={candidate.name}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                  />
                                </div>
                              ) : (
                                <div
                                  className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2"
                                  style={{ borderColor: "#dee2e6" }}
                                >
                                  <User className="w-10 h-10 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Candidate Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3
                                  className="text-xl font-bold"
                                  style={{ color: "#2c3e50" }}
                                >
                                  {candidate.name}
                                </h3>
                                {isWinner && (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100">
                                    <Award className="w-4 h-4 text-yellow-600" />
                                    <span className="text-xs font-semibold text-yellow-600">
                                      Leading
                                    </span>
                                  </div>
                                )}
                              </div>
                              {candidate.bio && (
                                <p className="text-sm text-gray-600 mb-2">
                                  {candidate.bio}
                                </p>
                              )}

                              {/* Vote Count and Percentage Bar */}
                              <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-700">
                                    {candidate.voteCount} votes
                                  </span>
                                  <span
                                    className="text-lg font-bold"
                                    style={{ color: "#3498db" }}
                                  >
                                    {candidate.percentage}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${candidate.percentage}%`,
                                      backgroundColor: isWinner
                                        ? "#3498db"
                                        : "#95a5a6",
                                    }}
                                  />
                                </div>

                                {/* Branch Breakdown */}
                                {candidate.branchBreakdown && candidate.branchBreakdown.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-gray-200">
                                    <div className="text-xs font-medium text-gray-600 mb-2">
                                      Votes by Branch:
                                    </div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {candidate.branchBreakdown.map((branch: any) => (
                                        <div key={branch.branchId} className="flex justify-between items-center text-xs">
                                          <span className="text-gray-700 truncate mr-2">
                                            {branch.branchName}
                                          </span>
                                          <span className="font-semibold text-gray-900">
                                            {branch.votes} {branch.votes === 1 ? 'vote' : 'votes'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No candidates for this position
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  )
}
