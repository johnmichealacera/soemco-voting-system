"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { User, Vote } from "lucide-react"
import { Carousel } from "@/components/ui/carousel"
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
  const activeElections = useMemo(
    () =>
      elections?.filter(
        (e: any) =>
          e.status === ElectionStatus.VOTING_ACTIVE ||
          e.status === ElectionStatus.RESULTS_CERTIFIED ||
          e.status === ElectionStatus.ANNOUNCED
      ) || [],
    [elections]
  )

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
  }, [elections, electionIdParam, activeElections, selectedElectionId, router])

  const { data: campaignData, isLoading: campaignLoading, error } = useQuery({
    queryKey: ["campaign-data", selectedElectionId],
    queryFn: () => getCampaignData(selectedElectionId!),
    enabled: !!selectedElectionId,
  })

  const [candidateCardMaxHeight, setCandidateCardMaxHeight] = useState<number | null>(null)

  // Keep all position carousels visually aligned even when bio/qualifications vary in length.
  // We measure the tallest candidate card in the DOM and then force a uniform height.
  useEffect(() => {
    if (campaignLoading) return

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-candidate-card="true"]')
    )
    if (cards.length === 0) return

    // Use requestAnimationFrame to ensure layout is complete.
    const raf = requestAnimationFrame(() => {
      const max = cards.reduce((acc, el) => Math.max(acc, el.offsetHeight), 0)
      if (max > 0) setCandidateCardMaxHeight(max)
    })

    return () => cancelAnimationFrame(raf)
  }, [campaignLoading, campaignData, selectedElectionId])

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
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex flex-col items-center text-center gap-2">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-slate-400 mb-1">
              Campaign Information
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {election.title}
            </h1>
            {election.description && (
              <p className="text-sm text-slate-400 mt-1">{election.description}</p>
            )}
          </div>
          {activeElections.length > 1 && (
            <div className="mt-2">
              <Select value={selectedElectionId || ""} onValueChange={handleElectionChange}>
                <SelectTrigger className="w-64 bg-slate-900 border-slate-700 text-white mx-auto">
                  <SelectValue placeholder="Select an election" />
                </SelectTrigger>
                <SelectContent>
                  {activeElections.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} ({e.status.replace("_", " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Positions */}
      <div className="px-3 py-4 lg:px-6 lg:py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {positions.map((position: any) => (
          <section key={position.id}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-blue-500/60 to-transparent" />
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-blue-400 shrink-0">
                {position.title}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-blue-500/60 to-transparent" />
            </div>
            {position.description && (
              <p className="text-xs text-slate-500 text-center mb-2">{position.description}</p>
            )}
            {position.candidates.length > 0 && (
              <p className="text-[11px] text-slate-500 text-center mb-3">
                {position.candidates.length} candidate{position.candidates.length !== 1 ? "s" : ""} running
              </p>
            )}

            {position.candidates.length > 0 ? (
              <div>
                <Carousel autoPlay autoPlayInterval={7000} className="w-full">
                  {position.candidates.map((candidate: any, index: number) => (
                  <div
                    key={candidate.id}
                          data-candidate-card="true"
                          className="group/card w-full grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-4 items-stretch bg-slate-900/60 border border-white/5 rounded-xl transition-all duration-300 ease-out hover:scale-[1.01] hover:bg-slate-900/90 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                          style={candidateCardMaxHeight ? { height: candidateCardMaxHeight } : undefined}
                  >
                    {/* Left: Image column */}
                    <div className="flex flex-col items-center justify-center bg-slate-900/80 p-3">
                      {candidate.imageUrl ? (
                        <div className="relative w-44 h-44 rounded-full overflow-hidden ring-2 ring-blue-500/50 ring-offset-2 ring-offset-slate-900 shadow-lg mb-3 transition-all duration-300 group-hover/card:ring-blue-400 group-hover/card:ring-offset-4 group-hover/card:shadow-blue-500/20 group-hover/card:shadow-xl">
                          <Image
                            src={candidate.imageUrl}
                            alt={candidate.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover/card:scale-110"
                            sizes="220px"
                          />
                        </div>
                      ) : (
                        <div className="w-44 h-44 rounded-full bg-slate-800 flex items-center justify-center ring-2 ring-slate-700 ring-offset-2 ring-offset-slate-900 mb-3 transition-all duration-300 group-hover/card:ring-blue-500/50 group-hover/card:ring-offset-4">
                          <User className="w-16 h-16 text-slate-500 transition-colors duration-300 group-hover/card:text-blue-400" />
                        </div>
                      )}
                      <h3 className="text-sm font-semibold text-white leading-tight text-center transition-colors duration-300 group-hover/card:text-blue-100">
                        {candidate.name}
                      </h3>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">
                        {index + 1} of {position.candidates.length}
                      </p>
                      {candidate.nominationDate && (
                        <p className="text-[10px] text-slate-600 mt-1">
                          Nominated{" "}
                          {new Date(candidate.nominationDate).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                      )}
                    </div>

                    {/* Right: Bio + Qualifications */}
                    <div className="p-3 custom-scrollbar text-center lg:text-left overflow-y-auto min-h-0 h-full flex flex-col">
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="space-y-3">
                          {candidate.bio && (
                            <p
                              className="text-sm text-slate-300 leading-relaxed whitespace-pre-line transition-colors duration-300 group-hover/card:text-slate-200"
                              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                            >
                              {candidate.bio}
                            </p>
                          )}
                          {candidate.qualifications && (
                            <p
                              className="text-xs text-slate-400 leading-relaxed whitespace-pre-line transition-colors duration-300 group-hover/card:text-slate-300"
                              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                            >
                              {candidate.qualifications}
                            </p>
                          )}
                          {!candidate.bio && !candidate.qualifications && (
                            <p className="text-sm text-slate-600 italic">No information provided.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                </Carousel>
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto mb-2 text-slate-700" />
                <p className="text-sm text-slate-600">No candidates announced yet.</p>
              </div>
            )}
          </section>
        ))}

        {positions.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className="text-slate-500">No positions available for this election.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
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
