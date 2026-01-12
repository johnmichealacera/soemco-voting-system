import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, MemberStatus } from "@prisma/client"
import bcrypt from "bcryptjs"
import { generateMemberId } from "@/lib/utils"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can view all members
    if (![UserRole.ADMIN, UserRole.BRANCH_MANAGER].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const role = searchParams.get("role") || ""
    let branch = searchParams.get("branch") || ""

    // For BRANCH_MANAGER, automatically filter to their assigned branch
    if (session.user.role === UserRole.BRANCH_MANAGER) {
      const managerBranch = await prisma.branch.findFirst({
        where: { managerId: session.user.id },
        select: { id: true }
      })

      if (managerBranch) {
        // Override any branch filter and force filter to manager's branch
        branch = managerBranch.id
      } else {
        // Branch manager not assigned to any branch, return empty results
        return NextResponse.json({
          members: [],
          pagination: {
            page: 1,
            pageSize: 0,
            total: 0,
            totalPages: 0,
          },
        })
      }
    }

    // Build where clause
    const where: any = {}

    // Filter by status
    if (status && Object.values(MemberStatus).includes(status as MemberStatus)) {
      where.status = status as MemberStatus
    }

    // Filter by role
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      where.user = {
        role: role as UserRole
      }
    }

    // Filter by branch
    if (branch && branch !== "All") {
      where.branchId = branch
    }

    // Search filter (search in memberId, firstName, lastName, email)
    if (search) {
      const searchConditions = [
        { memberId: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ]

      // If status filter exists, combine with AND
      if (where.status) {
        where.AND = [
          { status: where.status },
          { OR: searchConditions },
        ]
        delete where.status
      } else {
        where.OR = searchConditions
      }
    }

    // Get total count
    const total = await prisma.memberProfile.count({ where })

    // Calculate pagination
    const skip = (page - 1) * pageSize
    const totalPages = Math.ceil(total / pageSize)

    // Get members with pagination
    const members = await prisma.memberProfile.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    })

    return NextResponse.json({
      members,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN and BRANCH_MANAGER can create members
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

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, firstName, lastName" },
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
            middleName: middleName || null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            address: address || null,
            phoneNumber: phoneNumber || null,
            branchId: branchId || null,
            status: status || MemberStatus.PENDING_VERIFICATION,
          },
        },
      },
      include: {
        memberProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(user.memberProfile, { status: 201 })
  } catch (error) {
    console.error("Error creating member:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

