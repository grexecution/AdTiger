import { Separator } from "@/components/ui/separator"
import { AccountSettingsForm } from "./account-settings-form"
import { getAccountContext } from "@/lib/account-context"

export default async function AccountSettingsPage() {
  const { account } = await getAccountContext()
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <Separator />
      <AccountSettingsForm account={account} />
    </div>
  )
}