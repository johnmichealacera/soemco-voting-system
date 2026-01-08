"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Candidate {
  id: string
  electionId: string
  positionId: string
  userId: string
  status: string
  bio: string | null
  qualifications: string | null
  election: {
    id: string
    title: string
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
}

interface CandidateFormProps {
  candidate?: Candidate | null
  open: boolean
  onClose: () => void
}

interface Election {
  id: string
  title: string
  status: string
}

interface Position {
  id: string
  title: string
  electionId: string
}

interface Member {
  id: string
  userId: string
  firstName: string
  lastName: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

async function fetchElections(): Promise<Election[]> {
  const res = await fetch("/api/elections")
  if (!res.ok) throw new Error("Failed to fetch elections")
  return res.json()
}

async function fetchPositions(electionId: string): Promise<Position[]> {
  if (!electionId) return []
  const res = await fetch(`/api/elections/${electionId}`)
  if (!res.ok) throw new Error("Failed to fetch positions")
  const election = await res.json()
  return election.positions || []
}

async function fetchMembers(): Promise<Member[]> {
  const res = await fetch("/api/members")
  if (!res.ok) throw new Error("Failed to fetch members")
  return res.json()
}

async function createCandidate(data: any) {
  const res = await fetch("/api/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create candidate")
  }
  return res.json()
}

async function updateCandidate(id: string, data: any) {
  const res = await fetch(`/api/candidates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update candidate")
  }
  return res.json()
}

export function CandidateForm({ candidate, open, onClose }: CandidateFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!candidate

  const { data: elections } = useQuery({
    queryKey: ["elections"],
    queryFn: fetchElections,
    enabled: open,
  })

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
    enabled: open,
  })

  const [selectedElectionId, setSelectedElectionId] = useState("")
  const { data: positions } = useQuery({
    queryKey: ["positions", selectedElectionId],
    queryFn: () => fetchPositions(selectedElectionId),
    enabled: !!selectedElectionId && open,
  })

  const [formData, setFormData] = useState({
    electionId: "",
    positionId: "",
    userId: "",
    status: "pending",
    bio: "",
    qualifications: "",
  })

  useEffect(() => {
    if (candidate) {
      setFormData({
        electionId: candidate.electionId,
        positionId: candidate.positionId,
        userId: candidate.userId,
        status: candidate.status,
        bio: candidate.bio || "",
        qualifications: candidate.qualifications || "",
      })
      setSelectedElectionId(candidate.electionId)
    } else {
      setFormData({
        electionId: "",
        positionId: "",
        userId: "",
        status: "pending",
        bio: "",
        qualifications: "",
      })
      setSelectedElectionId("")
    }
  }, [candidate, open])

  // Update selectedElectionId when formData.electionId changes
  useEffect(() => {
    if (formData.electionId) {
      setSelectedElectionId(formData.electionId)
    }
  }, [formData.electionId])

  // Reset position when election changes
  useEffect(() => {
    if (!isEditing && formData.electionId) {
      setFormData((prev) => ({ ...prev, positionId: "" }))
    }
  }, [formData.electionId, isEditing])

  const createMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] })
      toast.success("Candidate created successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateCandidate(candidate!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] })
      toast.success("Candidate updated successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: any = {
      status: formData.status,
      bio: formData.bio || null,
      qualifications: formData.qualifications || null,
    }

    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      if (!formData.electionId || !formData.positionId || !formData.userId) {
        toast.error("Please fill in all required fields")
        return
      }
      data.electionId = formData.electionId
      data.positionId = formData.positionId
      data.userId = formData.userId
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: '#2c3e50' }}>
            {isEditing ? "Edit Candidate" : "Add New Candidate"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the candidate details below."
              : "Fill in the details to nominate a candidate for a position."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!isEditing && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="electionId">Election *</Label>
                  <Select
                    value={formData.electionId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, electionId: value, positionId: "" })
                    }
                  >
                    <SelectTrigger id="electionId">
                      <SelectValue placeholder="Select an election" />
                    </SelectTrigger>
                    <SelectContent>
                      {elections?.map((election) => (
                        <SelectItem key={election.id} value={election.id}>
                          {election.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="positionId">Position *</Label>
                  <Select
                    value={formData.positionId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, positionId: value })
                    }
                    disabled={!formData.electionId}
                  >
                    <SelectTrigger id="positionId">
                      <SelectValue placeholder="Select a position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions?.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formData.electionId && (
                    <p className="text-xs text-gray-500">
                      Please select an election first
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="userId">Member *</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, userId: value })
                    }
                  >
                    <SelectTrigger id="userId">
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.user.name || `${member.firstName} ${member.lastName}`} ({member.user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {isEditing && (
              <div className="grid gap-2 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold" style={{ color: '#2c3e50' }}>
                  Election: {candidate.election.title}
                </p>
                <p className="text-sm font-semibold" style={{ color: '#2c3e50' }}>
                  Position: {candidate.position.title}
                </p>
                <p className="text-sm font-semibold" style={{ color: '#2c3e50' }}>
                  Candidate: {candidate.user.name || candidate.user.email}
                </p>
                <p className="text-xs text-gray-500">
                  Election, position, and candidate cannot be changed after creation
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Candidate biography and background..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) =>
                  setFormData({ ...formData, qualifications: e.target.value })
                }
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Candidate qualifications and experience..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              style={{ backgroundColor: '#3498db' }}
              disabled={isLoading}
            >
              {isLoading
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                ? "Update Candidate"
                : "Create Candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

