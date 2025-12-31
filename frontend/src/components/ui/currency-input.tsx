import * as React from "react"
import { Input } from "@/components/ui/input"
import { currencyApplyMask } from "@/lib/masks/currency"

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onValueChange?: (value: string) => void
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, onChange, onValueChange, value, ...props }, ref) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const maskedValue = currencyApplyMask(e.target.value)
      
      e.target.value = maskedValue
      
      if (onChange) {
        onChange(e)
      }
      
      if (onValueChange) {
        onValueChange(maskedValue)
      }
    }

    // Se value for numérico, converte para string monetária formatada
    const displayValue = value !== undefined 
      ? currencyApplyMask(String(typeof value === 'number' ? value.toFixed(2).replace('.', '') : value)) 
      : undefined

    return (
      <Input
        ref={ref}
        className={className}
        value={displayValue}
        onChange={handleChange}
        placeholder="R$ 0,00"
        maxLength={20}
        {...props}
      />
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
