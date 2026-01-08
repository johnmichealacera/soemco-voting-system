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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { PositionForm } from "./position-form"

interface Position {
  id: string
  electionId: string | null
  title: string
  description: string | null
  order: number
  createdAt: Date | string
  election: {
    id: string
    title: string
    status: string
  } | null
  _count: {
    candidates: number
    votes: number
  }
}

async function fetchPositions(): Promise<Position[]> {
  const res = await fetch("/api/positions")
  if (!res.ok) throw new Error("Failed to fetch positions")
  return res.json()
}

async function deletePosition(id: string) {
  const res = await fetch(`/api/positions/${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to delete position")
  }
  return res.json()
}

export function PositionsTable() {
  const queryClient = useQueryClient()
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data: positions, isLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: fetchPositions,
  })

  const deleteMutation = useMutation({
    mutationFn: deletePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] })
      toast.success("Position deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleEdit = (position: Position) => {
    setEditingPosition(position)
    setIsFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this position?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingPosition(null)
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading positions...</p>
      </div>
    )
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          No positions found. Create your first position to get started.
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
              <TableHead>Title</TableHead>
              <TableHead>Election</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Candidates</TableHead>
              <TableHead>Votes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.id}>
                <TableCell className="font-medium" style={{ color: '#2c3e50' }}>
                  {position.title}
                </TableCell>
                <TableCell>
                  {position.election ? (
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#2c3e50' }}>
                        {position.election.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {position.election.status}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Standalone</span>
                  )}
                </TableCell>
                <TableCell className="text-gray-600 max-w-xs truncate">
                  {position.description || "-"}
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold" style={{ color: '#2c3e50' }}>
                    {position.order}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold" style={{ color: '#2c3e50' }}>
                    {position._count.candidates}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold" style={{ color: '#2c3e50' }}>
                    {position._count.votes}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {formatDate(position.createdAt)}
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
                      <DropdownMenuItem onClick={() => handleEdit(position)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {position.electionId && (
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(`/elections/${position.electionId}`, "_blank")
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Election
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(position.id)}
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
        <PositionForm
          position={editingPosition}
          open={isFormOpen}
          onClose={handleFormClose}
        />
      )}
    </>
  )
}

