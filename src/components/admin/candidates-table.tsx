"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDate } from "@/lib/utils"
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
import { MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, UserMinus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CandidateForm } from "./candidate-form"

interface Candidate {
  id: string
  electionId: string
  positionId: string
  userId: string
  imageUrl: string | null
  nominationDate: Date | string
  status: string
  bio: string | null
  qualifications: string | null
  createdAt: Date | string
  election: {
    id: string
    title: string
    status: string
  }
  position: {
    id: string
    title: string
  }
  user: {
    id: string
    email: string
    name: string | null
  }
  _count: {
    votes: number
  }
}

async function fetchCandidates(): Promise<Candidate[]> {
  const res = await fetch("/api/candidates")
  if (!res.ok) throw new Error("Failed to fetch candidates")
  return res.json()
}

async function deleteCandidate(id: string) {
  const res = await fetch(`/api/candidates/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete candidate")
  }
  return res.json()
}

async function updateCandidateStatus(id: string, status: string) {
  const res = await fetch(`/api/candidates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update candidate status")
  }
  return res.json()
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-800 border-green-300",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-100 text-red-800 border-red-300",
    },
    withdrawn: {
      label: "Withdrawn",
      className: "bg-gray-100 text-gray-800 border-gray-300",
    },
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <Badge variant="outline" className={`${config.className} border`}>
      {config.label}
    </Badge>
  )
}

export function CandidatesTable() {
  const queryClient = useQueryClient()
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: fetchCandidates,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] })
      toast.success("Candidate deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateCandidateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] })
      toast.success("Candidate status updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this candidate?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleStatusChange = (id: string, status: string) => {
    statusMutation.mutate({ id, status })
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingCandidate(null)
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading candidates...</p>
      </div>
    )
  }

  if (!candidates || candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          No candidates found. Add your first candidate to get started.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Election</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead>Nominated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell>
                  <div>
                    <div className="font-medium" style={{ color: '#2c3e50' }}>
                      {candidate.user.name || candidate.user.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {candidate.user.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm" style={{ color: '#2c3e50' }}>
                    {candidate.election.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {candidate.election.status}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">
                  {candidate.position.title}
                </TableCell>
                <TableCell>{getStatusBadge(candidate.status)}</TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold" style={{ color: '#2c3e50' }}>
                    {candidate._count.votes}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(candidate.nominationDate)}
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
                      <DropdownMenuItem onClick={() => handleEdit(candidate)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusChange(candidate.id, "approved")
                        }
                        disabled={candidate.status === "approved"}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusChange(candidate.id, "rejected")
                        }
                        disabled={candidate.status === "rejected"}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusChange(candidate.id, "withdrawn")
                        }
                        disabled={candidate.status === "withdrawn"}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Withdraw
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          window.open(`/elections/${candidate.electionId}`, "_blank")
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Election
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(candidate.id)}
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
        <CandidateForm
          candidate={editingCandidate}
          open={isFormOpen}
          onClose={handleFormClose}
        />
      )}
    </>
  )
}

