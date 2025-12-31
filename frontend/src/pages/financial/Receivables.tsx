import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Filter, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AccountsReceivableTable from '@/components/financial/AccountsReceivableTable';
import { accountsReceivableService, categoriesService } from '@/services/financialService';
import { AccountReceivable, AccountStatus, FinancialCategory } from '@/types/financial';

const ReceivablesPage: React.FC = () => {
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [groupBy, setGroupBy] = useState<string>('none');
  const [search, setSearch] = useState<string>('');
  const [summary, setSummary] = useState<{ pending: number; paid: number; total: number }>({ pending: 0, paid: 0, total: 0 });

  const period = useMemo(() => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { startDate: fmt(start), endDate: fmt(end) };
  }, [month, year]);

  const monthLabel = useMemo(() => {
    return new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [month, year]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const percentageReceived = useMemo(() => {
    if (summary.total <= 0) return 0;
    return Math.min(100, Math.round((summary.paid / summary.total) * 100));
  }, [summary]);

  const loadCategories = async () => {
    try {
      const data = await categoriesService.getAll();
      setCategories(data);
    } catch {
      toast.error('Erro ao carregar categorias financeiras');
    }
  };

  const loadSummary = async () => {
    try {
      const pendingResp = await accountsReceivableService.getAll({
        status: AccountStatus.PENDING,
        startDate: period.startDate,
        endDate: period.endDate,
        limit: 1000,
        search,
      });
      const paidResp = await accountsReceivableService.getAll({
        status: AccountStatus.PAID,
        startDate: period.startDate,
        endDate: period.endDate,
        limit: 1000,
        search,
      });
      const pending = pendingResp.data.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
      const paid = paidResp.data.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
      setSummary({ pending, paid, total: pending + paid });
    } catch {
      toast.error('Erro ao carregar resumo de receitas');
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadSummary();
  }, [period, search]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <div className="xl:col-span-3">
        <div className="bg-green-700 text-white rounded-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-green-800 border-none text-white hover:bg-green-900" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-green-800 rounded-md font-semibold">{monthLabel}</div>
            <Button variant="outline" className="bg-green-800 border-none text-white hover:bg-green-900" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-52 bg-green-800 border-none text-white">
                <SelectValue placeholder="Agrupar Receitas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não agrupar</SelectItem>
                <SelectItem value="category">Por categoria</SelectItem>
                <SelectItem value="paymentMethod">Por forma de pagamento</SelectItem>
                <SelectItem value="customer">Por cliente</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-green-800 border-none text-white hover:bg-green-900">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" className="bg-green-800 border-none text-white hover:bg-green-900">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <div className="w-64">
            <Input
              placeholder="Procurar"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <AccountsReceivableTable 
            categories={categories} 
            groupBy={groupBy} 
            startDate={period.startDate} 
            endDate={period.endDate}
            search={search}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-700 text-white w-12 h-12 rounded-full flex items-center justify-center">📌</div>
              <div>
                <div className="text-xs text-gray-600">RECEITAS PENDENTES</div>
                <div className="text-xl font-semibold">{formatCurrency(summary.pending)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-700 text-white w-12 h-12 rounded-full flex items-center justify-center">✅</div>
              <div>
                <div className="text-xs text-gray-600">RECEITAS RECEBIDAS</div>
                <div className="text-xl font-semibold">{formatCurrency(summary.paid)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="bg-green-700 text-white w-12 h-12 rounded-full flex items-center justify-center">☑️</div>
              <div>
                <div className="text-xs text-gray-600">TOTAL</div>
                <div className="text-xl font-semibold">{formatCurrency(summary.total)}</div>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={percentageReceived} />
              <div className="text-xs text-gray-600 mt-1">{percentageReceived} % porcentagem recebido</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReceivablesPage;
