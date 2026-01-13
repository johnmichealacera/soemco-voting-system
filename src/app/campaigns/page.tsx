"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { User, ArrowLeft, ArrowRight, Vote } from "lucide-react"
import { Carousel } from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ElectionStatus } from "@prisma/client"

async function getElections() {
  const res = await fetch("/api/elections/public")
  if (!res.ok) throw new Error("Failed to fetch elections")
  return res.json()
}

async function getCampaignData(electionId: string) {
  const res = await fetch(`/api/elections/${electionId}/campaign`)
  if (!res.ok) throw new Error("Failed to fetch campaign data")
  return res.json()
}

function CampaignContent() {
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
      e.status === ElectionStatus.RESULTS_CERTIFIED ||
      e.status === ElectionStatus.ANNOUNCED
  ) || []

  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(
    electionIdParam || null
  )

  // Update selectedElectionId when elections load or URL param changes
  useEffect(() => {
    if (electionIdParam) {
      setSelectedElectionId(electionIdParam)
    } else if (activeElections.length > 0 && !selectedElectionId) {
      const firstElectionId = activeElections[0].id
      setSelectedElectionId(firstElectionId)
      router.replace(`/campaigns?electionId=${firstElectionId}`, { scroll: false })
    }
  }, [elections, electionIdParam, activeElections, router])

  const { data: campaignData, isLoading: campaignLoading, error } = useQuery({
    queryKey: ["campaign-data", selectedElectionId],
    queryFn: () => getCampaignData(selectedElectionId!),
    enabled: !!selectedElectionId,
  })

  const handleElectionChange = (electionId: string) => {
    setSelectedElectionId(electionId)
    router.push(`/campaigns?electionId=${electionId}`, { scroll: false })
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
            <Vote className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg">
              No active elections available for campaigns.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading campaign information...</p>
        </div>
      </div>
    )
  }

  if (error || !campaignData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-red-600 text-lg">
              Error loading campaign data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { election, positions } = campaignData

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold" style={{ color: "#2c3e50" }}>
              Campaign Information
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
        </div>

        {/* Positions with Candidate Slideshows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {positions.map((position: any) => (
            <Card key={position.id} className="border-0 shadow-lg h-full">
              <CardHeader className="pb-1">
                <CardTitle className="text-lg text-center" style={{ color: "#2c3e50" }}>
                  {position.title}
                </CardTitle>
                {position.description && (
                  <p className="text-gray-600 text-center mt-1">
                    {position.description}
                  </p>
                )}
                {position.candidates.length > 0 && (
                  <p className="text-sm text-gray-500 text-center mt-1">
                    {position.candidates.length} candidate
                    {position.candidates.length !== 1 ? "s" : ""} running for this position
                  </p>
                )}
              </CardHeader>
              <CardContent className="p-1 h-full flex flex-col">
                {position.candidates.length > 0 ? (
                  <Carousel autoPlay={true} autoPlayInterval={5000} className="w-full flex-1">
                    {position.candidates.map((candidate: any, index: number) => (
                      <div
                        key={candidate.id}
                        className="flex flex-col items-center text-center p-2 bg-gradient-to-br from-white to-gray-50 rounded-lg min-h-[360px]"
                      >
                        {/* Candidate Image */}
                        <div className="flex justify-center mb-2">
                          {candidate.imageUrl ? (
                            <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 shadow-lg" style={{ borderColor: "#3498db" }}>
                              <Image
                                src={candidate.imageUrl}
                                alt={candidate.name}
                                fill
                                className="object-cover"
                                sizes="160px"
                              />
                            </div>
                          ) : (
                            <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center border-4 shadow-lg" style={{ borderColor: "#dee2e6" }}>
                              <User className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Candidate Information */}
                        <div className="space-y-2 w-full flex-1 flex flex-col justify-center">
                          <div>
                            <h4 className="text-lg font-bold" style={{ color: "#2c3e50" }}>
                              {candidate.name}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              Candidate {index + 1} of {position.candidates.length}
                            </p>
                          </div>

                          {candidate.bio && (
                            <div>
                              <p className="text-sm text-gray-700 leading-relaxed overflow-hidden" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {candidate.bio}
                              </p>
                            </div>
                          )}

                          {candidate.qualifications && (
                            <div>
                              <p className="text-xs text-gray-600 leading-relaxed overflow-hidden" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {candidate.qualifications}
                              </p>
                            </div>
                          )}

                          {candidate.nominationDate && (
                            <div className="pt-2 border-t border-gray-200 mt-auto">
                              <p className="text-xs text-gray-500">
                                Nominated {new Date(candidate.nominationDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </Carousel>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">
                      No candidates announced for this position yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {positions.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 text-lg">
                No positions available for this election.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function CampaignPage() {
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
      <CampaignContent />
    </Suspense>
  )
}
