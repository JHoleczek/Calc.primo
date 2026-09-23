import type { ReactNode } from 'react'

export interface Choice<T extends string | number> {
  value: T
  label: ReactNode
  hint?: ReactNode
  /** Podgląd (rysunek katalogowy) nad etykietą – dekoracyjny, opis jest w etykiecie. */
  image?: string
}

interface ChoiceGroupProps<T extends string | number> {
  name: string
  value: T
  choices: Choice<T>[]
  onChange: (value: T) => void
  variant?: 'chips' | 'cards'
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
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {choices.map((choice) => {
        const id = `${name}-${choice.value}`
        const checked = choice.value === value
        return (
          <label key={id} htmlFor={id} className={`choice${checked ? ' choice--checked' : ''}`}>
            <input
              type="radio"
              id={id}
              name={name}
              checked={checked}
              onChange={() => onChange(choice.value)}
            />
            {choice.image && <img className="choice__img" src={choice.image} alt="" loading="lazy" />}
            <span className="choice__label">{choice.label}</span>
            {choice.hint && <span className="choice__hint">{choice.hint}</span>}
          </label>
        )
      })}
    </div>
  )
}
