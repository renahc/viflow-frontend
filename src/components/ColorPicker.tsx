import { labelColors } from '../lib/labels'
import type { LabelColor } from '../lib/labels'

type Props = { name: string; value: LabelColor; onChange: (color: LabelColor) => void; legend?: string }

export function ColorPicker({ name, value, onChange, legend = 'Color' }: Props) {
  return <fieldset className="label-palette color-picker"><legend>{legend}</legend>
    <div className="label-swatches">{labelColors.map(option => (
      <label key={option.id} className="label-swatch" style={{ background: option.background, color: option.text }} title={option.name}>
        <input type="radio" name={name} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} aria-label={option.name} />
        <span aria-hidden="true" className="swatch-center" style={{ background: option.text }} />
      </label>
    ))}</div>
  </fieldset>
}
