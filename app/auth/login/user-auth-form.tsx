"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, User, Crown } from "lucide-react"

const userAuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type FormData = z.infer<typeof userAuthSchema>

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(userAuthSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false)

  async function onSubmit(data: FormData) {
    setIsLoading(true)

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
      callbackUrl,
    })

    setIsLoading(false)

    if (result?.error) {
      toast({
        title: "Authentication failed",
        description: "Please check your email and password.",
        variant: "destructive",
      })
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  // Quick login function for demo accounts
  async function quickLogin(email: string, password: string) {
    setValue("email", email)
    setValue("password", password)
    await onSubmit({ email, password })
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder="Enter your email"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading || isGoogleLoading}
              {...register("email")}
            />
            {errors?.email && (
              <p className="px-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              Password
            </Label>
            <Input
              id="password"
              placeholder="Password"
              type="password"
              autoCapitalize="none"
              autoComplete="current-password"
              disabled={isLoading || isGoogleLoading}
              {...register("password")}
            />
            {errors?.password && (
              <p className="px-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign In with Email
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="text-xs text-center text-muted-foreground mb-2">
          Quick Demo Login
        </div>
        <Button
          variant="outline"
          type="button"
          className="justify-start"
          disabled={isLoading || isGoogleLoading}
          onClick={() => quickLogin("admin@demo.com", "admin123")}
        >
          <Shield className="mr-2 h-4 w-4 text-red-600" />
          <span className="flex-1 text-left">Admin User</span>
          <Badge variant="destructive" className="ml-2">ADMIN</Badge>
        </Button>
        <Button
          variant="outline"
          type="button"
          className="justify-start"
          disabled={isLoading || isGoogleLoading}
          onClick={() => quickLogin("pro@demo.com", "demo123")}
        >
          <Crown className="mr-2 h-4 w-4 text-yellow-600" />
          <span className="flex-1 text-left">Pro Customer</span>
          <Badge className="ml-2">PRO</Badge>
        </Button>
        <Button
          variant="outline"
          type="button"
          className="justify-start"
          disabled={isLoading || isGoogleLoading}
          onClick={() => quickLogin("free@demo.com", "demo123")}
        >
          <User className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left">Free Customer</span>
          <Badge variant="outline" className="ml-2">FREE</Badge>
        </Button>
      </div>
      <Alert className="mt-2">
        <AlertDescription className="text-xs">
          <strong>Demo Credentials:</strong>
          <div className="mt-2 space-y-1 font-mono text-xs">
            <div>🛡️ admin@demo.com / admin123</div>
            <div>👑 pro@demo.com / demo123</div>
            <div>👤 free@demo.com / demo123</div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}