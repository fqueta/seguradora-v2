import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PerPageSelectorProps {
    value: number;
    onValueChange: (value: number) => void;
    options?: number[];
}

export function PerPageSelector({ 
    value, 
    onValueChange, 
    options = [50, 100, 500, 1000] 
}: PerPageSelectorProps) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Por página</span>
            <Select 
                value={value.toString()} 
                onValueChange={(val) => onValueChange(Number(val))}
            >
                <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder={value.toString()} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt} value={opt.toString()}>
                            {opt}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
