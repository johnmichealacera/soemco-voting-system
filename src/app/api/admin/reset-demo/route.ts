import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can reset demo data
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    // Verify admin password
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    })

    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    const isValidPassword = await bcrypt.compare(password, admin.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    console.log("Starting demo data reset...")

    // Execute the TRUNCATE command
    const truncateQuery = `
      TRUNCATE TABLE
        "Vote",
        "ElectionResult",
        "Candidate",
        "Position",
        "Election",
        "WorkflowStep",
        "WorkflowInstance",
        "Notification",
        "AuditTrail",
        "MemberProfile",
        "User"
      RESTART IDENTITY CASCADE;
    `

    await prisma.$executeRawUnsafe(truncateQuery)
    console.log("Tables truncated successfully")

    // Run the seed script
    try {
      console.log("Running seed script...")
      const { stdout, stderr } = await execAsync("npx prisma db seed")
      console.log("Seed script output:", stdout)
      if (stderr) {
        console.warn("Seed script stderr:", stderr)
      }
      console.log("Seed script completed successfully")
    } catch (seedError: any) {
      console.error("Error running seed script:", seedError)
      return NextResponse.json({
        error: "Tables truncated but seed script failed",
        details: seedError.message
      }, { status: 500 })
    }

    console.log("Demo data reset completed successfully")

    return NextResponse.json({
      message: "Demo data reset completed successfully. All tables truncated and seed data restored."
    })

  } catch (error: any) {
    console.error("Error resetting demo data:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}