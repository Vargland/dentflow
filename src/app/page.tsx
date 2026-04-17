import { redirect } from 'next/navigation'

/** Root route — redirects to the dashboard home page. */
export default function Home() {
  redirect('/dashboard')
}
