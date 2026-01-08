import { prisma } from "./prisma"
import { NotificationType } from "@prisma/client"

export interface NotificationData {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  metadata?: Record<string, any>
  electionId?: string
}

export async function createNotification(data: NotificationData) {
  return await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      electionId: data.electionId,
    },
  })
}

export async function createBulkNotifications(
  userIds: string[],
  data: Omit<NotificationData, "userId">
) {
  const notifications = userIds.map((userId) => ({
    userId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    electionId: data.electionId,
  }))

  return await prisma.notification.createMany({
    data: notifications,
  })
}

export async function markNotificationAsRead(notificationId: string) {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  })
}

export async function markAllNotificationsAsRead(userId: string) {
  return await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
}

