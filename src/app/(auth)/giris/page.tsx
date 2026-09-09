import type { Metadata } from 'next'
import LoginForm from '@/components/login-form'

export const metadata: Metadata = { title: 'Giriş | ATALAY İnsan Kaynakları' }

export default function GirisPage() {
  return <LoginForm />
}