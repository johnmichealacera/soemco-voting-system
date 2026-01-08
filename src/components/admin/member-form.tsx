"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MemberStatus } from "@prisma/client"
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

interface Member {
  id: string
  memberId: string
  firstName: string
  lastName: string
  middleName: string | null
  dateOfBirth: Date | string | null
  address: string | null
  phoneNumber: string | null
  status: MemberStatus
  user: {
    id: string
    email: string
    name: string | null
  }
}

interface MemberFormProps {
  member?: Member | null
  open: boolean
  onClose: () => void
}

async function createMember(data: any) {
  const res = await fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to create member")
  }
  return res.json()
}

async function updateMember(id: string, data: any) {
  const res = await fetch(`/api/members/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update member")
  }
  return res.json()
}

export function MemberForm({ member, open, onClose }: MemberFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!member

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    firstName: "",
    lastName: "",
    middleName: "",
    dateOfBirth: "",
    address: "",
    phoneNumber: "",
    status: MemberStatus.PENDING_VERIFICATION,
  })

  useEffect(() => {
    if (member) {
      setFormData({
        email: member.user.email,
        password: "", // Don't pre-fill password
        name: member.user.name || "",
        firstName: member.firstName,
        lastName: member.lastName,
        middleName: member.middleName || "",
        dateOfBirth: member.dateOfBirth
          ? new Date(member.dateOfBirth).toISOString().slice(0, 10)
          : "",
        address: member.address || "",
        phoneNumber: member.phoneNumber || "",
        status: member.status as any,
      })
    } else {
      setFormData({
        email: "",
        password: "",
        name: "",
        firstName: "",
        lastName: "",
        middleName: "",
        dateOfBirth: "",
        address: "",
        phoneNumber: "",
        status: MemberStatus.PENDING_VERIFICATION,
      })
    }
  }, [member, open])

  const createMutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("Member created successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateMember(member!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("Member updated successfully")
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleName: formData.middleName || null,
      dateOfBirth: formData.dateOfBirth || null,
      address: formData.address || null,
      phoneNumber: formData.phoneNumber || null,
    }

    if (isEditing) {
      // For editing, include optional fields
      if (formData.email) data.email = formData.email
      if (formData.name) data.name = formData.name
      if (formData.password) data.password = formData.password
      data.status = formData.status
      updateMutation.mutate(data)
    } else {
      // For creating, require email and password
      if (!formData.email || !formData.password) {
        toast.error("Email and password are required")
        return
      }
      data.email = formData.email
      data.password = formData.password
      data.name = formData.name || `${formData.firstName} ${formData.lastName}`
      data.status = formData.status
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: '#2c3e50' }}>
            {isEditing ? "Edit Member" : "Add New Member"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the member details below."
              : "Fill in the details to create a new member account."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required={!isEditing}
                  disabled={isEditing}
                  placeholder="member@example.com"
                />
                {isEditing && (
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                )}
              </div>

              {!isEditing && (
                <div className="grid gap-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    placeholder="Enter password"
                  />
                </div>
              )}

              {isEditing && (
                <div className="grid gap-2">
                  <Label htmlFor="password">New Password (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Leave blank to keep current password"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Full name (optional)"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                  placeholder="John"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) =>
                    setFormData({ ...formData, middleName: e.target.value })
                  }
                  placeholder="Middle"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Street address, City, State, ZIP"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: MemberStatus) =>
                  setFormData({ ...formData, status: value as any })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MemberStatus.PENDING_VERIFICATION}>
                    Pending Verification
                  </SelectItem>
                  <SelectItem value={MemberStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={MemberStatus.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={MemberStatus.SUSPENDED}>Suspended</SelectItem>
                </SelectContent>
              </Select>
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
                ? "Update Member"
                : "Create Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

