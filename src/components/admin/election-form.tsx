"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ElectionStatus, VoteType } from "@prisma/client"
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

interface Election {
  id: string
  title: string
  description: string | null
  electionType: string
  status: ElectionStatus
  voteType: VoteType
  votingStartDate: Date | string
  votingEndDate: Date | string
  nominationStartDate: Date | string | null
  nominationEndDate: Date | string | null
}

interface ElectionFormProps {
  election?: Election | null
  open: boolean
  onClose: () => void
}

async function createElection(data: any) {
  const res = await fetch("/api/elections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create election")
  }
  return res.json()
}

async function updateElection(id: string, data: any) {
  const res = await fetch(`/api/elections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update election")
  }
  return res.json()
}

export function ElectionForm({ election, open, onClose }: ElectionFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!election

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    electionType: "",
    voteType: VoteType.SINGLE_CHOICE,
    votingStartDate: "",
    votingEndDate: "",
    nominationStartDate: "",
    nominationEndDate: "",
    status: ElectionStatus.DRAFT,
  })

  useEffect(() => {
    if (election) {
      setFormData({
        title: election.title,
        description: election.description || "",
        electionType: election.electionType,
        voteType: election.voteType as any,
        votingStartDate: election.votingStartDate
          ? new Date(election.votingStartDate).toISOString().slice(0, 16)
          : "",
        votingEndDate: election.votingEndDate
          ? new Date(election.votingEndDate).toISOString().slice(0, 16)
          : "",
        nominationStartDate: election.nominationStartDate
          ? new Date(election.nominationStartDate).toISOString().slice(0, 16)
          : "",
        nominationEndDate: election.nominationEndDate
          ? new Date(election.nominationEndDate).toISOString().slice(0, 16)
          : "",
        status: election.status as any,
      })
    } else {
      setFormData({
        title: "",
        description: "",
        electionType: "",
        voteType: VoteType.SINGLE_CHOICE,
        votingStartDate: "",
        votingEndDate: "",
        nominationStartDate: "",
        nominationEndDate: "",
        status: ElectionStatus.DRAFT,
      })
    }
  }, [election, open])

  const createMutation = useMutation({
    mutationFn: createElection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] })
      toast.success("Election created successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateElection(election!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] })
      toast.success("Election updated successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      title: formData.title,
      description: formData.description || null,
      electionType: formData.electionType,
      voteType: formData.voteType,
      votingStartDate: formData.votingStartDate,
      votingEndDate: formData.votingEndDate,
      nominationStartDate: formData.nominationStartDate || null,
      nominationEndDate: formData.nominationEndDate || null,
      ...(isEditing && { status: formData.status }),
    }

    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: '#2c3e50' }}>
            {isEditing ? "Edit Election" : "Create New Election"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the election details below."
              : "Fill in the details to create a new election."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="e.g., Board of Directors Election 2024"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Election description..."
              />
            </div>

            {/* <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="electionType">Election Type *</Label>
                <Input
                  id="electionType"
                  value={formData.electionType}
                  onChange={(e) =>
                    setFormData({ ...formData, electionType: e.target.value })
                  }
                  required
                  placeholder="e.g., Board Elections"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="voteType">Vote Type *</Label>
                <Select
                  value={formData.voteType}
                  onValueChange={(value: VoteType) =>
                    setFormData({ ...formData, voteType: value })
                  }
                >
                  <SelectTrigger id="voteType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VoteType.SINGLE_CHOICE}>
                      Single Choice
                    </SelectItem>
                    <SelectItem value={VoteType.RANKED_CHOICE}>
                      Ranked Choice
                    </SelectItem>
                    <SelectItem value={VoteType.APPROVAL_VOTING}>
                      Approval Voting
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div> */}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="votingStartDate">Voting Start Date *</Label>
                <Input
                  id="votingStartDate"
                  type="datetime-local"
                  value={formData.votingStartDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      votingStartDate: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="votingEndDate">Voting End Date *</Label>
                <Input
                  id="votingEndDate"
                  type="datetime-local"
                  value={formData.votingEndDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      votingEndDate: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            {/* <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nominationStartDate">Nomination Start Date</Label>
                <Input
                  id="nominationStartDate"
                  type="datetime-local"
                  value={formData.nominationStartDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nominationStartDate: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nominationEndDate">Nomination End Date</Label>
                <Input
                  id="nominationEndDate"
                  type="datetime-local"
                  value={formData.nominationEndDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nominationEndDate: e.target.value,
                    })
                  }
                />
              </div>
            </div> */}

            {isEditing && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: ElectionStatus) =>
                    setFormData({ ...formData, status: value as any })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ElectionStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={ElectionStatus.ANNOUNCED}>
                      Announced
                    </SelectItem>
                    <SelectItem value={ElectionStatus.VOTING_ACTIVE}>
                      Voting Active
                    </SelectItem>
                    <SelectItem value={ElectionStatus.VOTING_CLOSED}>
                      Voting Closed
                    </SelectItem>
                    <SelectItem value={ElectionStatus.RESULTS_CERTIFIED}>
                      Results Certified
                    </SelectItem>
                    <SelectItem value={ElectionStatus.CANCELLED}>
                      Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
                ? "Update Election"
                : "Create Election"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

