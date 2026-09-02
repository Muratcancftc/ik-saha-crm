import type { Metadata } from 'next'
import LoginForm from '@/components/login-form'

export const metadata: Metadata = { title: 'Giriş | İK Saha' }

export default function GirisPage() {
  return <LoginForm />
}