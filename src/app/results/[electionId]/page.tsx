"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { User, TrendingUp, Users, BarChart3, Award, Briefcase } from "lucide-react"
import { useRef, useCallback, useState, useEffect, useMemo } from "react"

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
    newResults.forEach((position) => {
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

export default function ElectionResultsPage() {
  const params = useParams()
  const electionId = params.electionId as string

  const { data, isLoading, error } = useQuery({
    queryKey: ["election-results", electionId],
    queryFn: () => getElectionResults(electionId),
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  })

  // Memoize results to prevent unnecessary re-renders
  const memoizedResults = useMemo(() => data?.results || [], [data?.results])

  // Animation hook for ranking changes
  const animations = useRankingAnimation(memoizedResults)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading election results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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

  if (!data) {
    return null
  }

  const { election, results, summary } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold" style={{ color: "#2c3e50" }}>
            {election.title}
          </h1>
          {election.description && (
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {election.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>
              Status:{" "}
              <span
                className="font-semibold"
                style={{ color: "#3498db" }}
              >
                {election.status.replace("_", " ")}
              </span>
            </span>
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
                      const maxVotes = Math.max(
                        ...position.candidates.map((c: any) => c.voteCount)
                      )
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
                                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2" style={{ borderColor: "#3498db" }}>
                                  <Image
                                    src={candidate.imageUrl}
                                    alt={candidate.name}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                  />
                                </div>
                              ) : (
                                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2" style={{ borderColor: "#dee2e6" }}>
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
                                      backgroundColor: isWinner ? "#3498db" : "#95a5a6",
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
