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

interface Position {
  id: string
  electionId: string | null
  title: string
  description: string | null
  order: number
  election: {
    id: string
    title: string
  } | null
}

interface PositionFormProps {
  position?: Position | null
  open: boolean
  onClose: () => void
}

interface Election {
  id: string
  title: string
  status: string
}

async function fetchElections(): Promise<Election[]> {
  const res = await fetch("/api/elections")
  if (!res.ok) throw new Error("Failed to fetch elections")
  return res.json()
}

async function createPosition(data: any) {
  const res = await fetch("/api/positions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create position")
  }
  return res.json()
}

async function updatePosition(id: string, data: any) {
  const res = await fetch(`/api/positions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update position")
  }
  return res.json()
}

export function PositionForm({ position, open, onClose }: PositionFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!position

  const { data: elections } = useQuery({
    queryKey: ["elections"],
    queryFn: fetchElections,
    enabled: open,
  })

  const [formData, setFormData] = useState({
    electionId: "",
    title: "",
    description: "",
    order: 0,
  })

  useEffect(() => {
    if (position) {
      setFormData({
        electionId: position.electionId || "",
        title: position.title,
        description: position.description || "",
        order: position.order,
      })
    } else {
      setFormData({
        electionId: "",
        title: "",
        description: "",
        order: 0,
      })
    }
  }, [position, open])

  const createMutation = useMutation({
    mutationFn: createPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] })
      toast.success("Position created successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updatePosition(position!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] })
      toast.success("Position updated successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: any = {
      title: formData.title,
      description: formData.description || null,
      order: formData.order,
      electionId: formData.electionId && formData.electionId !== "None Selected" 
        ? formData.electionId 
        : null,
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
            {isEditing ? "Edit Position" : "Create New Position"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the position details below."
              : "Fill in the details to create a new position."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="electionId">Election (Optional)</Label>
              <Select
                value={formData.electionId}
                onValueChange={(value) =>
                  setFormData({ ...formData, electionId: value === "" ? "" : value })
                }
              >
                <SelectTrigger id="electionId">
                  <SelectValue placeholder="Select an election (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None Selected">None (Standalone Position)</SelectItem>
                  {elections?.map((election) => (
                    <SelectItem key={election.id} value={election.id}>
                      {election.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Leave as &quot;None&quot; to create a standalone position that can be used across elections
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="e.g., President, Vice President, Secretary"
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
                placeholder="Position description and responsibilities..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                min="0"
                value={formData.order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Display order (0 = first)"
              />
              <p className="text-xs text-gray-500">
                Lower numbers appear first. Leave as 0 for automatic ordering.
              </p>
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
                ? "Update Position"
                : "Create Position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

