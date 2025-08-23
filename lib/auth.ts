import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import type { User as PrismaUser, Account, UserRole } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      accountId: string | null
      role: UserRole
    }
  }
  
  interface User extends PrismaUser {}
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const { email, password } = await loginSchema.parseAsync(credentials)
          
          const user = await prisma.user.findUnique({
            where: { email },
            include: { account: true }
          })
          
          if (!user || !user.password) {
            console.error(`Auth failed: User not found or no password for ${email}`)
            throw new Error("Invalid credentials")
          }
          
          const isPasswordValid = await bcrypt.compare(password, user.password)
          
          if (!isPasswordValid) {
            console.error(`Auth failed: Invalid password for ${email}`)
            throw new Error("Invalid credentials")
          }
          
          console.log(`Auth success for ${email}, role: ${user.role}`)
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            accountId: user.accountId,
            role: user.role,
            password: user.password,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            image: user.image,
            metadata: user.metadata
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.accountId = user.accountId
        token.role = user.role
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string | null
        session.user.accountId = token.accountId as string | null
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
})

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function getCurrentAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { account: true }
  })
  
  return user?.account
}