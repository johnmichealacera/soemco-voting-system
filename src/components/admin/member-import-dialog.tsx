"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Building2, Loader2, Clock } from "lucide-react"
import { useSession } from "next-auth/react"

interface MemberImportDialogProps {
  open: boolean
  onClose: () => void
}

interface ImportResult {
  message: string
  results: {
    success: number
    failed: number
    skipped: number
    errors: string[]
  }
}

async function importMembers(file: File, branchId?: string): Promise<ImportResult> {
  const formData = new FormData()
  formData.append("file", file)
  if (branchId) {
    formData.append("branchId", branchId)
  }

  const res = await fetch("/api/members/import", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to import members")
  }

  return res.json()
}

async function fetchBranches() {
  const res = await fetch("/api/branches")
  if (!res.ok) throw new Error("Failed to fetch branches")
  return res.json()
}

export function MemberImportDialog({ open, onClose }: MemberImportDialogProps) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("none")
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [importStage, setImportStage] = useState<string>("")
  const [importStartTime, setImportStartTime] = useState<Date | null>(null)

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: open && session?.user?.role === "ADMIN",
  })

  const importMutation = useMutation({
    mutationFn: ({ file, branchId }: { file: File; branchId?: string }) =>
      importMembers(file, branchId),
    onMutate: () => {
      setImportStartTime(new Date())
    },
    onSuccess: (data) => {
      setImportResult(data)
      setImportStage("Import completed successfully!")
      queryClient.invalidateQueries({ queryKey: ["members"] })
      toast.success(data.message)
    },
    onError: (error: Error) => {
      setImportStage("Import failed")
      toast.error(error.message || "Failed to import members")
    },
  })

  // Update elapsed time and import stages during import
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let stageInterval: NodeJS.Timeout | null = null

    if (importStartTime && importMutation.isPending) {
      interval = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - importStartTime.getTime()) / 1000)
        setElapsedTime(elapsed)
      }, 1000)

      // Cycle through different stages to show progress
      let stageIndex = 0
      const stages = [
        "Uploading and processing Excel file...",
        "Validating member data...",
        "Checking for duplicates...",
        "Preparing database operations...",
        "Inserting members into database...",
        "Finalizing import..."
      ]

      stageInterval = setInterval(() => {
        stageIndex = (stageIndex + 1) % stages.length
        setImportStage(stages[stageIndex])
      }, 3000) // Change stage every 3 seconds
    } else if (!importMutation.isPending) {
      setElapsedTime(0)
      setImportStage("")
      setImportStartTime(null)
    }

    return () => {
      if (interval) clearInterval(interval)
      if (stageInterval) clearInterval(stageInterval)
    }
  }, [importStartTime, importMutation.isPending])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase()
      if (ext && ["xls", "xlsx", "csv"].includes(ext)) {
        setFile(selectedFile)
        setImportResult(null)
      } else {
        toast.error("Please select an Excel file (.xls, .xlsx) or CSV file")
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const ext = droppedFile.name.split(".").pop()?.toLowerCase()
      if (ext && ["xls", "xlsx", "csv"].includes(ext)) {
        setFile(droppedFile)
        setImportResult(null)
      } else {
        toast.error("Please select an Excel file (.xls, .xlsx) or CSV file")
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleSubmit = () => {
    if (!file) {
      toast.error("Please select a file to import")
      return
    }

    const branchId = session?.user?.role === "ADMIN" && selectedBranchId !== "none"
      ? selectedBranchId
      : undefined

    importMutation.mutate({ file, branchId })
  }

  const handleClose = () => {
    setFile(null)
    setImportResult(null)
    setElapsedTime(0)
    setImportStage("")
    setImportStartTime(null)
    onClose()
  }

  const isLoading = importMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle style={{ color: '#2c3e50' }}>
            Import Members from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xls, .xlsx) to import members. The file should contain columns for First Name, Last Name, Email (optional), and other member details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-4">
          {!importResult ? (
            <>
              {session?.user?.role === "ADMIN" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <Label className="text-sm font-semibold" style={{ color: '#2c3e50' }}>
                      Branch Assignment
                    </Label>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    Choose which branch to assign all imported members to, or select &quot;No branch assignment&quot; to use branch data from the Excel file.
                  </p>
                  <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select branch assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No branch assignment (use Excel data)</SelectItem>
                      {branches?.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {file ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-blue-500" />
                    <p className="font-medium text-gray-700">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <Label
                        htmlFor="file-upload"
                        className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Click to upload
                      </Label>
                      <span className="text-gray-500"> or drag and drop</span>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".xls,.xlsx,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Excel files (.xls, .xlsx) up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {isLoading && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm" style={{ color: '#2c3e50' }}>
                      Import Progress
                    </h4>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 font-mono">
                        {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      <span className="text-sm text-gray-700">{importStage}</span>
                    </div>

                    {/* Animated progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: '100%',
                          background: 'linear-gradient(90deg, #3498db 0%, #2980b9 50%, #3498db 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 2s infinite linear',
                        }}
                      />
                    </div>

                    <div className="text-xs text-gray-600 text-center">
                      Processing your Excel file... This may take a few minutes for large files.
                    </div>
                  </div>

                  <style dangerouslySetInnerHTML={{
                    __html: `
                      @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                      }
                    `
                  }} />
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2" style={{ color: '#2c3e50' }}>
                  Expected Column Headers:
                </h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>First Name</strong> (required)</li>
                  <li>• <strong>Last Name</strong> (required)</li>
                  <li>• <strong>Email</strong> (optional - will be auto-generated if not provided)</li>
                  <li>• <strong>Middle Name</strong> (optional)</li>
                  <li>• <strong>Date of Birth</strong> (optional)</li>
                  <li>• <strong>Address</strong> (optional)</li>
                  <li>• <strong>Phone Number</strong> (optional)</li>
                  <li>• <strong>Member ID</strong> (optional - will be auto-generated if not provided)</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg border ${
                  importResult.results.failed > 0
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {importResult.results.failed > 0 ? (
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-2">
                      {importResult.message}
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Success:</p>
                        <p className="font-semibold text-green-600">
                          {importResult.results.success}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Failed:</p>
                        <p className="font-semibold text-red-600">
                          {importResult.results.failed}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Duplicate:</p>
                        <p className="font-semibold text-gray-600">
                          {importResult.results.skipped}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {importResult.results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <h4 className="font-semibold text-sm mb-2 text-red-800">
                    Errors:
                  </h4>
                  <ul className="text-xs text-red-700 space-y-1">
                    {importResult.results.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                    {importResult.results.errors.length > 10 && (
                      <li className="text-gray-600">
                        ... and {importResult.results.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          {importResult ? (
            <Button onClick={handleClose} style={{ backgroundColor: '#3498db' }}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!file || isLoading}
                style={{ backgroundColor: '#3498db' }}
              >
                {isLoading ? "Importing..." : "Import Members"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
