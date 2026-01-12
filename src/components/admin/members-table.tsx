"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { MemberStatus, UserRole } from "@prisma/client"
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
import { MoreHorizontal, Edit, Trash2, Eye, CheckCircle, XCircle, UserMinus, Users, Search, Filter, Building2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { MemberForm } from "./member-form"
import { BulkBranchTransferDialog } from "./bulk-branch-transfer-dialog"
import { Checkbox } from "@/components/ui/checkbox"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pagination } from "@/components/ui/pagination"

interface Branch {
  id: string
  name: string
  code: string
}

interface Member {
  id: string
  memberId: string
  firstName: string
  lastName: string
  middleName: string | null
  dateOfBirth: Date | string | null
  address: string | null
  phoneNumber: string | null
  branchId: string | null
  branch?: Branch | null
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

interface MembersResponse {
  members: Member[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

async function fetchMembers(
  page: number = 1,
  pageSize: number = 10,
  search: string = "",
  status: string = "",
  role: string = "",
  branch: string = ""
): Promise<MembersResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  })
  if (search) params.append("search", search)
  if (status) params.append("status", status)
  if (role) params.append("role", role)
  if (branch) params.append("branch", branch)

  const res = await fetch(`/api/members?${params.toString()}`)
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

async function bulkUpdateMembers(memberIds: string[], status?: MemberStatus, branchId?: string | null) {
  const res = await fetch("/api/members/bulk", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberIds, status, branchId }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update members")
  }
  return res.json()
}

async function bulkDeleteMembers(memberIds: string[]) {
  const res = await fetch("/api/members/bulk", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberIds }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete members")
  }
  return res.json()
}

