import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

function SummaryCard({ label, value, icon: Icon }: SummaryCardProps) {
  return (
    <Card className="bg-white border-none shadow-sm overflow-hidden">
      <CardContent className="p-0 flex items-center">
        <div className="p-4 flex items-center justify-center bg-slate-50 border-r border-slate-100">
          <div className="bg-white p-2 rounded-md shadow-sm border border-slate-100">
            <Icon className="h-6 w-6 text-slate-900" />
          </div>
        </div>
        <div className="px-4 py-2">
          <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
          <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface SummaryCardsProps {
  items: {
    label: string;
    value: string | number;
    icon: LucideIcon;
  }[];
}

export function SummaryCards({ items }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map((item, index) => (
        <SummaryCard key={index} {...item} />
      ))}
    </div>
  );
}
