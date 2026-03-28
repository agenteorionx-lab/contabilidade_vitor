import { useMemo, useState } from 'react';
import { useStore, useActiveData } from '../store/useStore';
import type { TipoOrigin } from '../types';
import { getDashboardTotals, getCategoryBreakdown } from '../utils/financeCalculations';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar as CalendarIcon, Percent, TrendingUp, PieChart, Activity, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const ResultadosMensais = () => {
    const { lancamentos } = useActiveData();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [originFilter, setOriginFilter] = useState<TipoOrigin | 'GERAL'>('GERAL');

    const effectiveOrigin = originFilter === 'GERAL' ? undefined : originFilter;

    // Calcula Totais
    const totals = useMemo(() => {
        return getDashboardTotals(
            lancamentos || [],
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            effectiveOrigin
        );
    }, [lancamentos, selectedDate, effectiveOrigin]);

    const categoryBreakdown = useMemo(() => {
        return getCategoryBreakdown(
            lancamentos || [],
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            effectiveOrigin
        );
    }, [lancamentos, selectedDate, effectiveOrigin]);

    const profitMargin = totals.receita > 0 ? (totals.saldo / totals.receita) * 100 : 0;
    const fixedRatio = totals.despesa > 0 ? (totals.despesaFixa / totals.despesa) * 100 : 0;
    const variableRatio = totals.despesa > 0 ? (totals.despesaVariavel / totals.despesa) * 100 : 0;

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

            {/* Sub-KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-4 flex items-center gap-4 border border-border/50">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Percent size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Margem de Lucro</p>
                        <h4 className="text-xl font-bold text-slate-200">{profitMargin.toFixed(1)}%</h4>
                    </div>
                </div>

                <div className="glass-card p-4 col-span-1 md:col-span-3 border border-border/50">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Eficiência: Fixos vs Variáveis</p>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded italic">Base: Despesa Total</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/50">
                        <div className="h-full bg-danger transition-all duration-1000" style={{ width: `${fixedRatio}%` }} title={`Fixos: ${fixedRatio.toFixed(1)}%`}></div>
                        <div className="h-full bg-warning transition-all duration-1000" style={{ width: `${variableRatio}%` }} title={`Variáveis: ${variableRatio.toFixed(1)}%`}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-[10px]">
                        <div className="flex items-center gap-1.5 text-danger font-medium"><div className="w-1.5 h-1.5 rounded-full bg-danger"></div> Fixos ({fixedRatio.toFixed(0)}%)</div>
                        <div className="flex items-center gap-1.5 text-warning font-medium"><div className="w-1.5 h-1.5 rounded-full bg-warning"></div> Variáveis ({variableRatio.toFixed(0)}%)</div>
                    </div>
                </div>
            </div>

            {/* Detail Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card border border-border/50 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-4">
                        <PieChart size={20} className="text-primary" />
                        <h3 className="font-bold text-lg">Distribuição por Categoria</h3>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                        {categoryBreakdown.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <Activity size={40} className="opacity-20 mb-3" />
                                <p className="italic">Sem despesas registradas</p>
                            </div>
                        ) : (
                            categoryBreakdown.map((item, index) => {
                                const percentage = (item.value / totals.despesa) * 100;
                                return (
                                    <div key={item.name} className="group">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500 w-5">#{index + 1}</span>
                                                <span className="text-sm font-semibold text-slate-200 group-hover:text-primary transition-colors">{item.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-slate-100">{formatCurrency(item.value)}</div>
                                                <div className="text-[10px] text-slate-500">{percentage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary/40 group-hover:bg-primary transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                <div className="glass-card border border-border/50 flex flex-col h-full bg-gradient-to-br from-card to-slate-900/50">
                    <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-4">
                        <Activity size={20} className="text-success" />
                        <h3 className="font-bold text-lg">Insights do Período</h3>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="p-1 rounded-xl bg-slate-800/30 border border-border/30">
                           <div className="p-4 space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className={`p-2 rounded-lg ${totals.saldo >= 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                        <TrendingUp size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-200">Saúde do Fluxo</p>
                                        <p className="text-xs text-slate-400 leading-relaxed mt-1">
                                            {totals.saldo >= 0 
                                                ? `Parabéns! Você encerrou o período com um saldo positivo de ${formatCurrency(totals.saldo)}. Sua margem foi de ${profitMargin.toFixed(1)}%.`
                                                : `Atenção: Você teve um deficit de ${formatCurrency(Math.abs(totals.saldo))} este mês. Revise seus custos variáveis.`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                        <Layers size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-200">Equilíbrio de Custos</p>
                                        <p className="text-xs text-slate-400 leading-relaxed mt-1">
                                            Seus custos fixos representam {fixedRatio.toFixed(1)}% do seu faturamento. 
                                            {fixedRatio > 50 ? ' Recomendamos analisar formas de reduzir compromissos fixos.' : ' O equilíbrio de custos fixos está dentro de um patamar saudável.'}
                                        </p>
                                    </div>
                                </div>
                           </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultadosMensais;
