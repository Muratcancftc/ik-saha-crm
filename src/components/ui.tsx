import { cn } from '@/lib/utils'
import { Icon, type IconName } from './icons'

export function Card({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  desc,
  action,
}: {
  title: string
  desc?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  )
}

const BADGE_STYLES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export function Badge({
  tone = 'slate',
  className,
  children,
}: {
  tone?: keyof typeof BADGE_STYLES
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
        BADGE_STYLES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'indigo',
  valueTone = 'neutral',
}: {
  icon: IconName
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: 'indigo' | 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'slate'
  valueTone?: 'green' | 'red' | 'amber' | 'neutral'
}) {
  const tones: Record<string, { bar: string; icon: string; iconBg: string }> = {
    indigo: { bar: 'bg-indigo-500', icon: 'text-indigo-600', iconBg: 'bg-indigo-50' },
    green: { bar: 'bg-emerald-500', icon: 'text-emerald-600', iconBg: 'bg-emerald-50' },
    red: { bar: 'bg-rose-500', icon: 'text-rose-600', iconBg: 'bg-rose-50' },
    amber: { bar: 'bg-amber-500', icon: 'text-amber-600', iconBg: 'bg-amber-50' },
    blue: { bar: 'bg-sky-500', icon: 'text-sky-600', iconBg: 'bg-sky-50' },
    violet: { bar: 'bg-violet-500', icon: 'text-violet-600', iconBg: 'bg-violet-50' },
    slate: { bar: 'bg-slate-400', icon: 'text-slate-500', iconBg: 'bg-slate-100' },
  }
  const values: Record<string, string> = {
    green: 'text-emerald-700',
    red: 'text-rose-700',
    amber: 'text-amber-700',
    neutral: 'text-slate-900',
  }
  const t = tones[tone]
  return (
    <Card className="relative overflow-hidden p-5">
      <div className={`absolute inset-y-0 left-0 w-1 ${t.bar}`} />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`mt-2 truncate text-3xl font-bold tabular-nums tracking-tight ${values[valueTone]}`}>{value}</p>
          {sub && <div className="mt-1.5 text-xs text-slate-500">{sub}</div>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg} ${t.icon}`}>
          <Icon name={icon} size={20} />
        </div>
      </div>
    </Card>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}) {
  const styles: Record<string, string> = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm disabled:opacity-60',
    secondary:
      'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-60',
    danger: 'bg-red-600 text-white hover:bg-red-500 disabled:opacity-60',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition',
        size === 'md' ? 'px-3.5 py-2 text-sm' : 'px-2.5 py-1.5 text-xs',
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
        className
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function EmptyState({
  icon = 'search',
  title,
  desc,
}: {
  icon?: IconName
  title: string
  desc?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name={icon} size={22} />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-700">{title}</p>
      {desc && <p className="mt-1 text-xs text-slate-500">{desc}</p>}
    </div>
  )
}

export function Th({
  children,
  className,
  colSpan,
}: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <th
      colSpan={colSpan}
      className={cn(
        'whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500',
        className
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  colSpan,
}: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td
      colSpan={colSpan}
      className={cn('whitespace-nowrap px-4 py-3 text-sm text-slate-700', className)}
    >
      {children}
    </td>
  )
}