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
        password: { label: "Password", type: "password" }
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

