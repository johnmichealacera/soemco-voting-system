"use client"

import { useQuery } from "@tanstack/react-query"
import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { BarChart3, UserCircle, Users, Vote, Loader2, Building2, ChevronDown, FileDown } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { downloadCSV, downloadExcel, downloadExcelMulti, type ExportRow } from "@/lib/export-report"

type TabId = "members" | "candidates" | "results"

interface Branch {
  id: string
  name: string
  code: string
}

interface MemberReport {
  id: string
  memberId: string
  firstName: string
  lastName: string
  middleName: string | null
  branchId: string | null
  status: string
  membershipDate: string
  user: { email: string; name: string | null; role: string }
  branch?: { id: string; name: string; code: string } | null
  _count: { votes: number }
}

interface Election {
  id: string
  title: string
  status: string
  positions: Array<{
    id: string
    title: string
    candidates: Array<{
      id: string
      status: string
      user: { name: string | null; email: string }
    }>
  }>
}

interface CandidateBranchVotes {
  branchId: string
  branchName: string
  branchCode: string
  votes: number
}

/** Voters who cast a ballot for this candidate (coop member ID + branch), recount/audit — API returns for staff only */
interface ResultVoter {
  memberId: string
  branchId: string | null
}

interface ElectionResultsResponse {
  election: { id: string; title: string; status: string }
  results: Array<{
    id: string
    title: string
    totalVotes: number
    totalEligibleMembers: number
    participationRate: number
    candidates: Array<{
      id: string
      name: string
      voteCount: number
      percentage: number
      branchBreakdown?: CandidateBranchVotes[]
      voters?: ResultVoter[]
    }>
  }>
  summary: {
    totalVotes: number
    totalEligibleMembers: number
    overallParticipationRate: number
  }
  branchBreakdown: Array<{
    id: string
    name: string
    code: string
    totalVotes: number
    totalMembers: number
    participationRate: number
  }>
}

async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/branches")
  if (!res.ok) throw new Error("Failed to fetch branches")
  return res.json()
}

async function fetchMembersReport(branchIds: string[]): Promise<{ members: MemberReport[]; total: number }> {
  const params = new URLSearchParams()
  if (branchIds.length > 0) params.set("branchIds", branchIds.join(","))
  const res = await fetch(`/api/reports/members?${params.toString()}`)
  if (!res.ok) throw new Error("Failed to fetch members report")
  return res.json()
}

async function fetchElections(): Promise<Election[]> {
  const res = await fetch("/api/elections")
  if (!res.ok) throw new Error("Failed to fetch elections")
  return res.json()
}

async function fetchElectionResults(electionId: string): Promise<ElectionResultsResponse> {
  const res = await fetch(`/api/elections/${electionId}/results`)
  if (!res.ok) throw new Error("Failed to fetch election results")
  return res.json()
}

