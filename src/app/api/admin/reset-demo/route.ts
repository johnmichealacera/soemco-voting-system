import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { UserRole, MemberStatus } from "@prisma/client"

// Import seed function directly to avoid npm issues
async function runSeedScript() {
  console.log('🌱 Running seed script...')

  // Hash passwords
  const memberPassword = await bcrypt.hash('member123', 12)
  const adminPassword = await bcrypt.hash('admin123', 12)
  const branchManagerPassword = await bcrypt.hash('manager123', 12)

  function generateMemberId(): string {
    const prefix = 'MEM'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  // Create Member Account
  const member = await prisma.user.upsert({
    where: { email: 'member@soemco.com' },
    update: {},
    create: {
      email: 'member@soemco.com',
      password: memberPassword,
      name: 'John Doe',
      role: UserRole.MEMBER,
      memberProfile: {
        create: {
          memberId: generateMemberId(),
          firstName: 'John',
          lastName: 'Doe',
          status: MemberStatus.ACTIVE,
          address: '123 Cooperative Street',
          phoneNumber: '+63 912 345 6789',
        },
      },
    },
    include: {
      memberProfile: true,
    },
  })

  console.log('✅ Created Member account:', member.email)

  // Create Admin Account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@soemco.com' },
    update: {},
    create: {
      email: 'admin@soemco.com',
      password: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      memberProfile: {
        create: {
          memberId: generateMemberId(),
          firstName: 'Admin',
          lastName: 'User',
          status: MemberStatus.ACTIVE,
          address: 'Admin Office',
          phoneNumber: '+63 912 345 6780',
        },
      },
    },
    include: {
      memberProfile: true,
    },
  })

  console.log('✅ Created Admin account:', admin.email)

  // Create Branch Manager Account
  const branchManager = await prisma.user.upsert({
    where: { email: 'manager@soemco.com' },
    update: {},
    create: {
      email: 'manager@soemco.com',
      password: branchManagerPassword,
      name: 'Branch Manager',
      role: UserRole.BRANCH_MANAGER,
      memberProfile: {
        create: {
          memberId: generateMemberId(),
          firstName: 'Branch',
          lastName: 'Manager',
          status: MemberStatus.ACTIVE,
          address: 'Branch Office',
          phoneNumber: '+63 912 345 6781',
        },
      },
    },
    include: {
      memberProfile: true,
    },
  })

  console.log('✅ Created Branch Manager account:', branchManager.email)

  console.log('\n📋 Test Accounts Created:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 MEMBER ACCOUNT:')
  console.log('   Email: member@soemco.com')
  console.log('   Password: member123')
  console.log('   Role: Member')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏢 BRANCH MANAGER ACCOUNT:')
  console.log('   Email: manager@soemco.com')
  console.log('   Password: manager123')
  console.log('   Role: Branch Manager')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔐 ADMIN ACCOUNT:')
  console.log('   Email: admin@soemco.com')
  console.log('   Password: admin123')
  console.log('   Role: Administrator')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✨ Seeding completed!')
}

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
      await runSeedScript()
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