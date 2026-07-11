'use client'
import dynamic from 'next/dynamic'
import AdminLayout from '@/components/AdminLayout'
import MatrixSkeleton from './MatrixSkeleton'

// Code-split the heavy grid so the route shell + skeleton paint instantly,
// then the matrix chunk streams in. ssr:false keeps it out of the server bundle.
const MatrixClient = dynamic(() => import('./MatrixClient'), {
  ssr: false,
  loading: () => (
    <AdminLayout>
      <div className="space-y-5">
        <div className="h-10 w-52 skeleton rounded-xl" />
        <MatrixSkeleton />
      </div>
    </AdminLayout>
  ),
})

export default function MatrixLazy({ adminName, adminEmail }: { adminName: string; adminEmail: string }) {
  return <MatrixClient adminName={adminName} adminEmail={adminEmail} />
}
