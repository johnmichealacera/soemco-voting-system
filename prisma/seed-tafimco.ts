import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { UserRole, MemberStatus } from "@prisma/client"

const prisma = new PrismaClient()

const TAFIMCO_EMAILS = {
  member: "member@tafimco.com",
  admin: "admin@tafimco.com",
  branchManager: "manager@tafimco.com",
} as const

function generateMemberId(): string {
  const prefix = "MEM"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

async function main() {
  console.log("🌱 Seeding database for TAFIMCO...")

  const memberPassword = await bcrypt.hash("member123", 12)
  const adminPassword = await bcrypt.hash("admin123", 12)
  const branchManagerPassword = await bcrypt.hash("manager123", 12)

  // Create default branch for TAFIMCO
  const branch = await prisma.branch.upsert({
    where: { code: "TAFIMCO-HQ" },
    update: {},
    create: {
      name: "TAFIMCO Head Office",
      code: "TAFIMCO-HQ",
      address: "TAFIMCO Main Office",
      isActive: true,
    },
  })
  console.log("✅ Created/updated branch:", branch.name)

  // Create Member Account
  const member = await prisma.user.upsert({
    where: { email: TAFIMCO_EMAILS.member },
    update: {},
    create: {
      email: TAFIMCO_EMAILS.member,
      password: memberPassword,
      name: "John Doe",
      role: UserRole.MEMBER,
      memberProfile: {
        create: {
          memberId: generateMemberId(),
          firstName: "John",
          lastName: "Doe",
          status: MemberStatus.ACTIVE,
          branchId: branch.id,
          address: "123 Cooperative Street",
          phoneNumber: "+63 912 345 6789",
        },
      },
    },
    include: { memberProfile: true },
  })
  console.log("✅ Created Member account:", member.email)

  // Create Admin Account
  const admin = await prisma.user.upsert({
    where: { email: TAFIMCO_EMAILS.admin },
    update: {},
    create: {
      email: TAFIMCO_EMAILS.admin,
      password: adminPassword,
      name: "Admin User",
      role: UserRole.ADMIN,
      memberProfile: {
        create: {
          memberId: generateMemberId(),
          firstName: "Admin",
          lastName: "User",
          status: MemberStatus.ACTIVE,
          branchId: branch.id,
          address: "Admin Office",
          phoneNumber: "+63 912 345 6780",
        },
      },
    },
    include: { memberProfile: true },
  })
  console.log("✅ Created Admin account:", admin.email)

  // Create Branch Manager Account (assigned to Head Office)
  const branchManager = await prisma.user.upsert({
    where: { email: TAFIMCO_EMAILS.branchManager },
    update: {},
    create: {
      email: TAFIMCO_EMAILS.branchManager,
      password: branchManagerPassword,
      name: "Branch Manager",
      role: UserRole.BRANCH_MANAGER,
      memberProfile: {
        create: {
          memberId: generateMemberId(),
          firstName: "Branch",
          lastName: "Manager",
          status: MemberStatus.ACTIVE,
          branchId: branch.id,
          address: "Branch Office",
          phoneNumber: "+63 912 345 6781",
        },
      },
    },
    include: { memberProfile: true },
  })
  console.log("✅ Created Branch Manager account:", branchManager.email)

  // Assign branch manager to Head Office
  await prisma.branch.update({
    where: { id: branch.id },
    data: { managerId: branchManager.id },
  })
  console.log("✅ Assigned Branch Manager to Head Office")

  console.log("\n📋 TAFIMCO Test Accounts Created:")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("👤 MEMBER ACCOUNT:")
  console.log("   Email: " + TAFIMCO_EMAILS.member)
  console.log("   Password: member123")
  console.log("   Role: Member")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("🏢 BRANCH MANAGER ACCOUNT:")
  console.log("   Email: " + TAFIMCO_EMAILS.branchManager)
  console.log("   Password: manager123")
  console.log("   Role: Branch Manager")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("🔐 ADMIN ACCOUNT:")
  console.log("   Email: " + TAFIMCO_EMAILS.admin)
  console.log("   Password: admin123")
  console.log("   Role: Administrator")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("\n✨ TAFIMCO seeding completed!")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding TAFIMCO database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
