"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { User, Award } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense, useRef, useCallback, useMemo } from "react"
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

function TVResultsContent() {
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
      router.replace(`/results/tv?electionId=${firstElectionId}`, { scroll: false })
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

  if (electionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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

  const { election, results, anonymity } = resultsData

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 px-2">
      <div className="max-w-7xl mx-auto">
        {/* Election Title and Status - Compact */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "#2c3e50" }}>
            {election.title}
          </h1>
          {/* <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-4 text-gray-700 text-sm">
              <span>
                Status: <span className="font-semibold" style={{ color: "#3498db" }}>
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
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
              <RefreshCw className="w-4 h-4 text-green-600 animate-spin" style={{ animationDuration: '2s' }} />
              <span className="text-sm font-medium text-green-700">
                Live Results - Auto-updating every 5 seconds
              </span>
            </div>
          </div> */}
        </div>

        {/* Results by Position - 3 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((position: any) => (
            <div key={position.id} className="space-y-2">
              {/* Position Header */}
              <div className="text-center mb-2">
                <h2 className="text-base font-bold" style={{ color: "#2c3e50" }}>
                  {position.title}
                </h2>
                <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                  <span>
                    <strong>{position.totalVotes}</strong> votes
                  </span>
                  <span>
                    <strong>{position.participationRate}%</strong> participation
                  </span>
                </div>
              </div>

              {position.candidates.length > 0 ? (
                <div className="space-y-2">
                  {position.candidates.map((candidate: any, index: number) => {
                    // Only show "Leading" if this candidate is first AND has more votes than the next candidate
                    const isWinner = index === 0 && candidate.voteCount > 0 &&
                      (position.candidates.length === 1 || candidate.voteCount > (position.candidates[1]?.voteCount || 0))
                    const animation = animations.get(candidate.id)

                    return (
                      <div
                        key={candidate.id}
                        className={`rounded-lg border-2 p-3 transition-all duration-1000 transform ${
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
                        <div className="text-center space-y-2">
                          {/* Rank Badge */}
                          <div className="flex justify-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                isWinner
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </div>

                          {/* Candidate Image */}
                          <div className="flex justify-center">
                            {candidate.imageUrl ? (
                              <div
                                className="relative w-20 h-20 rounded-full overflow-hidden border-2 mx-auto"
                                style={{ borderColor: isWinner ? "#3498db" : "#dee2e6" }}
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
                                className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 mx-auto"
                                style={{ borderColor: "#dee2e6" }}
                              >
                                <User className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Candidate Info - All Below Portrait */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-center gap-1">
                              <h3 className="text-sm font-bold" style={{ color: "#2c3e50" }}>
                                {candidate.name}
                              </h3>
                              {isWinner && (
                                <div className="flex items-center gap-1 px-1 py-0.5 rounded-full bg-yellow-100 border border-yellow-300">
                                  <Award className="w-3 h-3 text-yellow-600" />
                                  <span className="text-xs font-semibold text-yellow-700">
                                    Leading
                                  </span>
                                </div>
                              )}
                            </div>

                            {candidate.bio && (
                              <p className="text-xs text-gray-600 text-center">
                                {candidate.bio}
                              </p>
                            )}

                            {/* Vote Count and Percentage */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-gray-700">
                                  {candidate.voteCount} votes
                                </span>
                                <span className="text-sm font-bold" style={{ color: "#3498db" }}>
                                  {candidate.percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
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
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-xs font-medium text-gray-600 mb-1 text-center">
                                    Votes by Branch:
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {candidate.branchBreakdown.map((branch: any) => (
                                      <div key={branch.branchId} className="flex justify-between items-center text-xs bg-gray-50 px-1 py-0.5 rounded">
                                        <span className="text-gray-700 truncate mr-1">
                                          {branch.branchName}
                                        </span>
                                        <span className="font-semibold" style={{ color: "#2c3e50" }}>
                                          {branch.votes}
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
                <div className="text-center py-8 text-gray-400">
                  No candidates for this position
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function TVResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl">Loading...</p>
          </div>
        </div>
      }
    >
      <TVResultsContent />
    </Suspense>
  )
}