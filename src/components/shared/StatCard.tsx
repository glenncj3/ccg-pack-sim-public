interface Props {
  label: string
  value: string
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="bg-bg-tertiary rounded-lg p-3 text-center">
      <div className="text-xs text-text-secondary mb-1">{label}</div>
      <div className="text-xl font-bold text-text-primary">{value}</div>
    </div>
  )
}
