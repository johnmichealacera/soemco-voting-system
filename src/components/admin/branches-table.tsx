"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { MoreHorizontal, Edit, Trash2, Plus, Building2, Users, Phone, MapPin } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { BranchForm } from "./branch-form"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Branch {
  id: string
  managerId: string | null
  name: string
  code: string
  address: string | null
  phoneNumber: string | null
  isActive: boolean
  manager: {
    id: string
    name: string | null
    email: string
  } | null
  _count: {
    members: number
  }
}

async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/branches")
  if (!res.ok) throw new Error("Failed to fetch branches")
  return res.json()
}

async function deleteBranch(id: string) {
  const res = await fetch(`/api/branches/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete branch")
  }
  return res.json()
}

export function BranchesTable() {
  const queryClient = useQueryClient()
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success("Branch deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this branch? This action cannot be undone.")) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingBranch(null)
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading branches...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setIsFormOpen(true)}
          style={{ backgroundColor: '#3498db' }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
      </div>

      {branches && branches.length > 0 ? (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium" style={{ color: '#2c3e50' }}>
                          {branch.name}
                        </div>
                        {branch.address && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {branch.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: '#2c3e50' }}>
                    {branch.code}
                  </TableCell>
                  <TableCell>
                    {branch.manager ? (
                      <div>
                        <div className="font-medium text-sm" style={{ color: '#2c3e50' }}>
                          {branch.manager.name || "Unnamed"}
                        </div>
                        <div className="text-xs text-gray-500">{branch.manager.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No manager assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {branch.phoneNumber && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        {branch.phoneNumber}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold" style={{ color: '#2c3e50' }}>
                        {branch._count.members}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={branch.isActive ? "default" : "secondary"}
                      className={branch.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {branch.isActive ? "Active" : "Inactive"}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => handleEdit(branch)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(branch.id)}
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
      ) : (
        <div className="rounded-lg border border-gray-200 p-12 bg-white">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">No branches found</p>
            <p className="text-sm text-gray-500 mb-4">
              Add your first branch to get started with branch management.
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              style={{ backgroundColor: '#3498db' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Branch
            </Button>
          </div>
        </div>
      )}

      {isFormOpen && (
        <BranchForm
          branch={editingBranch}
          open={isFormOpen}
          onClose={handleFormClose}
        />
      )}
    </>
  )
}