async function updateUserRole(userId: string, role: UserRole) {
  const res = await fetch(`/api/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update user role")
  }
  return res.json()
}

async function bulkUpdateUserRoles(userIds: string[], role: UserRole) {
  const res = await fetch("/api/users/bulk", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds, role }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to update user roles")
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
  const { data: session } = useSession()
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  
  // Pagination and filter states
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [roleFilter, setRoleFilter] = useState<string>("")
  const [branchFilter, setBranchFilter] = useState<string>("")
  const [searchInput, setSearchInput] = useState("")

  const { data: response, isLoading } = useQuery({
    queryKey: ["members", page, pageSize, search, statusFilter, roleFilter, branchFilter],
    queryFn: () => fetchMembers(page, pageSize, search, statusFilter, roleFilter, branchFilter),
  })

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/branches").then(res => res.json()),
  })

  const members = response?.members || []
  const pagination = response?.pagination || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  }

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

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ memberIds, status }: { memberIds: string[]; status: MemberStatus }) =>
      bulkUpdateMembers(memberIds, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      setSelectedMembers(new Set())
      toast.success(data.message || "Members updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (memberIds: string[]) => bulkDeleteMembers(memberIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      setSelectedMembers(new Set())
      toast.success(data.message || "Members deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success("User role updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const bulkRoleMutation = useMutation({
    mutationFn: ({ userIds, role }: { userIds: string[]; role: UserRole }) =>
      bulkUpdateUserRoles(userIds, role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      setSelectedMembers(new Set())
      toast.success(data.message || "User roles updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const bulkBranchTransferMutation = useMutation({
    mutationFn: ({ memberIds, branchId }: { memberIds: string[]; branchId: string | null }) =>
      bulkUpdateMembers(memberIds, undefined, branchId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members"] })
      setSelectedMembers(new Set())
      toast.success(data.message || "Members transferred successfully")
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

  const handleSetAsBranchManager = (userId: string) => {
    if (confirm("Are you sure you want to set this user as a Branch Manager?")) {
      roleMutation.mutate({ userId, role: UserRole.BRANCH_MANAGER })
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingMember(null)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && members) {
      setSelectedMembers(new Set(members.map((m) => m.id)))
    } else {
      setSelectedMembers(new Set())
    }
  }

  const handleSelectMember = (memberId: string, checked: boolean) => {
    const newSelected = new Set(selectedMembers)
    if (checked) {
      newSelected.add(memberId)
    } else {
      newSelected.delete(memberId)
    }
    setSelectedMembers(newSelected)
  }

  const handleBulkStatusChange = (status: MemberStatus) => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member")
      return
    }

    const memberIds = Array.from(selectedMembers)
    const statusName = status === MemberStatus.ACTIVE ? "Active" :
                       status === MemberStatus.INACTIVE ? "Inactive" :
                       status === MemberStatus.SUSPENDED ? "Suspended" :
                       "Pending"

    if (confirm(`Are you sure you want to set ${memberIds.length} member(s) to ${statusName}?`)) {
      bulkUpdateMutation.mutate({ memberIds, status })
    }
  }

  const handleBulkDelete = () => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member")
      return
    }

    const memberIds = Array.from(selectedMembers)
    if (
      confirm(
        `Are you sure you want to delete ${memberIds.length} member(s)? This action cannot be undone. Members with votes cannot be deleted.`
      )
    ) {
      bulkDeleteMutation.mutate(memberIds)
    }
  }

  const handleBulkBranchTransfer = (branchId: string | null) => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member")
      return
    }

    const memberIds = Array.from(selectedMembers)
    bulkBranchTransferMutation.mutate({ memberIds, branchId })
  }

  const handleOpenBulkTransfer = () => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member")
      return
    }
    setIsBulkTransferOpen(true)
  }

  const handleBulkSetAsBranchManager = () => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member")
      return
    }

    const memberIds = Array.from(selectedMembers)
    // Get user IDs from selected members
    const userIds = members
      .filter(member => selectedMembers.has(member.id))
      .map(member => member.user.id)

    if (confirm(`Are you sure you want to set ${userIds.length} user(s) as Branch Managers?`)) {
      bulkRoleMutation.mutate({ userIds, role: UserRole.BRANCH_MANAGER })
    }
  }

  const allSelected = members && members.length > 0 && selectedMembers.size === members.length
  const someSelected = selectedMembers.size > 0 && selectedMembers.size < (members?.length || 0)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1) // Reset to first page on search
    setSelectedMembers(new Set()) // Clear selection on search
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1) // Reset to first page on filter change
    setSelectedMembers(new Set()) // Clear selection on filter change
  }

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value)
    setPage(1) // Reset to first page on filter change
    setSelectedMembers(new Set()) // Clear selection on filter change
  }

  const handleBranchFilterChange = (value: string) => {
    setBranchFilter(value)
    setPage(1) // Reset to first page on filter change
    setSelectedMembers(new Set()) // Clear selection on filter change
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setSelectedMembers(new Set()) // Clear selection on page change
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setPage(1) // Reset to first page on page size change
    setSelectedMembers(new Set()) // Clear selection on page size change
  }

  const clearFilters = () => {
    setSearchInput("")
    setSearch("")
    setStatusFilter("")
    setRoleFilter("")
    setBranchFilter("")
    setPage(1)
    setSelectedMembers(new Set())
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading members...</p>
      </div>
    )
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-4 p-4 bg-white border rounded-lg space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold" style={{ color: '#2c3e50' }}>Filters</h3>
          {(search || statusFilter || roleFilter || branchFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-sm"
            >
              Clear Filters
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                id="search"
                placeholder="Search by name, email, or member ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" style={{ backgroundColor: '#3498db' }}>
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger id="status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                <SelectItem value={MemberStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={MemberStatus.INACTIVE}>Inactive</SelectItem>
                <SelectItem value={MemberStatus.SUSPENDED}>Suspended</SelectItem>
                <SelectItem value={MemberStatus.PENDING_VERIFICATION}>Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
              <SelectTrigger id="role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All roles</SelectItem>
                <SelectItem value={UserRole.MEMBER}>Member</SelectItem>
                <SelectItem value={UserRole.BRANCH_MANAGER}>Branch Manager</SelectItem>
                <SelectItem value={UserRole.ADMIN}>Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {session?.user?.role === UserRole.ADMIN && (
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Select value={branchFilter} onValueChange={handleBranchFilterChange}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All branches</SelectItem>
                  {branches?.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pageSize">Items per page</Label>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger id="pageSize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedMembers.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium text-blue-900">
              {selectedMembers.size} member(s) selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMembers(new Set())}
            >
              Clear Selection
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                style={{ backgroundColor: '#3498db' }}
                disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending || bulkRoleMutation.isPending || bulkBranchTransferMutation.isPending}
              >
                <Users className="mr-2 h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleBulkStatusChange(MemberStatus.ACTIVE)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Set to Active
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleBulkStatusChange(MemberStatus.INACTIVE)}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Set to Inactive
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleBulkStatusChange(MemberStatus.SUSPENDED)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Set to Suspended
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleBulkStatusChange(MemberStatus.PENDING_VERIFICATION)}
              >
                Set to Pending
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {session?.user?.role === UserRole.ADMIN && (
                <DropdownMenuItem
                  onClick={handleBulkSetAsBranchManager}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Set as Branch Manager
                </DropdownMenuItem>
              )}
              {session?.user?.role === UserRole.ADMIN && (
                <DropdownMenuItem
                  onClick={handleOpenBulkTransfer}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Transfer to Branch
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleBulkDelete}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {members && members.length > 0 ? (
        <>
          <div className="rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Votes</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow 
                    key={member.id}
                    className={selectedMembers.has(member.id) ? "bg-blue-50" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedMembers.has(member.id)}
                        onCheckedChange={(checked) =>
                          handleSelectMember(member.id, checked === true)
                        }
                        aria-label={`Select ${member.firstName} ${member.lastName}`}
                      />
                    </TableCell>
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
                    <TableCell>
                      {member.branch ? (
                        <div>
                          <div className="font-medium text-sm" style={{ color: '#2c3e50' }}>
                            {member.branch.name}
                          </div>
                          <div className="text-xs text-gray-500">{member.branch.code}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No branch</span>
                      )}
                    </TableCell>
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
                          {session?.user?.role === UserRole.ADMIN && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleSetAsBranchManager(member.user.id)}
                                disabled={member.user.role === UserRole.BRANCH_MANAGER}
                              >
                                <Building2 className="mr-2 h-4 w-4" />
                                Set as Branch Manager
                              </DropdownMenuItem>
                            </>
                          )}
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

          {/* Pagination */}
          {pagination.totalPages > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                {pagination.total} member(s)
              </div>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 p-12 bg-white">
          <div className="text-center">
            <p className="text-gray-600 text-lg mb-2">No members found</p>
            {(search || statusFilter) ? (
              <p className="text-sm text-gray-500">
                Try adjusting your filters or search terms to find members.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Add your first member to get started.
              </p>
            )}
          </div>
        </div>
      )}

      {isFormOpen && (
        <MemberForm
          member={editingMember}
          open={isFormOpen}
          onClose={handleFormClose}
        />
      )}

      <BulkBranchTransferDialog
        open={isBulkTransferOpen}
        onClose={() => setIsBulkTransferOpen(false)}
        selectedMemberIds={Array.from(selectedMembers)}
        onTransfer={handleBulkBranchTransfer}
      />
    </>
  )
}

