import { Pencil, X, Copy, ChevronUp, Check } from 'lucide-react'

type IconProps = {
  className?: string
  title?: string
}

export function EditIcon({ className = '', title = 'Edit' }: IconProps) {
  return <Pencil className={className} size={16} aria-label={title} />
}

export function DeleteIcon({ className = '', title = 'Delete' }: IconProps) {
  return <X className={className} size={16} aria-label={title} />
}

export function DuplicateIcon({ className = '', title = 'Duplicate' }: IconProps) {
  return <Copy className={className} size={16} aria-label={title} />
}

export function CollapseIcon({ className = '', title = 'Collapse' }: IconProps) {
  return <ChevronUp className={className} size={16} aria-label={title} />
}

export function DoneIcon({ className = '', title = 'Done' }: IconProps) {
  return <Check className={className} size={16} aria-label={title} />
}
