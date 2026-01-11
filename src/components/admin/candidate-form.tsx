"use client"

import { useState, useEffect, useMemo } from "react"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

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
  // Fetch all members by using a large pageSize
  const res = await fetch("/api/members?pageSize=10000")
  if (!res.ok) throw new Error("Failed to fetch members")
  const data = await res.json()
  // Handle paginated response structure
  return data.members || data
}

async function fetchCandidates(): Promise<Candidate[]> {
  const res = await fetch("/api/candidates")
  if (!res.ok) throw new Error("Failed to fetch candidates")
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

  const { data: candidates } = useQuery({
    queryKey: ["candidates"],
    queryFn: fetchCandidates,
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

  // Search state for member dropdown
  const [memberSearchOpen, setMemberSearchOpen] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState("")

  // Filter members based on search query and exclude existing candidates
  const filteredMembers = useMemo(() => {
    if (!members || !Array.isArray(members)) return []

    // Get list of user IDs that are already candidates (exclude current candidate if editing)
    const existingCandidateUserIds = new Set(
      (candidates || [])
        .filter((c: Candidate) => isEditing ? c.id !== candidate?.id : true)
        .map((c: Candidate) => c.userId)
    )

    // Filter out members who are already candidates
    let availableMembers = members.filter(
      (member: any) => !existingCandidateUserIds.has(member.userId)
    )

    // Apply search filter if there's a search query
    if (memberSearchQuery.trim()) {
      const query = memberSearchQuery.toLowerCase().trim()
      availableMembers = availableMembers.filter((member: any) => {
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
        const email = member.user?.email?.toLowerCase() || ""
        const displayName = member.user?.name?.toLowerCase() || ""
        const memberId = member.memberId?.toLowerCase() || ""
        return (
          fullName.includes(query) ||
          email.includes(query) ||
          displayName.includes(query) ||
          memberId.includes(query)
        )
      })
    }

    return availableMembers
  }, [members, memberSearchQuery, candidates, isEditing, candidate])

  // Get selected member display name
  const selectedMember = useMemo(() => {
    if (!formData.userId || !members) return null
    return members.find((m) => m.userId === formData.userId)
  }, [formData.userId, members])

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

  // Reset member search when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setMemberSearchOpen(false)
      setMemberSearchQuery("")
    }
  }, [open])

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
                  <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={memberSearchOpen}
                        className="w-full justify-between h-10"
                        id="userId"
                      >
                        {selectedMember
                          ? `${selectedMember.user?.name || `${selectedMember.firstName} ${selectedMember.lastName}`} (${selectedMember.user?.email})`
                          : "Select a member..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[400px] p-0" 
                      align="start" 
                      side="bottom" 
                      sideOffset={4}
                      avoidCollisions={false}
                    >
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, email, or member ID..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {filteredMembers && filteredMembers.length > 0 ? (
                          filteredMembers.map((member) => (
                            <div
                              key={member.userId}
                              className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm outline-none transition-colors border border-transparent hover:border-slate-200 hover:bg-slate-50",
                                formData.userId === member.userId && "bg-blue-50 border-blue-200"
                              )}
                              onClick={() => {
                                setFormData({ ...formData, userId: member.userId })
                                setMemberSearchOpen(false)
                                setMemberSearchQuery("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-3 h-4 w-4 flex-shrink-0 transition-opacity",
                                  formData.userId === member.userId
                                    ? "opacity-100 text-blue-600"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground truncate">
                                  {member.user?.name || `${member.firstName} ${member.lastName}`}
                                </div>
                                <div className="text-xs text-slate-600 truncate">
                                  {member.user?.email}
                                  {(member as any).memberId && ` • ${(member as any).memberId}`}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {memberSearchQuery
                              ? "No members found matching your search."
                              : "No members available."}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
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

