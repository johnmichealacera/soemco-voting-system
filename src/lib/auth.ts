import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { UserRole, MemberStatus } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        kioskAccess: { label: "Kiosk Access", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("Invalid credentials")
        }

        // Check if kiosk access is requested and validate role
        if (credentials.kioskAccess === "true") {
          if (user.role !== UserRole.ADMIN && user.role !== UserRole.BRANCH_MANAGER) {
            throw new Error("Unauthorized: Only Administrators and Branch Managers can access the kiosk")
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    }),
    CredentialsProvider({
      id: "kiosk",
      name: "Kiosk",
      credentials: {
        memberId: { label: "Member ID", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.memberId) {
          throw new Error("Member ID is required")
        }

        // Find member by memberId
        const member = await prisma.memberProfile.findUnique({
          where: { memberId: credentials.memberId },
          include: {
            user: true
          }
        })

        if (!member || !member.user) {
          throw new Error("Member not found")
        }

        // Check if member is active
        if (member.status !== MemberStatus.ACTIVE) {
          throw new Error("Member account is not active")
        }

        // Check if member has already voted in all available elections
        const now = new Date()

        // Get active elections that are within voting period
        const activeElections = await prisma.election.findMany({
          where: {
            status: "VOTING_ACTIVE",
            votingStartDate: { lte: now },
            votingEndDate: { gte: now },
          },
        })

        if (activeElections.length > 0) {
          // Check which elections the member has voted in
          const memberVotes = await prisma.vote.findMany({
            where: {
              memberId: member.id,
              electionId: {
                in: activeElections.map((e) => e.id),
              },
            },
            select: {
              electionId: true,
            },
          })

          const votedElectionIds = new Set(memberVotes.map((v) => v.electionId))

          // Check if member has voted in all active elections
          const hasVotedInAll = activeElections.every((election) =>
            votedElectionIds.has(election.id)
          )

          if (hasVotedInAll) {
            throw new Error("ALREADY_VOTED")
          }
        }

        return {
          id: member.user.id,
          email: member.user.email,
          name: `${member.firstName} ${member.lastName}`,
          role: member.user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as UserRole
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}

