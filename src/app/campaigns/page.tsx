"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { User, ArrowLeft, ArrowRight, Vote } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Carousel } from "@/components/ui/carousel"
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
        <div className="space-y-12">
          {positions.map((position: any) => (
            <Card key={position.id} className="border-0 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="text-3xl text-center" style={{ color: "#2c3e50" }}>
                  {position.title}
                </CardTitle>
                {position.description && (
                  <p className="text-gray-600 text-center mt-2">
                    {position.description}
                  </p>
                )}
                {position.candidates.length > 0 && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    {position.candidates.length} candidate
                    {position.candidates.length !== 1 ? "s" : ""} running for this position
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {position.candidates.length > 0 ? (
                  <Carousel autoPlay={true} autoPlayInterval={6000}>
                    {position.candidates.map((candidate: any) => (
                      <div
                        key={candidate.id}
                        className="w-full p-8 bg-gradient-to-br from-white to-gray-50 rounded-lg"
                      >
                        <div className="max-w-4xl mx-auto">
                          <div className="grid md:grid-cols-2 gap-8 items-center">
                            {/* Candidate Image */}
                            <div className="flex justify-center">
                              {candidate.imageUrl ? (
                                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 shadow-xl" style={{ borderColor: "#3498db" }}>
                                  <Image
                                    src={candidate.imageUrl}
                                    alt={candidate.name}
                                    fill
                                    className="object-cover"
                                    sizes="256px"
                                  />
                                </div>
                              ) : (
                                <div className="w-64 h-64 rounded-full bg-gray-200 flex items-center justify-center border-4 shadow-xl" style={{ borderColor: "#dee2e6" }}>
                                  <User className="w-32 h-32 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Candidate Information */}
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-3xl font-bold mb-2" style={{ color: "#2c3e50" }}>
                                  {candidate.name}
                                </h3>
                                <p className="text-lg text-gray-600 mb-4">
                                  Running for {position.title}
                                </p>
                              </div>

                              {candidate.bio && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                    Biography
                                  </h4>
                                  <p className="text-gray-700 leading-relaxed">
                                    {candidate.bio}
                                  </p>
                                </div>
                              )}

                              {candidate.qualifications && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                    Qualifications
                                  </h4>
                                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {candidate.qualifications}
                                  </p>
                                </div>
                              )}

                              {candidate.nominationDate && (
                                <div className="pt-4 border-t" style={{ borderColor: "#dee2e6" }}>
                                  <p className="text-sm text-gray-500">
                                    Nominated on{" "}
                                    {new Date(candidate.nominationDate).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
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
