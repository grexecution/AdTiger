import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"
import { AdminHeader } from "@/components/admin/admin-header"
import { DatabaseStudio } from "@/components/admin/database-studio"

export default async function AdminDatabasePage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <AdminHeader />
      <DatabaseStudio />
    </div>
  )
}