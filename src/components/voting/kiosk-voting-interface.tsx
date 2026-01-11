"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { VoteType, ElectionStatus } from "@prisma/client"

async function getActiveElections() {
  const res = await fetch("/api/voting/elections")
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
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null)
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, string>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: elections, isLoading: electionsLoading } = useQuery({
    queryKey: ["voting-elections"],
    queryFn: getActiveElections,
  })

  const { data: election, isLoading: electionLoading } = useQuery({
    queryKey: ["election", selectedElectionId],
    queryFn: () => getElection(selectedElectionId!),
    enabled: !!selectedElectionId,
  })

  // Auto-select first available election
  useEffect(() => {
    if (elections && !selectedElectionId) {
      const availableElections = elections.filter((e: any) => e.canVote)
      if (availableElections.length > 0) {
        setSelectedElectionId(availableElections[0].id)
      }
    }
  }, [elections, selectedElectionId])

  const voteMutation = useMutation({
    mutationFn: castVotes,
    onSuccess: () => {
      toast.success("Your votes have been cast successfully!")
      queryClient.invalidateQueries({ queryKey: ["elections"] })
      queryClient.invalidateQueries({ queryKey: ["voting-elections"] })
      setSelectedElectionId(null)
      setSelectedCandidates({})
      // Redirect back to kiosk login after successful vote
      setTimeout(() => {
        router.push("/auth/kiosk")
      }, 3000)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cast votes")
    },
  })

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

  const handleVote = async () => {
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

      <div className="flex justify-center gap-4 pt-6">
        <Button
          onClick={handleVote}
          disabled={isSubmitting}
          size="lg"
          className="px-8 py-6 text-lg"
          style={{ backgroundColor: '#3498db' }}
        >
          {isSubmitting ? "Submitting..." : "Submit Vote"}
        </Button>
      </div>
    </div>
  )
}
