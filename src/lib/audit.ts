import { prisma } from "./prisma"

export interface AuditLogData {
  userId?: string
  memberId?: string
  action: string
  entityType: string
  entityId: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(data: AuditLogData) {
  return await prisma.auditTrail.create({
    data: {
      userId: data.userId,
      memberId: data.memberId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      changes: data.changes ? JSON.stringify(data.changes) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  })
}

