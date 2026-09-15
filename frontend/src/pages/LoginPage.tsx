import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Lock, User } from 'lucide-react'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  async function onSubmit(values: LoginForm) {
    setError(null)
    setIsSubmitting(true)
    try {
      await login(values.username, values.password)
    } catch {
      setError('Invalid username or password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // If already authenticated, redirect immediately
  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-slate-400 font-sans text-sm">Checking authentication…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 flex-col justify-center px-16">
        <img
          src="/clg-logo-white.png"
          alt="NSS Sports Camp"
          className="h-28 w-28 object-contain mb-8"
        />
        <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
          University Athletics
        </h1>
        <p className="font-sans text-brand-700 text-lg leading-relaxed">
          Sports Camp Attendance System
        </p>
        <div className="mt-12 w-16 h-1 bg-parchment rounded-full" />
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex flex-col items-center text-center">
            <img src="/nss_logo.png" alt="NSS Sports Camp" className="h-16 w-16 object-contain mb-3" />
            <h1 className="font-display text-2xl font-bold text-brand-900">Sports Camp Attendance</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to continue</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <img src="/nss_logo.png" alt="NSS Sports Camp" className="h-20 w-20 object-contain" />
            </div>
            <h2 className="font-display text-xl font-semibold text-brand-900 mb-6">
              Sign In
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm font-sans text-alert">
                {error}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans text-sm text-slate-600">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            {...field}
                            className="pl-9 font-sans border-border h-10"
                            placeholder="Enter your username"
                            autoComplete="username"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans text-sm text-slate-600">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            {...field}
                            type="password"
                            className="pl-9 font-sans border-border h-10"
                            placeholder="Enter your password"
                            autoComplete="current-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 font-sans font-medium bg-accent hover:bg-accent-light disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-center text-xs text-slate-400 font-sans mt-6">
            Authorized personnel only. All activity is monitored.
          </p>
        </div>
      </div>
    </div>
  )
}
