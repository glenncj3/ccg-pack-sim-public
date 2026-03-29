import { useState, useRef } from 'react'

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'placeholder'> {
  value: number
  onChange: (value: number) => void
}

export function RequiredNumberInput({ value, onChange, onBlur, className, ...rest }: Props) {
  const [localValue, setLocalValue] = useState<string | null>(null)
  const [empty, setEmpty] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  // Display localValue while editing, otherwise derive from parent prop
  const display = empty ? '' : (localValue ?? String(value))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setLocalValue(raw)

    if (raw === '' || raw === '-') {
      setEmpty(true)
      return
    }

    const num = Number(raw)
    if (!isNaN(num)) {
      setEmpty(false)
      onChange(num)
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (display === '' || isNaN(Number(display))) {
      setEmpty(true)
      ref.current?.focus()
      return
    }
    setEmpty(false)
    setLocalValue(null)
    onBlur?.(e)
  }

  const cls = empty
    ? className?.replace(/\bborder-border\b/, 'border-danger')
    : className

  return (
    <input
      ref={ref}
      type="number"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="Required"
      className={cls}
      {...rest}
    />
  )
}
