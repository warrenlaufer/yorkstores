import { redirect } from 'next/navigation'

export default function DashboardDropRedirect({ params }: { params: { id: string } }) {
  redirect(`/drop/${params.id}`)
}
