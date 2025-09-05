import React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle } from "lucide-react"

interface DisconnectConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: string
  onConfirm: () => void
  isLoading?: boolean
}

export function DisconnectConfirmationDialog({
  open,
  onOpenChange,
  provider,
  onConfirm,
  isLoading = false
}: DisconnectConfirmationDialogProps) {
  const isMetaProvider = provider.toLowerCase() === 'meta' || provider.toLowerCase().includes('facebook')
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Disconnect {provider}?
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription className="space-y-3 pt-4">
            {isMetaProvider ? (
              <>
                <p className="font-semibold text-red-600">
                  WARNING: This action will permanently delete ALL data associated with your Meta (Facebook & Instagram) connection:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All campaigns and their performance data</li>
                  <li>All ad groups and targeting information</li>
                  <li>All ads and creative assets</li>
                  <li>All historical insights and metrics</li>
                  <li>All change tracking history</li>
                  <li>All stored images and assets</li>
                </ul>
                <p className="text-sm font-medium">
                  This data cannot be recovered. You will need to sync again from Meta to restore the data.
                </p>
              </>
            ) : (
              <>
                <p>
                  Are you sure you want to disconnect {provider}? 
                </p>
                <p className="text-sm">
                  You can reconnect at any time to sync your data again.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={isMetaProvider ? "bg-red-600 hover:bg-red-700" : ""}
            disabled={isLoading}
          >
            {isLoading ? "Disconnecting..." : isMetaProvider ? "Delete All Data & Disconnect" : "Disconnect"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}