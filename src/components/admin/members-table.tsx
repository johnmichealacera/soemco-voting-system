"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MemberStatus } from "@prisma/client"
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
import { MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, UserMinus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { MemberForm } from "./member-form"

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
  membershipDate: Date | string
  createdAt: Date | string
  user: {
    id: string
    email: string
    name: string | null
    role: string
    createdAt: Date | string
  }
  _count: {
    votes: number
  }
}

async function fetchMembers(): Promise<Member[]> {
  const res = await fetch("/api/members")
  if (!res.ok) throw new Error("Failed to fetch members")
  return res.json()
}

async function deleteMember(id: string) {
  const res = await fetch(`/api/members/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete member")
  }
  return res.json()
}

async function updateMemberStatus(id: string, status: MemberStatus) {
  const res = await fetch(`/api/members/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update member status")
  }
  return res.json()
}

function getStatusBadge(status: MemberStatus) {
  const statusConfig = {
    [MemberStatus.ACTIVE]: {
      label: "Active",
      className: "bg-green-100 text-green-800 border-green-300",
    },
    [MemberStatus.INACTIVE]: {
      label: "Inactive",
      className: "bg-gray-100 text-gray-800 border-gray-300",
    },
    [MemberStatus.SUSPENDED]: {
      label: "Suspended",
      className: "bg-red-100 text-red-800 border-red-300",
    },
    [MemberStatus.PENDING_VERIFICATION]: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    },
  }

  const config = statusConfig[status] || statusConfig[MemberStatus.PENDING_VERIFICATION]

  return (
    <Badge variant="outline" className={`${config.className} border`}>
      {config.label}
    </Badge>
  )
}

export function MembersTable() {
  const queryClient = useQueryClient()
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data: members, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("Member deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MemberStatus }) =>
      updateMemberStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("Member status updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this member?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleStatusChange = (id: string, status: MemberStatus) => {
    statusMutation.mutate({ id, status })
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingMember(null)
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading members...</p>
      </div>
    )
  }

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No members found. Add your first member to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead>Member Since</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium" style={{ color: '#2c3e50' }}>
                  {member.memberId}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium" style={{ color: '#2c3e50' }}>
                      {member.firstName} {member.middleName || ""} {member.lastName}
                    </div>
                    {member.user.name && (
                      <div className="text-xs text-gray-500">{member.user.name}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{member.user.email}</TableCell>
                <TableCell>{getStatusBadge(member.status)}</TableCell>
                <TableCell className="text-gray-600">
                  {member.phoneNumber || "-"}
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold" style={{ color: '#2c3e50' }}>
                    {member._count.votes}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(member.membershipDate)}
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
                      <DropdownMenuItem onClick={() => handleEdit(member)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusChange(member.id, MemberStatus.ACTIVE)
                        }
                        disabled={member.status === MemberStatus.ACTIVE}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusChange(member.id, MemberStatus.INACTIVE)
                        }
                        disabled={member.status === MemberStatus.INACTIVE}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusChange(member.id, MemberStatus.SUSPENDED)
                        }
                        disabled={member.status === MemberStatus.SUSPENDED}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Suspend
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(member.id)}
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
        <MemberForm
          member={editingMember}
          open={isFormOpen}
          onClose={handleFormClose}
        />
      )}
    </>
  )
}

