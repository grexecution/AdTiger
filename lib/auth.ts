import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import type { User as PrismaUser, Account } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      accountId: string
    }
  }
  
  interface User extends PrismaUser {}
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
            throw new Error("Invalid credentials")
          }
          
          const isPasswordValid = await bcrypt.compare(password, user.password)
          
          if (!isPasswordValid) {
            throw new Error("Invalid credentials")
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            accountId: user.accountId,
            password: user.password,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        } catch (error) {
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
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.accountId = token.accountId as string
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