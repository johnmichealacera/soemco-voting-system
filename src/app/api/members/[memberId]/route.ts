import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MemberStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can view member details
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const member = await prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // For BRANCH_MANAGER, ensure they can only access members from their assigned branch
    if (session.user.role === UserRole.BRANCH_MANAGER) {
      const managerBranch = await prisma.branch.findFirst({
        where: { managerId: session.user.id },
        select: { id: true }
      })

      if (!managerBranch || member.branchId !== managerBranch.id) {
        return NextResponse.json({ error: "You can only manage members from your assigned branch" }, { status: 403 })
      }
    }

    return NextResponse.json(member)
  } catch (error) {
    console.error("Error fetching member:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can update members
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      email,
      password,
      name,
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      address,
      phoneNumber,
      branchId,
      status,
    } = body

    const member = await prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: { user: true },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Update user data
    const userUpdateData: any = {}
    if (email && email !== member.user.email) {
      // Check if new email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })
      if (existingUser && existingUser.id !== member.userId) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        )
      }
      userUpdateData.email = email
    }
    if (name) userUpdateData.name = name
    if (password) {
      userUpdateData.password = await bcrypt.hash(password, 12)
    }

    // Update member profile data
    const memberUpdateData: any = {}
    if (firstName) memberUpdateData.firstName = firstName
    if (lastName) memberUpdateData.lastName = lastName
    if (middleName !== undefined) memberUpdateData.middleName = middleName || null
    if (dateOfBirth !== undefined) {
      memberUpdateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    }
    if (address !== undefined) memberUpdateData.address = address || null
    if (phoneNumber !== undefined) memberUpdateData.phoneNumber = phoneNumber || null
    if (branchId !== undefined) memberUpdateData.branchId = branchId || null
    if (status) memberUpdateData.status = status

    // Update both user and member profile
    await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: member.userId },
          data: userUpdateData,
        })
      }
      
      if (Object.keys(memberUpdateData).length > 0) {
        await tx.memberProfile.update({
          where: { id: memberId },
          data: memberUpdateData,
        })
      }
    })

    // Fetch updated member
    const updatedMember = await prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            votes: true,
          },
        },
      },
    })

    return NextResponse.json(updatedMember)
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can delete members
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const member = await prisma.memberProfile.findUnique({
      where: { id: memberId },
      include: {
        _count: {
          select: {
            votes: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Prevent deletion if member has votes (for data integrity)
    if (member._count.votes > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete member with existing votes. Consider deactivating instead.",
        },
        { status: 400 }
      )
    }

    // Delete member profile (this will cascade delete the user)
    await prisma.memberProfile.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ message: "Member deleted successfully" })
  } catch (error) {
    console.error("Error deleting member:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

