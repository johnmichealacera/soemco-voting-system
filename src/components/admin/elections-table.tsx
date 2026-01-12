"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ElectionStatus, VoteType } from "@prisma/client"
import { formatDate, formatDateTime } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ElectionForm } from "./election-form"

interface Election {
  id: string
  title: string
  description: string | null
  electionType: string
  status: ElectionStatus
  voteType: VoteType
  isAnonymous: boolean
  votingStartDate: Date | string
  votingEndDate: Date | string
  nominationStartDate: Date | string | null
  nominationEndDate: Date | string | null
  createdAt: Date | string
  _count: {
    votes: number
    candidates: number
  }
}

async function fetchElections(): Promise<Election[]> {
  const res = await fetch("/api/elections")
  if (!res.ok) throw new Error("Failed to fetch elections")
  return res.json()
}

async function deleteElection(id: string) {
  const res = await fetch(`/api/elections/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete election")
  }
  return res.json()
}

async function updateElectionStatus(id: string, status: ElectionStatus) {
  const res = await fetch(`/api/elections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update election status")
  }
  return res.json()
}

async function toggleElectionAnonymity(id: string, isAnonymous: boolean) {
  const res = await fetch(`/api/elections/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isAnonymous }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to toggle election anonymity")
  }
  return res.json()
}

function getStatusBadge(status: ElectionStatus) {
  const statusConfig = {
    [ElectionStatus.DRAFT]: {
      label: "Draft",
      className: "bg-gray-100 text-gray-800 border-gray-300",
    },
    [ElectionStatus.ANNOUNCED]: {
      label: "Announced",
      className: "bg-blue-100 text-blue-800 border-blue-300",
    },
    [ElectionStatus.VOTING_ACTIVE]: {
      label: "Voting Active",
      className: "bg-green-100 text-green-800 border-green-300",
    },
    [ElectionStatus.VOTING_CLOSED]: {
      label: "Voting Closed",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    [ElectionStatus.RESULTS_CERTIFIED]: {
      label: "Results Certified",
      className: "bg-purple-100 text-purple-800 border-purple-300",
    },
    [ElectionStatus.CANCELLED]: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 border-red-300",
    },
  }

  const config = statusConfig[status] || statusConfig[ElectionStatus.DRAFT]

  return (
    <Badge
      variant="outline"
      className={`${config.className} border`}
    >
      {config.label}
    </Badge>
  )
}

export function ElectionsTable() {
  const queryClient = useQueryClient()
  const [editingElection, setEditingElection] = useState<Election | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data: elections, isLoading } = useQuery({
    queryKey: ["elections"],
    queryFn: fetchElections,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteElection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] })
      toast.success("Election deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ElectionStatus }) =>
      updateElectionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] })
      toast.success("Election status updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const anonymityMutation = useMutation({
    mutationFn: ({ id, isAnonymous }: { id: string; isAnonymous: boolean }) =>
      toggleElectionAnonymity(id, isAnonymous),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["elections"] })
      toast.success(`Election ${data.isAnonymous ? 'made anonymous' : 'revealed'}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleEdit = (election: Election) => {
    setEditingElection(election)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this election?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleStatusChange = (id: string, status: ElectionStatus) => {
    statusMutation.mutate({ id, status })
  }

  const handleToggleAnonymity = (id: string, isAnonymous: boolean) => {
    anonymityMutation.mutate({ id, isAnonymous })
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingElection(null)
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading elections...</p>
      </div>
    )
  }

  if (!elections || elections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No elections found. Create your first election to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              {/* <TableHead>Type</TableHead> */}
              <TableHead>Status</TableHead>
              <TableHead>Anonymity</TableHead>
              <TableHead>Voting Period</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead>Candidates</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {elections.map((election) => (
              <TableRow key={election.id}>
                <TableCell className="font-medium" style={{ color: '#2c3e50' }}>
                  {election.title}
                </TableCell>
                {/* <TableCell className="text-gray-600">
                  {election.electionType}
                </TableCell> */}
                <TableCell>{getStatusBadge(election.status)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      election.isAnonymous
                        ? "bg-orange-100 text-orange-800 border-orange-300"
                        : "bg-green-100 text-green-800 border-green-300"
                    }
                  >
                    {election.isAnonymous ? "Anonymous" : "Revealed"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  <div>{formatDate(election.votingStartDate)}</div>
                  <div className="text-xs">to {formatDate(election.votingEndDate)}</div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold" style={{ color: '#2c3e50' }}>
                    {election._count.votes}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold" style={{ color: '#2c3e50' }}>
                    {election._count.candidates}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDateTime(election.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(election)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          window.open(`/elections/${election.id}`, "_blank")
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleAnonymity(election.id, !election.isAnonymous)}
                      >
                        {election.isAnonymous ? (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Reveal Results
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Make Anonymous
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusChange(
                            election.id,
                            ElectionStatus.VOTING_ACTIVE
                          )
                        }
                        disabled={election.status === ElectionStatus.VOTING_ACTIVE}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activate Voting
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusChange(
                            election.id,
                            ElectionStatus.VOTING_CLOSED
                          )
                        }
                        disabled={election.status === ElectionStatus.VOTING_CLOSED}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Close Voting
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(election.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isFormOpen && (
        <ElectionForm
          election={editingElection}
          open={isFormOpen}
          onClose={handleFormClose}
        />
      )}
    </>
  )
}

