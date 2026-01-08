"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState } from "react"
import { VoteType, ElectionStatus } from "@prisma/client"

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

export function VotingInterface({ electionId }: { electionId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedCandidates, setSelectedCandidates] = useState<
    Record<string, string>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: election, isLoading } = useQuery({
    queryKey: ["election", electionId],
    queryFn: () => getElection(electionId),
  })

  const voteMutation = useMutation({
    mutationFn: castVotes,
    onSuccess: () => {
      toast.success("Your votes have been cast successfully!")
      queryClient.invalidateQueries({ queryKey: ["elections"] })
      queryClient.invalidateQueries({ queryKey: ["voting-elections"] })
      setTimeout(() => {
        router.push("/voting")
      }, 2000)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cast votes")
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">Loading...</h1>
        </div>
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center bg-white">
            <p className="text-gray-600">Loading election details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!election) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">Election Not Found</h1>
        </div>
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
            <CardTitle style={{ color: '#2c3e50' }}>Election Not Found</CardTitle>
            <CardDescription>
              The election you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (election.status !== ElectionStatus.VOTING_ACTIVE) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="module-title text-3xl font-bold mb-0">{election.title}</h1>
        </div>
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
            <CardTitle style={{ color: '#2c3e50' }}>Voting Not Available</CardTitle>
            <CardDescription>
              This election is not currently accepting votes. Status: {election.status.replace("_", " ")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
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
    <div className="space-y-6">
      <div>
        <h1 className="module-title text-3xl font-bold mb-0">{election.title}</h1>
        <p className="text-gray-600 mt-2">{election.description}</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="bg-white border-b" style={{ borderColor: '#dee2e6' }}>
          <CardTitle style={{ color: '#2c3e50' }}>Cast Your Vote</CardTitle>
          <CardDescription>
            Please select your preferred candidate for each position. Your vote
            is anonymous and cannot be changed once submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white space-y-6">
          {election.positions?.map((position: any) => (
            <div key={position.id} className="space-y-4 pb-6 border-b last:border-0" style={{ borderColor: '#dee2e6' }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: '#2c3e50' }}>{position.title}</h3>
                {position.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {position.description}
                  </p>
                )}
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
                  >
                    {position.candidates
                      .filter((c: any) => c.status === "approved")
                      .map((candidate: any) => (
                        <div
                          key={candidate.id}
                          className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-blue-50 transition-colors cursor-pointer"
                          style={{ borderColor: '#dee2e6' }}
                        >
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
                              <p className="font-semibold" style={{ color: '#2c3e50' }}>
                                {candidate.user?.name || candidate.user?.email || "Unknown"}
                              </p>
                              {candidate.bio && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
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
                      ))}
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
            </div>
          ))}

          <div className="flex justify-end gap-4 pt-4 border-t" style={{ borderColor: '#dee2e6' }}>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button 
              onClick={handleVote} 
              disabled={isSubmitting}
              style={{ backgroundColor: '#3498db' }}
            >
              {isSubmitting ? "Submitting..." : "Submit Vote"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

