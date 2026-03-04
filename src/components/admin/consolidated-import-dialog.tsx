"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Clock, Building2 } from "lucide-react"

interface ConsolidatedImportDialogProps {
  open: boolean
  onClose: () => void
}

interface BranchSummary {
  sheetName: string
  branchName: string
  branchId: string
  created: boolean
  importedCount: number
}

interface ConsolidatedImportResult {
  message: string
  results: {
    success: number
    failed: number
    skipped: number
    errors: string[]
  }
  branchSummaries: BranchSummary[]
}

async function importConsolidated(file: File): Promise<ConsolidatedImportResult> {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/members/import-consolidated", {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to import consolidated file")
  }

  return res.json()
}

export function ConsolidatedImportDialog({ open, onClose }: ConsolidatedImportDialogProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ConsolidatedImportResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [importStage, setImportStage] = useState<string>("")
  const [importStartTime, setImportStartTime] = useState<Date | null>(null)

  const importMutation = useMutation({
    mutationFn: (file: File) => importConsolidated(file),
    onMutate: () => {
      setImportStartTime(new Date())
    },
    onSuccess: (data) => {
      setImportResult(data)
      setImportStage("Import completed successfully!")
      queryClient.invalidateQueries({ queryKey: ["members"] })
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      toast.success(data.message)
    },
    onError: (error: Error) => {
      setImportStage("Import failed")
      toast.error(error.message || "Failed to import consolidated file")
    },
  })

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let stageInterval: NodeJS.Timeout | null = null

    if (importStartTime && importMutation.isPending) {
      interval = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - importStartTime.getTime()) / 1000)
        setElapsedTime(elapsed)
      }, 1000)

      let stageIndex = 0
      const stages = [
        "Uploading and reading Excel workbook...",
        "Processing sheets and matching branches...",
        "Creating new branches as needed...",
        "Validating member data across sheets...",
        "Checking for duplicates...",
        "Inserting members into database...",
        "Finalizing consolidated import...",
      ]

      stageInterval = setInterval(() => {
        stageIndex = (stageIndex + 1) % stages.length
        setImportStage(stages[stageIndex])
      }, 3000)
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
      if (ext && ["xls", "xlsx"].includes(ext)) {
        setFile(selectedFile)
        setImportResult(null)
      } else {
        toast.error("Please select an Excel file (.xls, .xlsx)")
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const ext = droppedFile.name.split(".").pop()?.toLowerCase()
      if (ext && ["xls", "xlsx"].includes(ext)) {
        setFile(droppedFile)
        setImportResult(null)
      } else {
        toast.error("Please select an Excel file (.xls, .xlsx)")
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
    importMutation.mutate(file)
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
          <DialogTitle style={{ color: "#2c3e50" }}>
            Import Consolidated GA Workbook
          </DialogTitle>
          <DialogDescription>
            Upload a consolidated GA Excel workbook where each sheet represents a branch. The sheet name is used to match or create branches automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 py-4">
            {!importResult ? (
              <>
                {/* How it works */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <Label className="text-sm font-semibold" style={{ color: "#2c3e50" }}>
                      How it works
                    </Label>
                  </div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>
                      Each <strong>sheet/tab</strong> in the workbook will be treated as a <strong>separate branch</strong>.
                    </li>
                    <li>
                      The <strong>sheet name</strong> is matched against existing branch names or codes (case-insensitive).
                    </li>
                    <li>
                      If no matching branch is found, a <strong>new branch is created automatically</strong> using the sheet name.
                    </li>
                    <li>
                      The header row is auto-detected by scanning for a row that contains a &quot;Name&quot; column (e.g. &quot;Name of Client&quot;, &quot;Name&quot;, &quot;Full Name&quot;). Data rows start from the first non-empty row below the header.
                    </li>
                    <li>
                      Empty sheets and summary/total rows are skipped automatically.
                    </li>
                  </ul>
                </div>

                {/* File drop zone */}
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
                      <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                        Remove File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-gray-400" />
                      <div>
                        <Label
                          htmlFor="consolidated-file-upload"
                          className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Click to upload
                        </Label>
                        <span className="text-gray-500"> or drag and drop</span>
                        <input
                          id="consolidated-file-upload"
                          type="file"
                          accept=".xls,.xlsx"
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

                {/* Progress */}
                {isLoading && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm" style={{ color: "#2c3e50" }}>
                        Import Progress
                      </h4>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600 font-mono">
                          {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <span className="text-sm text-gray-700">{importStage}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: "100%",
                            background: "linear-gradient(90deg, #3498db 0%, #2980b9 50%, #3498db 100%)",
                            backgroundSize: "200% 100%",
                            animation: "shimmer 2s infinite linear",
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 text-center">
                        Processing all sheets... This may take several minutes for large workbooks.
                      </div>
                    </div>
                    <style dangerouslySetInnerHTML={{
                      __html: `
                        @keyframes shimmer {
                          0% { background-position: -200% 0; }
                          100% { background-position: 200% 0; }
                        }
                      `,
                    }} />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
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
                      <p className="font-medium text-sm mb-2">{importResult.message}</p>
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

                {/* Branch summary table */}
                {importResult.branchSummaries && importResult.branchSummaries.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-2" style={{ color: "#2c3e50" }}>
                      <Building2 className="inline mr-1 h-4 w-4" />
                      Branch Breakdown
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-blue-200">
                            <th className="text-left py-1 pr-4">Sheet</th>
                            <th className="text-left py-1 pr-4">Branch</th>
                            <th className="text-right py-1 pr-4">Imported</th>
                            <th className="text-left py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.branchSummaries.map((bs, idx) => (
                            <tr key={idx} className="border-b border-blue-100 last:border-0">
                              <td className="py-1 pr-4 text-gray-700">{bs.sheetName}</td>
                              <td className="py-1 pr-4 text-gray-700">{bs.branchName}</td>
                              <td className="py-1 pr-4 text-right font-semibold">{bs.importedCount}</td>
                              <td className="py-1">
                                {bs.created ? (
                                  <span className="text-orange-600 font-medium">New branch</span>
                                ) : (
                                  <span className="text-green-700">Existing</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Errors list */}
                {importResult.results.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <h4 className="font-semibold text-sm mb-2 text-red-800">Errors:</h4>
                    <ul className="text-xs text-red-700 space-y-1">
                      {importResult.results.errors.slice(0, 20).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {importResult.results.errors.length > 20 && (
                        <li className="text-gray-600">
                          ... and {importResult.results.errors.length - 20} more errors
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
            <Button onClick={handleClose} style={{ backgroundColor: "#3498db" }}>
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
                style={{ backgroundColor: "#3498db" }}
              >
                {isLoading ? "Importing..." : "Import Consolidated"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
