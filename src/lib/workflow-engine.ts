import { prisma } from "./prisma"
import { WorkflowStatus, UserRole } from "@prisma/client"

export interface WorkflowStepConfig {
  stepName: string
  requiredRole?: UserRole
  assignedToId?: string
  order: number
}

export interface WorkflowTemplateConfig {
  name: string
  description?: string
  entityType: string
  steps: WorkflowStepConfig[]
}

export class WorkflowEngine {
  /**
   * Create a new workflow template
   */
  static async createTemplate(config: WorkflowTemplateConfig) {
    return await prisma.workflowTemplate.create({
      data: {
        name: config.name,
        description: config.description,
        entityType: config.entityType,
        steps: JSON.stringify(config.steps),
      },
    })
  }

  /**
   * Initialize a workflow instance
   */
  static async initializeWorkflow(
    templateId: string,
    entityType: string,
    entityId: string,
    initiatedById: string
  ) {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      throw new Error("Workflow template not found")
    }

    const steps = JSON.parse(template.steps) as WorkflowStepConfig[]

    const instance = await prisma.workflowInstance.create({
      data: {
        templateId,
        entityType,
        entityId,
        initiatedById,
        status: WorkflowStatus.PENDING,
        currentStepIndex: 0,
      },
    })

    // Create workflow steps
    for (const step of steps) {
      await prisma.workflowStep.create({
        data: {
          instanceId: instance.id,
          stepIndex: step.order,
          stepName: step.stepName,
          assignedToId: step.assignedToId,
          status: step.order === 0 ? WorkflowStatus.PENDING : WorkflowStatus.PENDING,
        },
      })
    }

    return instance
  }

  /**
   * Complete a workflow step
   */
  static async completeStep(
    stepId: string,
    userId: string,
    approved: boolean,
    comments?: string
  ) {
    const step = await prisma.workflowStep.findUnique({
      where: { id: stepId },
      include: { instance: true },
    })

    if (!step) {
      throw new Error("Workflow step not found")
    }

    if (step.assignedToId !== userId) {
      throw new Error("User not authorized to complete this step")
    }

    const status = approved ? WorkflowStatus.APPROVED : WorkflowStatus.REJECTED

    await prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        status,
        comments,
        completedAt: new Date(),
      },
    })

    if (approved) {
      // Move to next step or complete workflow
      const allSteps = await prisma.workflowStep.findMany({
        where: { instanceId: step.instanceId },
        orderBy: { stepIndex: "asc" },
      })

      const currentIndex = step.stepIndex
      const nextStep = allSteps.find((s) => s.stepIndex > currentIndex)

      if (nextStep) {
        // Activate next step
        await prisma.workflowStep.update({
          where: { id: nextStep.id },
          data: { status: WorkflowStatus.PENDING },
        })

        await prisma.workflowInstance.update({
          where: { id: step.instanceId },
          data: { currentStepIndex: nextStep.stepIndex },
        })
      } else {
        // Complete workflow
        await prisma.workflowInstance.update({
          where: { id: step.instanceId },
          data: {
            status: WorkflowStatus.APPROVED,
            completedAt: new Date(),
          },
        })
      }
    } else {
      // Reject workflow
      await prisma.workflowInstance.update({
        where: { id: step.instanceId },
        data: {
          status: WorkflowStatus.REJECTED,
          completedAt: new Date(),
        },
      })
    }

    return step
  }

  /**
   * Get workflow status for an entity
   */
  static async getWorkflowStatus(entityType: string, entityId: string) {
    return await prisma.workflowInstance.findFirst({
      where: {
        entityType,
        entityId,
      },
      include: {
        template: true,
        steps: {
          orderBy: { stepIndex: "asc" },
        },
      },
    })
  }
}