export function ReportsContent() {
  const [activeTab, setActiveTab] = useState<TabId>("members")
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])
  const [branchPopoverOpen, setBranchPopoverOpen] = useState(false)
  const [selectedElectionId, setSelectedElectionId] = useState<string>("")
  const [selectedResultsElectionId, setSelectedResultsElectionId] = useState<string>("")
  const [selectedResultsBranchId, setSelectedResultsBranchId] = useState<string>("")

  const { data: branches = [] } = useQuery({
    queryKey: ["report-branches"],
    queryFn: fetchBranches,
  })

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["report-members", selectedBranchIds],
    queryFn: () => fetchMembersReport(selectedBranchIds),
    enabled: activeTab === "members",
  })

  const { data: elections = [], isLoading: electionsLoading } = useQuery({
    queryKey: ["report-elections"],
    queryFn: fetchElections,
    enabled: activeTab === "candidates" || activeTab === "results",
  })

  const { data: electionResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["report-results", selectedResultsElectionId],
    queryFn: () => fetchElectionResults(selectedResultsElectionId),
    enabled: activeTab === "results" && !!selectedResultsElectionId,
  })

  const selectedElection = useMemo(
    () => elections.find((e) => e.id === selectedElectionId),
    [elections, selectedElectionId]
  )

  const candidatesFlat = useMemo(() => {
    if (!selectedElection) return []
    const list: Array<{
      positionTitle: string
      candidateName: string
      candidateEmail: string
      status: string
    }> = []
    for (const pos of selectedElection.positions) {
      for (const c of pos.candidates) {
        list.push({
          positionTitle: pos.title,
          candidateName: c.user?.name || "—",
          candidateEmail: c.user?.email || "—",
          status: c.status,
        })
      }
    }
    return list
  }, [selectedElection])

  // Election results filtered by branch (when selectedResultsBranchId is set)
  const filteredResultsData = useMemo(() => {
    if (!electionResults) {
      return {
        results: [],
        summary: { totalVotes: 0, totalEligibleMembers: 0, overallParticipationRate: 0 },
        branchBreakdown: [] as ElectionResultsResponse["branchBreakdown"],
      }
    }
    const branchId = selectedResultsBranchId || null
    const branchBreakdown = electionResults.branchBreakdown ?? []

    if (!branchId) {
      return {
        results: electionResults.results,
        summary: electionResults.summary,
        branchBreakdown,
      }
    }

    const filterVotersForBranch = (voters: ResultVoter[] | undefined): ResultVoter[] | undefined => {
      if (!voters?.length) return voters
      if (branchId === "unassigned") {
        return voters.filter((v) => v.branchId == null)
      }
      return voters.filter((v) => v.branchId === branchId)
    }

    const results = electionResults.results.map((pos) => {
      const candidatesWithBranchVotes = pos.candidates.map((c) => {
        const branchVotes = c.branchBreakdown?.find((b) => b.branchId === branchId)?.votes ?? 0
        return { ...c, branchFilteredVotes: branchVotes }
      })
      const positionTotal = candidatesWithBranchVotes.reduce((sum, c) => sum + c.branchFilteredVotes, 0)
      const candidates = candidatesWithBranchVotes.map((c) => ({
        ...c,
        voteCount: c.branchFilteredVotes,
        percentage: positionTotal > 0 ? Math.round((c.branchFilteredVotes / positionTotal) * 100 * 100) / 100 : 0,
        voters: filterVotersForBranch(c.voters),
      }))
      const branchRow = branchBreakdown.find((b) => b.id === branchId)
      const totalEligible = branchRow?.totalMembers ?? 0
      const participationRate = totalEligible > 0 ? Math.round((positionTotal / totalEligible) * 100 * 100) / 100 : 0
      return {
        ...pos,
        totalVotes: positionTotal,
        totalEligibleMembers: totalEligible,
        participationRate,
        candidates,
      }
    })

    const branchRow = branchBreakdown.find((b) => b.id === branchId)
    const summary = branchRow
      ? {
          totalVotes: branchRow.totalVotes,
          totalEligibleMembers: branchRow.totalMembers,
          overallParticipationRate: branchRow.participationRate,
        }
      : electionResults.summary

    const filteredBranchBreakdown = branchId ? branchBreakdown.filter((b) => b.id === branchId) : branchBreakdown

    return { results, summary, branchBreakdown: filteredBranchBreakdown }
  }, [electionResults, selectedResultsBranchId])

  const tabs: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
    { id: "members", label: "Members", icon: UserCircle },
    { id: "candidates", label: "Candidates", icon: Users },
    { id: "results", label: "Election Results", icon: Vote },
  ]

  function handleExportMembersCSV() {
    const rows: ExportRow[] = (membersData?.members ?? []).map((m) => ({
      "Member ID": m.memberId,
      Name: `${m.firstName} ${m.lastName}`.trim(),
      Email: m.user?.email ?? "",
      Branch: m.branch ? `${m.branch.name} (${m.branch.code})` : "—",
      Status: m.status,
      "Membership Date": formatDate(m.membershipDate),
      "Votes cast": m._count?.votes ?? 0,
    }))
    downloadCSV(rows, "members-report.csv")
  }

  function handleExportMembersExcel() {
    const rows: ExportRow[] = (membersData?.members ?? []).map((m) => ({
      "Member ID": m.memberId,
      Name: `${m.firstName} ${m.lastName}`.trim(),
      Email: m.user?.email ?? "",
      Branch: m.branch ? `${m.branch.name} (${m.branch.code})` : "—",
      Status: m.status,
      "Membership Date": formatDate(m.membershipDate),
      "Votes cast": m._count?.votes ?? 0,
    }))
    downloadExcel(rows, "Members", "members-report.xlsx")
  }

  function handleExportCandidatesCSV() {
    const rows: ExportRow[] = candidatesFlat.map((c) => ({
      Position: c.positionTitle,
      "Candidate Name": c.candidateName,
      Email: c.candidateEmail,
      Status: c.status,
    }))
    downloadCSV(rows, "candidates-report.csv")
  }

  function handleExportCandidatesExcel() {
    const rows: ExportRow[] = candidatesFlat.map((c) => ({
      Position: c.positionTitle,
      "Candidate Name": c.candidateName,
      Email: c.candidateEmail,
      Status: c.status,
    }))
    const title = selectedElection?.title?.replace(/[^\w\s-]/g, "")?.slice(0, 25) ?? "Candidates"
    downloadExcel(rows, title, "candidates-report.xlsx")
  }

  function handleExportResultsCSV() {
    const summary = filteredResultsData.summary
    if (!summary) return
    const rows: ExportRow[] = []
    const branches = electionResults?.branchBreakdown ?? []
    for (const pos of filteredResultsData.results) {
      for (const c of pos.candidates) {
        const row: ExportRow = {
          Position: pos.title,
          Candidate: c.name,
          Votes: c.voteCount,
          "Percentage (%)": c.percentage,
        }
        if (c.voters?.length) {
          row["Voter member IDs"] = c.voters.map((v) => v.memberId).join("; ")
        }
        for (const b of branches) {
          row[`Votes (${b.name})`] = c.branchBreakdown?.find((br) => br.branchId === b.id)?.votes ?? 0
        }
        rows.push(row)
      }
    }
    downloadCSV(rows, "election-results-report.csv")
  }

  function handleExportResultsExcel() {
    const summary = filteredResultsData.summary
    if (!summary) return
    const summaryRows: ExportRow[] = [
      { Metric: "Total votes", Value: summary.totalVotes },
      { Metric: "Eligible members", Value: summary.totalEligibleMembers },
      { Metric: "Participation (%)", Value: summary.overallParticipationRate },
    ]
    const branches = electionResults?.branchBreakdown ?? []
    const byPositionRows: ExportRow[] = []
    for (const pos of filteredResultsData.results) {
      for (const c of pos.candidates) {
        const row: ExportRow = {
          Position: pos.title,
          Candidate: c.name,
          Votes: c.voteCount,
          "Percentage (%)": c.percentage,
        }
        if (c.voters?.length) {
          row["Voter member IDs"] = c.voters.map((v) => v.memberId).join("; ")
        }
        for (const b of branches) {
          row[`Votes (${b.name})`] = c.branchBreakdown?.find((br) => br.branchId === b.id)?.votes ?? 0
        }
        byPositionRows.push(row)
      }
    }
    const byBranchRows: ExportRow[] = filteredResultsData.branchBreakdown.map((b) => ({
      Branch: b.name,
      Code: b.code,
      "Total votes": b.totalVotes,
      "Eligible members": b.totalMembers,
      "Participation (%)": b.participationRate,
    }))
    const title = electionResults?.election?.title?.replace(/[^\w\s-]/g, "")?.slice(0, 20) ?? "Results"
    downloadExcelMulti(
      [
        { name: "Summary", data: summaryRows },
        { name: "By Position", data: byPositionRows },
        { name: "By Branch", data: byBranchRows },
      ],
      `election-results-${title}.xlsx`
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="module-title text-3xl font-bold mb-0">Reports</h1>
        <p className="text-gray-600 mt-2">
          View member, candidate, and election result reports
        </p>
      </div>

      <div className="flex gap-2 border-b" style={{ borderColor: "#dee2e6" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={cn(
                "rounded-b-none border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {activeTab === "members" && (
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: "#dee2e6" }}>
            <CardTitle style={{ color: "#2c3e50" }}>
              <UserCircle className="inline mr-2 h-5 w-5" />
              Members Report
            </CardTitle>
            <CardDescription>
              View members by branch. Select one or more branches, or leave all unchecked for &quot;All branches&quot;.
            </CardDescription>
            <div className="flex flex-wrap gap-2 items-center pt-2">
              <span className="text-sm text-gray-600">Branches:</span>
              <Popover open={branchPopoverOpen} onOpenChange={setBranchPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[280px] justify-between"
                    style={{ borderColor: "#dee2e6" }}
                  >
                    <span>
                      {selectedBranchIds.length === 0
                        ? "All branches"
                        : `${selectedBranchIds.length} branch(es) selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-2" align="start">
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {branches.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-gray-100"
                      >
                        <Checkbox
                          checked={selectedBranchIds.includes(b.id)}
                          onCheckedChange={(checked) => {
                            setSelectedBranchIds((prev) =>
                              checked ? [...prev, b.id] : prev.filter((id) => id !== b.id)
                            )
                          }}
                        />
                        <span className="text-sm">
                          {b.name} ({b.code})
                        </span>
                      </label>
                    ))}
                  </div>
                  {branches.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        setSelectedBranchIds([])
                        setBranchPopoverOpen(false)
                      }}
                    >
                      Clear (All branches)
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="bg-white p-6">
            {membersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <p className="text-sm text-gray-600">
                    Total: <strong>{membersData?.total ?? 0}</strong> member(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportMembersCSV}
                      disabled={!(membersData?.members?.length)}
                      style={{ borderColor: "#3498db", color: "#3498db" }}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportMembersExcel}
                      disabled={!(membersData?.members?.length)}
                      style={{ borderColor: "#3498db", color: "#3498db" }}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border overflow-x-auto" style={{ borderColor: "#dee2e6" }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Membership Date</TableHead>
                        <TableHead>Votes cast</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(membersData?.members ?? []).map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-sm">{m.memberId}</TableCell>
                          <TableCell>
                            {m.firstName} {m.lastName}
                          </TableCell>
                          <TableCell>{m.user?.email ?? "—"}</TableCell>
                          <TableCell>
                            {m.branch ? `${m.branch.name} (${m.branch.code})` : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.status === "ACTIVE" ? "default" : "secondary"}>
                              {m.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(m.membershipDate)}</TableCell>
                          <TableCell>{m._count?.votes ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "candidates" && (
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: "#dee2e6" }}>
            <CardTitle style={{ color: "#2c3e50" }}>
              <Users className="inline mr-2 h-5 w-5" />
              Candidates Report
            </CardTitle>
            <CardDescription>
              View candidates by election
            </CardDescription>
            <div className="flex flex-wrap gap-2 items-center pt-2">
              <span className="text-sm text-gray-600">Election:</span>
              <Select
                value={selectedElectionId}
                onValueChange={setSelectedElectionId}
              >
                <SelectTrigger className="w-[320px]">
                  <SelectValue placeholder="Select an election" />
                </SelectTrigger>
                <SelectContent>
                  {elections.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} ({e.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="bg-white p-6">
            {electionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !selectedElectionId ? (
              <p className="text-gray-500 py-8 text-center">Select an election to view candidates.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <p className="text-sm text-gray-600">
                    Total: <strong>{candidatesFlat.length}</strong> candidate(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCandidatesCSV}
                      disabled={!candidatesFlat.length}
                      style={{ borderColor: "#3498db", color: "#3498db" }}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCandidatesExcel}
                      disabled={!candidatesFlat.length}
                      style={{ borderColor: "#3498db", color: "#3498db" }}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border overflow-x-auto" style={{ borderColor: "#dee2e6" }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Candidate Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidatesFlat.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>{c.positionTitle}</TableCell>
                          <TableCell>{c.candidateName}</TableCell>
                          <TableCell>{c.candidateEmail}</TableCell>
                          <TableCell>
                            <Badge variant={c.status === "approved" ? "default" : "secondary"}>
                              {c.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "results" && (
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-white border-b" style={{ borderColor: "#dee2e6" }}>
            <CardTitle style={{ color: "#2c3e50" }}>
              <Vote className="inline mr-2 h-5 w-5" />
              Election Results
            </CardTitle>
            <CardDescription>
              View vote counts and participation by election
            </CardDescription>
            <div className="flex flex-wrap gap-4 items-center pt-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600">Election:</span>
                <Select
                  value={selectedResultsElectionId}
                  onValueChange={(id) => {
                    setSelectedResultsElectionId(id)
                    setSelectedResultsBranchId("")
                  }}
                >
                  <SelectTrigger className="w-[320px]">
                    <SelectValue placeholder="Select an election" />
                  </SelectTrigger>
                  <SelectContent>
                    {elections.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title} ({e.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {electionResults && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-gray-600">Branch:</span>
                  <Select
                    value={selectedResultsBranchId || "all"}
                    onValueChange={(v) => setSelectedResultsBranchId(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="All branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches</SelectItem>
                      {(electionResults.branchBreakdown ?? []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.code || "—"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="bg-white p-6">
            {electionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !selectedResultsElectionId ? (
              <p className="text-gray-500 py-8 text-center">Select an election to view results.</p>
            ) : resultsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !electionResults ? (
              <p className="text-gray-500 py-8 text-center">No results data.</p>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-end gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportResultsCSV}
                    style={{ borderColor: "#3498db", color: "#3498db" }}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportResultsExcel}
                    style={{ borderColor: "#3498db", color: "#3498db" }}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg border p-4" style={{ borderColor: "#dee2e6" }}>
                    <p className="text-sm text-gray-600">Total votes</p>
                    <p className="text-2xl font-semibold" style={{ color: "#2c3e50" }}>
                      {filteredResultsData.summary?.totalVotes ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4" style={{ borderColor: "#dee2e6" }}>
                    <p className="text-sm text-gray-600">Eligible members</p>
                    <p className="text-2xl font-semibold" style={{ color: "#2c3e50" }}>
                      {filteredResultsData.summary?.totalEligibleMembers ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4" style={{ borderColor: "#dee2e6" }}>
                    <p className="text-sm text-gray-600">Participation</p>
                    <p className="text-2xl font-semibold" style={{ color: "#2c3e50" }}>
                      {filteredResultsData.summary?.overallParticipationRate ?? 0}%
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3" style={{ color: "#2c3e50" }}>
                    By position
                  </h3>
                  {(electionResults.branchBreakdown ?? []).length > 0 && (
                    <p className="text-sm text-gray-600 mb-2">
                      Votes per candidate include a breakdown by branch below.
                    </p>
                  )}
                  {filteredResultsData.results.map((pos) => {
                    const branchesForColumns = electionResults.branchBreakdown ?? []
                    const showVoterIds = pos.candidates.some((c) => c.voters && c.voters.length > 0)
                    return (
                      <div key={pos.id} className="mb-6">
                        <h4 className="text-md font-medium text-gray-700 mb-2">
                          {pos.title} — {pos.totalVotes} votes ({pos.participationRate}% participation)
                        </h4>
                        {showVoterIds && (
                          <p className="text-xs text-gray-500 mb-2">
                            Voter member IDs (coop ID) list who voted for each candidate — for recount and audit. Staff
                            access only.
                          </p>
                        )}
                        <div className="rounded-md border overflow-x-auto" style={{ borderColor: "#dee2e6" }}>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Votes</TableHead>
                                <TableHead>Percentage</TableHead>
                                {showVoterIds && (
                                  <TableHead className="min-w-[200px] max-w-md">
                                    Voter member IDs
                                  </TableHead>
                                )}
                                {branchesForColumns.map((b) => (
                                  <TableHead key={b.id} title={`${b.name} (${b.code})`}>
                                    {b.name}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pos.candidates.map((c) => (
                                <TableRow key={c.id}>
                                  <TableCell>{c.name}</TableCell>
                                  <TableCell>{c.voteCount}</TableCell>
                                  <TableCell>{c.percentage}%</TableCell>
                                  {showVoterIds && (
                                    <TableCell className="align-top text-sm text-gray-700 max-w-md">
                                      {c.voters && c.voters.length > 0 ? (
                                        <div className="break-words whitespace-normal leading-relaxed">
                                          {c.voters.map((v) => v.memberId).join(", ")}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </TableCell>
                                  )}
                                  {branchesForColumns.map((b) => (
                                    <TableCell key={b.id}>
                                      {c.branchBreakdown?.find((br) => br.branchId === b.id)?.votes ?? 0}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {filteredResultsData.branchBreakdown.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3" style={{ color: "#2c3e50" }}>
                      <Building2 className="inline mr-2 h-5 w-5" />
                      By branch
                    </h3>
                    <div className="rounded-md border overflow-x-auto" style={{ borderColor: "#dee2e6" }}>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Branch</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Total votes</TableHead>
                            <TableHead>Eligible members</TableHead>
                            <TableHead>Participation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredResultsData.branchBreakdown.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell>{b.name}</TableCell>
                              <TableCell>{b.code}</TableCell>
                              <TableCell>{b.totalVotes}</TableCell>
                              <TableCell>{b.totalMembers}</TableCell>
                              <TableCell>{b.participationRate}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
