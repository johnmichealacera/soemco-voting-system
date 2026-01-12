"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { toast } from "sonner"

interface BulkBranchTransferDialogProps {
  open: boolean
  onClose: () => void
  selectedMemberIds: string[]
  onTransfer: (branchId: string | null) => void
}

interface Branch {
  id: string
  name: string
  code: string
}

async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/branches")
  if (!res.ok) throw new Error("Failed to fetch branches")
  return res.json()
}

export function BulkBranchTransferDialog({
  open,
  onClose,
  selectedMemberIds,
  onTransfer
}: BulkBranchTransferDialogProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: open,
  })

  const handleTransfer = () => {
    if (!selectedBranchId) {
      toast.error("Please select a branch")
      return
    }

    const branchId = selectedBranchId === "none" ? null : selectedBranchId
    onTransfer(branchId)
    setSelectedBranchId("")
    onClose()
  }

  const handleClose = () => {
    setSelectedBranchId("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Transfer Members to Branch</DialogTitle>
          <DialogDescription>
            Move {selectedMemberIds.length} selected member(s) to a different branch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Branch</label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Remove from all branches</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            style={{ backgroundColor: '#3498db' }}
          >
            Transfer {selectedMemberIds.length} Member{selectedMemberIds.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}