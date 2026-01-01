import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  /**
   * Descrição opcional exibida abaixo do label
   * Optional secondary text shown under the label
   */
  description?: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  loading?: boolean
  onSearch?: (searchTerm: string) => void
  searchTerm?: string
  /**
   * Tempo de debounce em ms para a busca (default: 250ms)
   * Debounce time in ms for search (default: 250ms)
   */
  debounceMs?: number
  /**
   * Função para criar um novo item. Se fornecida, exibe um botão de ação.
   * Function to create a new item. If provided, displays an action button.
   */
  onCreate?: () => void
  /**
   * Label para o botão de criar novo item (default: "Criar Novo")
   * Label for the create new item button (default: "Create New")
   */
  createLabel?: string
}

/**
 * Componente Combobox reutilizável com funcionalidade de autocomplete
 * Baseado no Command component do shadcn/ui
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Pesquisar...",
  emptyText = "Nenhuma opção encontrada.",
  disabled = false,
  className,
  loading = false,
  onSearch,
  searchTerm,
  debounceMs = 250,
  onCreate,
  createLabel = "Criar Novo",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState(searchTerm || "")

  const selectedOption = options.find((option) => option.value === value)

  /**
   * Efeito de debounce para disparar busca remota suavemente
   * Debounced effect to trigger remote search smoothly
   */
  React.useEffect(() => {
    if (!onSearch) return
    const t = setTimeout(() => onSearch(searchValue), debounceMs)
    return () => clearTimeout(t)
  }, [searchValue, onSearch, debounceMs])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled || loading}
        >
          {loading ? (
            "Carregando..."
          ) : selectedOption ? (
            selectedOption.label
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {/* Ajusta a largura do popover para igualar ao input/trigger */}
      {/* Adjust popover width to match input/trigger width */}
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={(value) => {
              // Atualiza o termo local; busca remota é disparada via debounce
              // Update local term; remote search is triggered via debounce
              setSearchValue(value)
            }}
          />
          <CommandList>
            {onCreate && (
              <CommandGroup>
                <CommandItem
                  value="__create_new_item__"
                  onSelect={() => {
                    onCreate()
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 text-primary cursor-pointer bg-muted/30 hover:bg-muted/50 font-medium border-b"
                >
                  <Plus className="h-4 w-4" />
                  {createLabel}
                </CommandItem>
              </CommandGroup>
            )}
            
            <CommandEmpty>{emptyText}</CommandEmpty>
            
            <CommandGroup>
              {(onSearch ? options : options.filter((option) =>
                option.label.toLowerCase().includes(searchValue.toLowerCase())
              )).map((option) => (
                <CommandItem
                  key={option.value}
                  // Importante: value deve ser texto pesquisável
                  // Important: value should be searchable text (label)
                  value={option.label}
                  disabled={option.disabled}
                  className="py-3 px-3 data-[selected=true]:bg-blue-100"
                  onSelect={() => {
                    if (option.value === value) {
                      onValueChange("")
                    } else {
                      onValueChange(option.value)
                    }
                    setOpen(false)
                  }}
                >
                  <div className="flex w-full items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{option.label}</div>
                      {option.description ? (
                        <div className="text-xs text-muted-foreground truncate">{option.description}</div>
                      ) : null}
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4 shrink-0 opacity-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


/**
 * Hook para transformar arrays de objetos em opções do Combobox
 */
export function useComboboxOptions<T extends Record<string, any>>(
  items: T[],
  valueKey: keyof T,
  labelKey: keyof T,
  disabledKey?: keyof T,
  /**
   * Função para construir a descrição exibida abaixo do label
   * Function to build the description shown under the label
   */
  buildDescription?: (item: T) => string
): ComboboxOption[] {
  return React.useMemo(() => {
    return items.map((item) => ({
      value: String(item[valueKey]),
      label: String(item[labelKey]),
      description: buildDescription ? buildDescription(item) : undefined,
      disabled: disabledKey ? Boolean(item[disabledKey]) : false,
    }))
  }, [items, valueKey, labelKey, disabledKey, buildDescription])
}