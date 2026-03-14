import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import type { TipoOrigin } from '../types';
import { getDashboardTotals } from '../utils/financeCalculations';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const ResultadosMensais = () => {
    const { lancamentos, investimentos } = useStore();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [originFilter, setOriginFilter] = useState<TipoOrigin | 'GERAL'>('GERAL');

    const effectiveOrigin = originFilter === 'GERAL' ? undefined : originFilter;

    // Calcula Totais
    const totals = useMemo(() => {
        return getDashboardTotals(
            lancamentos || [], investimentos || [],
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            effectiveOrigin
        );
    }, [lancamentos, investimentos, selectedDate, effectiveOrigin]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Resultados Mensais (DRE)</h1>
                    <p className="text-slate-400 mt-1">Acompanhamento contábil exato do período de {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}.</p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex bg-card border border-border p-1 rounded-xl">
                        {(['GERAL', 'PF', 'PJ'] as const).map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setOriginFilter(opt)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${originFilter === opt ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                {opt === 'GERAL' ? 'Geral' : opt === 'PF' ? 'Pessoa Física' : 'Empresa PJ'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl">
                        <CalendarIcon size={18} className="text-primary" />
                        <input
                            type="month"
                            value={format(selectedDate, 'yyyy-MM')}
                            onChange={(e) => setSelectedDate(new Date(e.target.value + '-02'))}
                            className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card border-l-4 border-l-success relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-slate-400 font-medium">Receita Mês</p>
                        <div className="p-2 bg-success/20 rounded-lg text-success"><ArrowUpCircle size={20} /></div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100">{formatCurrency(totals.receita)}</h3>
                    <div className="absolute -bottom-4 -right-4 text-success/5 opacity-50 group-hover:scale-110 transition-transform"><ArrowUpCircle size={100} /></div>
                </div>

                <div className="glass-card border-l-4 border-l-danger relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-slate-400 font-medium">Despesa Geral Mês</p>
                        <div className="p-2 bg-danger/20 rounded-lg text-danger"><ArrowDownCircle size={20} /></div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100 mb-2">{formatCurrency(totals.despesa)}</h3>
                    <div className="flex flex-col gap-1 text-xs text-slate-400 mt-2 border-t border-slate-700/50 pt-3 relative z-10 w-full mb-2">
                        <div className="flex justify-between w-full">
                            <span>Gastos Fixos:</span>
                            <span className="font-semibold text-slate-300">{formatCurrency(totals.despesaFixa)}</span>
                        </div>
                        <div className="flex justify-between w-full">
                            <span>Gastos Variáveis:</span>
                            <span className="font-semibold text-slate-300">{formatCurrency(totals.despesaVariavel)}</span>
                        </div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 text-danger/5 opacity-50 group-hover:scale-110 transition-transform z-0"><ArrowDownCircle size={100} /></div>
                </div>

                <div className="glass-card border-l-4 border-l-primary relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-slate-400 font-medium">Lucro Líquido Real / Saldo</p>
                        <div className="p-2 bg-primary/20 rounded-lg text-primary"><Wallet size={20} /></div>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100">{formatCurrency(totals.caixaAcumulado)}</h3>
                    <div className="absolute -bottom-4 -right-4 text-primary/5 opacity-50 group-hover:scale-110 transition-transform"><Wallet size={100} /></div>
                </div>
            </div>
        </div>
    );
};

export default ResultadosMensais;
