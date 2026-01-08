import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { generateMemberId } from "@/lib/utils"
import { UserRole, MemberStatus } from "@prisma/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, firstName, lastName, middleName, dateOfBirth, address, phoneNumber } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and member profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || `${firstName} ${lastName}`,
        role: UserRole.MEMBER,
        memberProfile: {
          create: {
            memberId: generateMemberId(),
            firstName,
            lastName,
            middleName,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            address,
            phoneNumber,
            status: MemberStatus.PENDING_VERIFICATION,
          },
        },
      },
      include: {
        memberProfile: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          memberProfile: user.memberProfile,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error registering user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

