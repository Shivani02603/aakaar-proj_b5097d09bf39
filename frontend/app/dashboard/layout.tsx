import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import AuthGuard from '@/components/AuthGuard'

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </AuthGuard>
  )
}