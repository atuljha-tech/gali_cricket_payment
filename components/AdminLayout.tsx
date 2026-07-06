import Navbar from './Navbar'

interface AdminLayoutProps {
  children: React.ReactNode
  adminName?: string
  adminEmail?: string
}

export default function AdminLayout({ children, adminName, adminEmail }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-950 pitch-bg">
      <Navbar adminName={adminName} adminEmail={adminEmail} />
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
