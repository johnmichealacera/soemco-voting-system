import type { Prisma } from "@prisma/client"
import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Keeps `Branch.managerId` in sync when `User.role` changes to/from BRANCH_MANAGER.
 * When promoting: assigns this user as manager of their member branch and demotes any previous manager on that branch.
 * When demoting: clears `managerId` on branches that pointed at this user.
 */
export async function syncBranchForUserRoleChange(
  tx: Prisma.TransactionClient,
  userId: string,
  newRole: UserRole
) {
  if (newRole === UserRole.BRANCH_MANAGER) {
    const profile = await tx.memberProfile.findUnique({
      where: { userId },
      select: { branchId: true },
    })
    if (!profile?.branchId) return

    const branch = await tx.branch.findUnique({
      where: { id: profile.branchId },
      select: { id: true, managerId: true },
    })
    if (!branch) return

    if (branch.managerId && branch.managerId !== userId) {
      await tx.user.update({
        where: { id: branch.managerId },
        data: { role: UserRole.MEMBER },
      })
    }

    await tx.branch.update({
      where: { id: branch.id },
      data: { managerId: userId },
    })
    return
  }

  await tx.branch.updateMany({
    where: { managerId: userId },
    data: { managerId: null },
  })
}

export type BranchManagerDisplay = {
  id: string
  name: string | null
  email: string
}

type BranchWithManager = {
  id: string
  managerId: string | null
  manager: BranchManagerDisplay | null
}

/**
 * If `managerId` was never set but a user has BRANCH_MANAGER and belongs to this branch, expose them as manager (legacy rows).
 */
export async function attachInferredBranchManagers<
  T extends BranchWithManager,
>(branches: T[]): Promise<T[]> {
  const missing = branches.filter((b) => !b.managerId)
  if (missing.length === 0) return branches

  const branchIds = missing.map((b) => b.id)
  const users = await prisma.user.findMany({
    where: {
      role: UserRole.BRANCH_MANAGER,
      memberProfile: { branchId: { in: branchIds } },
    },
    select: {
      id: true,
      name: true,
      email: true,
      memberProfile: { select: { branchId: true } },
    },
  })

  const byBranchId = new Map<string, BranchManagerDisplay>()
  for (const u of users) {
    const bid = u.memberProfile?.branchId
    if (bid) {
      byBranchId.set(bid, { id: u.id, name: u.name, email: u.email })
    }
  }

  return branches.map((b) => {
    if (b.managerId || b.manager) return b
    const inferred = byBranchId.get(b.id)
    if (!inferred) return b
    return {
      ...b,
      managerId: inferred.id,
      manager: inferred,
    }
  })
}
