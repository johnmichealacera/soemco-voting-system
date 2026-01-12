"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface Branch {
  id: string
  name: string
  code: string
  address: string | null
  phoneNumber: string | null
  isActive: boolean
  managerId: string | null
  manager?: {
    id: string
    name: string | null
    email: string
  } | null
}

interface User {
  id: string
  name: string | null
  email: string
}

interface BranchFormProps {
  branch?: Branch | null
  open: boolean
  onClose: () => void
}

async function fetchBranchManagers(): Promise<User[]> {
  const res = await fetch("/api/users/managers")
  if (!res.ok) throw new Error("Failed to fetch branch managers")
  return res.json()
}

async function createBranch(data: any) {
  const res = await fetch("/api/branches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create branch")
  }
  return res.json()
}

async function updateBranch(id: string, data: any) {
  const res = await fetch(`/api/branches/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update branch")
  }
  return res.json()
}

export function BranchForm({ branch, open, onClose }: BranchFormProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phoneNumber: "",
    managerId: "none",
    isActive: true,
  })

  const { data: managers } = useQuery({
    queryKey: ["branch-managers"],
    queryFn: fetchBranchManagers,
  })

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name || "",
        code: branch.code || "",
        address: branch.address || "",
        phoneNumber: branch.phoneNumber || "",
        managerId: branch.managerId || "none",
        isActive: branch.isActive,
      })
    } else {
      setFormData({
        name: "",
        code: "",
        address: "",
        phoneNumber: "",
        managerId: "none",
        isActive: true,
      })
    }
  }, [branch, open])

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success("Branch created successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success("Branch updated successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Branch name and code are required")
      return
    }

    const data = {
      ...formData,
      managerId: formData.managerId === "none" ? null : (formData.managerId || null),
    }

    if (branch) {
      updateMutation.mutate({ id: branch.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {branch ? "Edit Branch" : "Add New Branch"}
          </DialogTitle>
          <DialogDescription>
            {branch
              ? "Update branch information and settings."
              : "Create a new branch for SOEMCO operations."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Branch Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Branch"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Branch Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., MAIN"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Branch address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="Branch contact number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager">Branch Manager</Label>
            <Select
              value={formData.managerId}
              onValueChange={(value) => setFormData({ ...formData, managerId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branch manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager assigned</SelectItem>
                {managers?.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.name || manager.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked === true })
              }
            />
            <Label htmlFor="isActive">Branch is active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: '#3498db' }}
            >
              {isLoading ? "Saving..." : branch ? "Update Branch" : "Create Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}