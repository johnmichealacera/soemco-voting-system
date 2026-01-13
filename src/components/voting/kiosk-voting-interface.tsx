"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { VoteType, ElectionStatus } from "@prisma/client"
import Image from "next/image"
import { User } from "lucide-react"
import { useSession } from "next-auth/react"

async function getActiveElections(memberId?: string) {
  const url = memberId ? `/api/voting/elections?memberId=${encodeURIComponent(memberId)}` : "/api/voting/elections"
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch elections")
  return res.json()
}

async function getElection(electionId: string) {
  const res = await fetch(`/api/elections/${electionId}`)
  if (!res.ok) throw new Error("Failed to fetch election")
  return res.json()
}

async function castVotes(data: {
  electionId: string
  votes: Array<{ positionId: string; candidateId: string }>
  memberId?: string
}) {
  const res = await fetch("/api/votes/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to cast votes")
  }
  return res.json()
}

export function KioskVotingInterface() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null)
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, string>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [memberId, setMemberId] = useState("")
  const [isMemberIdSubmitted, setIsMemberIdSubmitted] = useState(false)

  // Clear cache when component mounts to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["voting-elections"] })
  }, [queryClient])

  // Clear cache when session changes to ensure clean state
  useEffect(() => {
    if (session?.user?.id) {
      queryClient.invalidateQueries({ queryKey: ["voting-elections"] })
    }
  }, [session?.user?.id, queryClient])

  // Check if user is admin or branch manager (staff)
  const isStaffUser = session?.user?.role === "ADMIN" || session?.user?.role === "BRANCH_MANAGER"

  // For regular members, mark as submitted automatically
  useEffect(() => {
    if (session && !isStaffUser && !isMemberIdSubmitted) {
      setIsMemberIdSubmitted(true)
    }
  }, [session, isStaffUser, isMemberIdSubmitted])

  const { data: elections, isLoading: electionsLoading } = useQuery({
    queryKey: ["voting-elections", isStaffUser ? memberId : session?.user?.id],
    queryFn: () => getActiveElections(isStaffUser ? memberId : undefined),
    enabled: isStaffUser ? isMemberIdSubmitted : !!session?.user?.id,
    // Ensure fresh data for each user session
    staleTime: 0,
    gcTime: 0,
  })

  const { data: election, isLoading: electionLoading } = useQuery({
    queryKey: ["election", selectedElectionId],
    queryFn: () => getElection(selectedElectionId!),
    enabled: !!selectedElectionId,
  })

  // Auto-select first available election
  useEffect(() => {
    if (elections && !selectedElectionId && isMemberIdSubmitted) {
      const availableElections = elections.filter((e: any) => e.canVote)
      if (availableElections.length > 0) {
        setSelectedElectionId(availableElections[0].id)
      }
    }
  }, [elections, selectedElectionId, isMemberIdSubmitted])

  const voteMutation = useMutation({
    mutationFn: (data: { electionId: string; votes: Array<{ positionId: string; candidateId: string }> }) =>
      castVotes(isStaffUser ? { ...data, memberId } : data),
    onSuccess: () => {
      toast.success("Your votes have been cast successfully!")
      // Clear voting-related cached data but preserve session
      queryClient.invalidateQueries({ queryKey: ["voting-elections"] })
      queryClient.invalidateQueries({ queryKey: ["election"] })
      setSelectedElectionId(null)
      setSelectedCandidates({})
      // For staff users, reset member ID and go back to member ID input
      if (isStaffUser) {
        setMemberId("")
        setIsMemberIdSubmitted(false)
        toast.info("Ready for next voter")
      } else {
        // For regular members, redirect back to kiosk login
        router.push("/auth/kiosk")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cast votes")
    },
  })

  // Show member ID input for staff users
  if (isStaffUser && !isMemberIdSubmitted) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-12 text-center bg-white">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-700 mb-4">
                <User className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Enter Member ID</h2>
              <p className="text-gray-600">
                Please enter the Member ID for the person who will be voting.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (memberId.trim()) {
                  setIsMemberIdSubmitted(true)
                } else {
                  toast.error("Please enter a Member ID")
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="memberId">Member ID</Label>
                <Input
                  id="memberId"
                  type="text"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="MEM001"
                  className="text-lg"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full py-3 text-lg"
                style={{ backgroundColor: '#27ae60' }}
              >
                Continue to Voting
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (electionsLoading || electionLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Loading elections...</p>
      </div>
    )
  }

  if (!elections || elections.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-12 text-center bg-white">
          <p className="text-gray-600 text-lg">No active elections available for voting.</p>
        </CardContent>
      </Card>
    )
  }

  const availableElections = elections.filter((e: any) => e.canVote)

  if (availableElections.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-12 text-center bg-white">
          <p className="text-gray-600 text-lg">
            All available elections have been completed or are not yet open for voting.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!election) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Loading election details...</p>
      </div>
    )
  }

  if (election.status !== ElectionStatus.VOTING_ACTIVE) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-12 text-center bg-white">
          <p className="text-gray-600 text-lg">This election is not currently accepting votes.</p>
        </CardContent>
      </Card>
    )
  }

  const handleReviewVote = () => {
    if (!election.positions || election.positions.length === 0) {
      toast.error("No positions available in this election")
      return
    }

    // Validate all positions have selections
    const missingPositions: string[] = []
    for (const position of election.positions) {
      if (!selectedCandidates[position.id]) {
        missingPositions.push(position.title)
      }
    }

    if (missingPositions.length > 0) {
      toast.error(
        `Please select a candidate for: ${missingPositions.join(", ")}`
      )
      return
    }

    // Show review screen
    setShowReview(true)
  }

  const handleConfirmVote = async () => {
    setIsSubmitting(true)

    try {
      // Prepare all votes
      const votes = election.positions.map((position: any) => ({
        positionId: position.id,
        candidateId: selectedCandidates[position.id],
      }))

      // Cast all votes in a single batch request
      await voteMutation.mutateAsync({
        electionId: election.id,
        votes,
      })
    } catch (error) {
      // Error handling is done in mutation callbacks
      setIsSubmitting(false)
    }
  }

  const handleBackToVoting = () => {
    setShowReview(false)
  }

  // Show review screen if review mode is active
  if (showReview) {
    return (
      <div className="space-y-8">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 bg-white">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#2c3e50' }}>
                Review Your Votes
              </h2>
              <p className="text-gray-600">
                Please verify your selections before submitting your vote
              </p>
            </div>

            <div className="space-y-6">
              {election.positions?.map((position: any) => {
                const selectedCandidateId = selectedCandidates[position.id]
                const selectedCandidate = position.candidates?.find((c: any) => c.id === selectedCandidateId)

                return (
                  <div key={position.id} className="rounded-lg border p-6" style={{ borderColor: '#dee2e6' }}>
                    <h3 className="text-xl font-bold mb-4" style={{ color: '#2c3e50' }}>
                      {position.title}
                    </h3>

                    {selectedCandidate && (
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {selectedCandidate.imageUrl ? (
                            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2" style={{ borderColor: '#3498db' }}>
                              <Image
                                src={selectedCandidate.imageUrl}
                                alt={selectedCandidate.user?.name || "Candidate"}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2" style={{ borderColor: '#dee2e6' }}>
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg" style={{ color: '#2c3e50' }}>
                            {selectedCandidate.user?.name || selectedCandidate.user?.email || "Unknown"}
                          </p>
                          {selectedCandidate.bio && (
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedCandidate.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-4 pt-8">
              <Button
                onClick={handleBackToVoting}
                variant="outline"
                size="lg"
                className="flex-1 px-8 py-6 text-lg"
                style={{ borderColor: '#3498db', color: '#3498db' }}
                disabled={isSubmitting}
              >
                Go Back
              </Button>
              <Button
                onClick={handleConfirmVote}
                disabled={isSubmitting}
                size="lg"
                className="flex-1 px-8 py-6 text-lg"
                style={{ backgroundColor: '#27ae60', borderColor: '#27ae60' }}
              >
                {isSubmitting ? "Submitting..." : "Confirm Vote"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show voting interface
  return (
    <div className="space-y-8">
      {election.positions?.map((position: any) => (
        <Card key={position.id} className="border-0 shadow-md">
          <CardContent className="p-6 bg-white">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#2c3e50' }}>
                Vote for {position.title}
              </h2>
              <p className="text-gray-600">
                Select your candidate for this position
              </p>
            </div>

            {position.candidates && position.candidates.length > 0 ? (
              election.voteType === VoteType.SINGLE_CHOICE ? (
                <RadioGroup
                  value={selectedCandidates[position.id] || ""}
                  onValueChange={(value) =>
                    setSelectedCandidates((prev) => ({
                      ...prev,
                      [position.id]: value,
                    }))
                  }
                  className="space-y-4"
                >
                  {position.candidates
                    .filter((c: any) => c.status === "approved")
                    .map((candidate: any) => {
                      const candidateName = candidate.user?.name || candidate.user?.email || "Unknown"
                      const firstName = candidateName.split(' ')[0]

                      return (
                        <div
                          key={candidate.id}
                          className="flex items-start justify-between rounded-lg border p-5 hover:bg-blue-50 transition-colors"
                          style={{ borderColor: '#dee2e6' }}
                        >
                          <div className="flex items-start space-x-4 flex-1">
                            <RadioGroupItem
                              value={candidate.id}
                              id={`candidate-${candidate.id}`}
                              className="mt-1"
                            />
                            {/* Candidate Image */}
                            <div className="flex-shrink-0">
                              {candidate.imageUrl ? (
                                <div className="relative w-52 h-52 rounded-full overflow-hidden border-4" style={{ borderColor: '#3498db' }}>
                                  <Image
                                    src={candidate.imageUrl}
                                    alt={candidateName}
                                    fill
                                    className="object-cover"
                                    sizes="208px"
                                  />
                                </div>
                              ) : (
                                <div className="w-52 h-52 rounded-full bg-gray-200 flex items-center justify-center border-4" style={{ borderColor: '#dee2e6' }}>
                                  <User className="w-16 h-16 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <Label
                              htmlFor={`candidate-${candidate.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div>
                                <p className="font-bold text-xl mb-1" style={{ color: '#2c3e50' }}>
                                  {candidateName}
                                </p>
                                <p className="font-semibold text-base mb-1" style={{ color: '#2c3e50' }}>
                                  {candidateName}
                                </p>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                  {position.title}
                                </p>
                                {candidate.bio && (
                                  <p className="text-sm text-gray-600">
                                    {candidate.bio}
                                  </p>
                                )}
                                {candidate.qualifications && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {candidate.qualifications}
                                  </p>
                                )}
                              </div>
                            </Label>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedCandidates((prev) => ({
                                ...prev,
                                [position.id]: candidate.id,
                              }))
                            }
                            className="ml-4"
                            style={{
                              borderColor: '#3498db',
                              color: '#3498db',
                              backgroundColor: selectedCandidates[position.id] === candidate.id ? '#ebf5fb' : 'white'
                            }}
                          >
                            Vote for {firstName}
                          </Button>
                        </div>
                      )
                    })}
                </RadioGroup>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  {election.voteType.replace("_", " ")} voting not yet implemented
                </p>
              )
            ) : (
              <div className="rounded-lg border p-4 bg-gray-50" style={{ borderColor: '#dee2e6' }}>
                <p className="text-sm text-gray-500 italic">
                  No approved candidates available for this position
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="pt-6">
        <Button
          onClick={handleReviewVote}
          size="lg"
          className="w-full px-16 py-8 text-xl font-bold"
          style={{ backgroundColor: '#3498db' }}
        >
          VOTE
        </Button>
      </div>
    </div>
  )
}
