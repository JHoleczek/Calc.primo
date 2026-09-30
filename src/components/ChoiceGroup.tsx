import type { CSSProperties, ReactNode } from 'react'

export interface Choice<T extends string | number> {
  value: T
  label: ReactNode
  hint?: ReactNode
  /** Ikona (np. izometryczna bryła) nad etykietą – dekoracyjna. */
  icon?: ReactNode
  /** Opcja niedostępna przy obecnych wyborach – widoczna, ale wyszarzona i nieklikalna. */
  disabled?: boolean
  /** Krótka przyczyna niedostępności (pokazywana zamiast podpowiedzi). */
  disabledReason?: string
}

interface ChoiceGroupProps<T extends string | number> {
  name: string
  value: T
  choices: Choice<T>[]
  onChange: (value: T) => void
  /** chips – w linii, grid – siatka równych pól (np. promienie), cards – karty z podglądem, tiles – niskie kafelki: tekst + podgląd obok. */
  variant?: 'chips' | 'grid' | 'cards' | 'tiles'
  columns?: number
}

/** Grupa radio stylowana jako „chipy” lub karty. */
export function ChoiceGroup<T extends string | number>({
  name,
  value,
  choices,
  onChange,
  variant = 'chips',
  columns,
}: ChoiceGroupProps<T>) {
  return (
    <div
      className={`choice-group choice-group--${variant}`}
      role="radiogroup"
      // Liczba kolumn jako zmienna CSS – arkusz może ją zmniejszyć na wąskim ekranie.
      style={columns ? ({ '--cols': columns } as CSSProperties) : undefined}
    >
      {choices.map((choice) => {
        const id = `${name}-${choice.value}`
        const checked = choice.value === value
        return (
          <label
            key={id}
            htmlFor={id}
            className={`choice${checked ? ' choice--checked' : ''}${choice.disabled ? ' choice--disabled' : ''}`}
            title={choice.disabled ? choice.disabledReason : undefined}
          >
            <input
              type="radio"
              id={id}
              name={name}
              checked={checked}
              disabled={choice.disabled}
              onChange={() => onChange(choice.value)}
            />
            {choice.icon && <span className="choice__icon">{choice.icon}</span>}
            <span className="choice__label">{choice.label}</span>
            {choice.hint && <span className="choice__hint">{choice.hint}</span>}
            {choice.disabled && choice.disabledReason && (
              // W kartach przyczyna jest widoczna; w chipach tylko dla czytników ekranu (i w dymku).
              <span className={variant === 'cards' ? 'choice__hint choice__hint--reason' : 'sr-only'}>
                {choice.disabledReason}
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}
