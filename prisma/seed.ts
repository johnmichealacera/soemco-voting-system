import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { UserRole, MemberStatus } from '@prisma/client'

const prisma = new PrismaClient()

function generateMemberId(): string {
  const prefix = 'MEM'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

async function main() {
  console.log('🌱 Seeding database...')

  // Hash passwords
  const memberPassword = await bcrypt.hash('member123', 12)
  const adminPassword = await bcrypt.hash('admin123', 12)

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

  console.log('\n📋 Test Accounts Created:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 MEMBER ACCOUNT:')
  console.log('   Email: member@soemco.com')
  console.log('   Password: member123')
  console.log('   Role: Member')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔐 ADMIN ACCOUNT:')
  console.log('   Email: admin@soemco.com')
  console.log('   Password: admin123')
  console.log('   Role: Administrator')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✨ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

