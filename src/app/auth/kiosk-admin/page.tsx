"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, Eye, EyeOff, Vote, Shield } from "lucide-react"
import { UserRole } from "@prisma/client"
import { zodResolver } from "@hookform/resolvers/zod"

const kioskAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type KioskAdminForm = z.infer<typeof kioskAdminSchema>

const roleLabels: Record<UserRole, string> = {
  MEMBER: "Member",
  BOARD_MEMBER: "Board Member",
  ELECTION_COMMITTEE: "Election Committee",
  ADMIN: "Administrator",
  BRANCH_MANAGER: "Branch Manager",
}

export default function KioskAdminLoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KioskAdminForm>({
    resolver: zodResolver(kioskAdminSchema),
  })

  const onSubmit = async (data: KioskAdminForm) => {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        kioskAccess: "true",
        redirect: false,
      })

      if (result?.error) {
        toast.error("Invalid email or password")
      } else {
        // Check if user has admin or branch manager role
        // This validation will be done on the server side in the auth configuration
        toast.success("Login successful")
        router.push("/kiosk")
        router.refresh()
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Role Selection
        </Button>

        <Card className="w-full">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-700">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Staff Kiosk Access</CardTitle>
            <CardDescription className="text-base">
              Administrator & Branch Manager Login
            </CardDescription>
            <CardDescription className="text-sm mt-2">
              Authorized personnel only. Login to access the voting kiosk management interface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@soemco.com"
                  {...register("email")}
                  autoFocus
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                style={{ backgroundColor: '#27ae60' }}
              >
                {isLoading ? "Signing in..." : "Access Kiosk"}
              </Button>
            </form>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 text-center">
                <Shield className="h-3 w-3 inline mr-1" />
                Only Administrators and Branch Managers can access this interface
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}