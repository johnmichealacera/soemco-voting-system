"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ResetDemoDialogProps {
  children: React.ReactNode
}

export function ResetDemoDialog({ children }: ResetDemoDialogProps) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleReset = async () => {
    if (!password.trim()) {
      toast.error("Please enter your password")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/reset-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset demo data")
      }

      toast.success("Demo data reset completed successfully!")
      setOpen(false)
      setPassword("")

      // Reload the page after a short delay to show the fresh data
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error: any) {
      toast.error(error.message || "Failed to reset demo data")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Reset Demo Data
          </DialogTitle>
          <DialogDescription className="text-red-700">
            <strong>Warning:</strong> This action will permanently delete all election data, votes, members, and users except for the admin account. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right col-span-1">
              Password
            </Label>
            <div className="col-span-3">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your admin password to confirm this action
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isLoading || !password.trim()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Demo Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}