"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Vote } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"

const kioskSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
})

type KioskForm = z.infer<typeof kioskSchema>

export default function KioskLoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KioskForm>({
    resolver: zodResolver(kioskSchema),
  })

  const onSubmit = async (data: KioskForm) => {
    setIsLoading(true)
    try {
      const result = await signIn("kiosk", {
        memberId: data.memberId,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Invalid Member ID or member not found")
      } else {
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700">
                <Vote className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Voting Kiosk</CardTitle>
            <CardDescription className="text-base">
              Member Login
            </CardDescription>
            <CardDescription className="text-sm mt-2">
              Please enter your Member ID to start voting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="memberId">Member ID</Label>
                <Input
                  id="memberId"
                  type="text"
                  placeholder="MEM001"
                  {...register("memberId")}
                  className="text-lg"
                  autoFocus
                />
                {errors.memberId && (
                  <p className="text-sm text-destructive">{errors.memberId.message}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                style={{ backgroundColor: '#3498db' }}
              >
                {isLoading ? "Logging in..." : "Login to Vote"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
