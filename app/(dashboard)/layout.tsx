import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { UserProvider } from '@/contexts/UserContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-0">
          <Header />
          <main className="flex-1 p-3 sm:p-4 lg:p-6 pt-16 lg:pt-6">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
