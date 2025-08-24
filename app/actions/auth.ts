"use server"

import { signOut as nextAuthSignOut } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function signOutAction() {
  await nextAuthSignOut()
  redirect("/auth/login")
}