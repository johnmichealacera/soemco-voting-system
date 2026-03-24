import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }
    // if (session.user.role !== UserRole.ADMIN) {
    //   return NextResponse.json(
    //     { error: "Only administrators can purge members" },
    //     { status: 403 }
    //   )
    // }

    const body = await request.json().catch(() => ({}))
    const apply = body?.apply === true

    // Members with votes should never be deleted (data integrity).
    // Candidate-linked users should never be deleted (to preserve candidates).
    const purgeableMembers = await prisma.memberProfile.findMany({
      where: {
        votes: { none: {} },
        user: {
          role: UserRole.MEMBER,
          candidates: { none: {} },
          createdElections: { none: {} },
          managedBranches: { none: {} },
          workflowInstances: { none: {} },
          workflowSteps: { none: {} },
          auditTrails: { none: {} },
          notifications: { none: {} },
        },
      },
      select: {
        id: true,
        userId: true,
        memberId: true,
      },
    })

    const blockedByCandidate = await prisma.memberProfile.count({
      where: {
        user: { candidates: { some: {} } },
      },
    })

    const blockedByVotes = await prisma.memberProfile.count({
      where: {
        votes: { some: {} },
      },
    })

    const summary = {
      totalPurgeableMembers: purgeableMembers.length,
      blockedByCandidate,
      blockedByVotes,
      willApply: apply,
    }

    if (!apply) {
      return NextResponse.json({
        mode: "dry-run",
        summary,
        previewMemberIds: purgeableMembers.slice(0, 200).map((m) => m.memberId),
        message:
          "Dry run complete. Re-run with { apply: true } to delete non-candidate members without votes.",
      })
    }

    const userIdsToDelete = purgeableMembers.map((member) => member.userId)
    if (userIdsToDelete.length === 0) {
      return NextResponse.json({
        mode: "applied",
        summary: {
          ...summary,
          deletedUsers: 0,
          deletedMembers: 0,
        },
        message: "No members matched purge criteria.",
      })
    }

    // Delete only "pure member" user records that are not referenced elsewhere.
    // This cascades to MemberProfile via schema relation.
    const result = await prisma.user.deleteMany({
      where: {
        id: { in: userIdsToDelete },
        role: UserRole.MEMBER,
        candidates: { none: {} },
        createdElections: { none: {} },
        managedBranches: { none: {} },
        workflowInstances: { none: {} },
        workflowSteps: { none: {} },
        auditTrails: { none: {} },
        notifications: { none: {} },
      },
    })

    return NextResponse.json({
      mode: "applied",
      summary: {
        ...summary,
        deletedUsers: result.count,
        deletedMembers: result.count,
      },
      message: `Deleted ${result.count} non-candidate members without votes.`,
    })
  } catch (error: any) {
    console.error("Error purging non-candidate members:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to purge members" },
      { status: 500 }
    )
  }
}

