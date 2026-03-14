import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { getAnnualSummary } from '../utils/financeCalculations';
import type { TipoOrigin } from '../types';
import { Calendar, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, Activity, BarChart3 } from 'lucide-react';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const ResultadosAnuais = () => {
    const { lancamentos } = useStore();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [originFilter, setOriginFilter] = useState<TipoOrigin | 'GERAL'>('GERAL');

    const effectiveOrigin = originFilter === 'GERAL' ? undefined : originFilter;

    const data = useMemo(() => {
        return getAnnualSummary(lancamentos || [], selectedYear, effectiveOrigin);
    }, [lancamentos, selectedYear, effectiveOrigin]);

    const months = [
        'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card/30 backdrop-blur-md p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedYear(prev => prev - 1)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2 bg-slate-900/50 border border-border px-6 py-2 rounded-xl">
                        <Calendar size={18} className="text-primary" />
                        <span className="text-xl font-bold text-slate-100">{selectedYear}</span>
                    </div>
                    <button
                        onClick={() => setSelectedYear(prev => prev + 1)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="flex bg-slate-900 border border-border p-1 rounded-xl shadow-inner">
                    {(['GERAL', 'PF', 'PJ'] as const).map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setOriginFilter(opt)}
                            className={`px-6 py-1.5 rounded-lg text-sm font-medium transition-all ${originFilter === opt
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {opt === 'GERAL' ? 'Geral' : opt === 'PF' ? 'PF' : 'PJ'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Summary Cards (System Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="glass-card border-l-4 border-l-slate-500 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ano Base</p>
                        <h3 className="text-3xl font-black text-slate-100 mt-1">{selectedYear}</h3>
                    </div>
                    <Calendar className="absolute -bottom-2 -right-2 text-slate-500/10 w-16 h-16 group-hover:scale-110 transition-transform" />
                </div>

                <div className="glass-card border-l-4 border-l-success flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Receita Anual</p>
                        <h3 className="text-xl font-bold text-slate-100 mt-1">{formatCurrency(data.totals.receita)}</h3>
                    </div>
                    <ArrowUpCircle className="absolute -bottom-2 -right-2 text-success/10 w-16 h-16 group-hover:scale-110 transition-transform" />
                </div>

                <div className="glass-card border-l-4 border-l-danger flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Despesa Anual</p>
                        <h3 className="text-xl font-bold text-slate-100 mt-1">{formatCurrency(data.totals.despesa)}</h3>
                    </div>
                    <ArrowDownCircle className="absolute -bottom-2 -right-2 text-danger/10 w-16 h-16 group-hover:scale-110 transition-transform" />
                </div>

                <div className="glass-card border-l-4 border-l-primary flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Lucro Anual</p>
                        <h3 className="text-xl font-bold text-success mt-1">{formatCurrency(data.totals.lucro)}</h3>
                    </div>
                    <BarChart3 className="absolute -bottom-2 -right-2 text-primary/10 w-16 h-16 group-hover:scale-110 transition-transform" />
                </div>

                <div className="glass-card border-l-4 border-l-warning flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Caixa Final</p>
                        <h3 className="text-xl font-bold text-slate-100 mt-1">{formatCurrency(data.totals.caixa)}</h3>
                    </div>
                    <Wallet className="absolute -bottom-2 -right-2 text-warning/10 w-16 h-16 group-hover:scale-110 transition-transform" />
                </div>

                <div className="glass-card border-l-4 border-l-purple-500 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider leading-tight">Saúde <br />do Caixa</p>
                        <h3 className="text-3xl font-black text-slate-100 mt-1">{data.totals.health}</h3>
                    </div>
                    <Activity className="absolute -bottom-2 -right-2 text-purple-500/10 w-16 h-16 group-hover:scale-110 transition-transform" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Results Table */}
                <div className="glass-card !p-0 overflow-hidden border border-border shadow-2xl">
                    <div className="p-4 border-b border-border bg-slate-900/30 flex items-center gap-2">
                        <TrendingUp size={18} className="text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Desempenho Mensal</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className="bg-slate-900/80 text-slate-400 border-b border-border text-[10px] font-bold uppercase tracking-tighter">
                                    <th className="py-3 px-4 border-r border-border/50 text-left">Mês</th>
                                    <th className="py-3 px-4 border-r border-border/50">Receita</th>
                                    <th className="py-3 px-4 border-r border-border/50">Despesa</th>
                                    <th className="py-3 px-4 border-r border-border/50">Lucro</th>
                                    <th className="py-3 px-4">Caixa</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-300">
                                {data.monthlyData.map((m, i) => (
                                    <tr key={i} className="border-b border-border/30 hover:bg-slate-800/40 transition-colors">
                                        <td className="py-2.5 px-4 text-[11px] font-black bg-slate-900 text-slate-200 border-r border-border/50 text-left">{months[m.monthIndex]}</td>
                                        <td className="py-2.5 px-4 text-xs border-r border-border/30">{formatCurrency(m.receita)}</td>
                                        <td className="py-2.5 px-4 text-xs border-r border-border/30">{formatCurrency(m.despesa)}</td>
                                        <td className={`py-2.5 px-4 text-xs font-bold border-r border-border/30 ${m.lucro >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {formatCurrency(m.lucro)}
                                        </td>
                                        <td className="py-2.5 px-4 text-xs font-medium">{formatCurrency(m.caixa)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quarterly Analytics */}
                <div className="space-y-8">
                    <div className="glass-card !p-0 overflow-hidden border border-border shadow-2xl">
                        <div className="p-4 border-b border-border bg-slate-900/30 flex items-center gap-2">
                            <BarChart3 size={18} className="text-purple-500" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Visão por Trimestre</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/80 text-slate-400 border-b border-border text-[10px] font-bold uppercase tracking-tighter">
                                        <th className="py-4 px-4 border-r border-border/50 text-left">Trimestre</th>
                                        <th className="py-4 px-4 border-r border-border/50">Receita</th>
                                        <th className="py-4 px-4 border-r border-border/50">Despesa</th>
                                        <th className="py-4 px-4 border-r border-border/50">Lucro</th>
                                        <th className="py-4 px-4">Caixa</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-100">
                                    {data.quarterlyData.map((q, i) => (
                                        <tr key={i} className="border-b border-border/30 hover:bg-slate-800/40 transition-colors">
                                            <td className="py-8 px-4 text-xl font-black bg-slate-900/50 text-slate-100 border-r border-border/50 text-left">{q.name}</td>
                                            <td className="py-8 px-4 text-sm border-r border-border/30 font-medium">{formatCurrency(q.receita)}</td>
                                            <td className="py-8 px-4 text-sm border-r border-border/30 font-medium">{formatCurrency(q.despesa)}</td>
                                            <td className={`py-8 px-4 text-sm font-black border-r border-border/30 ${q.lucro >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {formatCurrency(q.lucro)}
                                            </td>
                                            <td className="py-8 px-4 text-sm font-bold">{formatCurrency(q.caixa)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 backdrop-blur-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <h4 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
                                <TrendingUp size={20} /> Inteligência Anual
                            </h4>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                                Esta seção consolida a inteligência financeira do ano de {selectedYear}.
                                A análise trimestral permite identificar tendências de crescimento e sazonalidade,
                                auxiliando na tomada de decisões estratégicas para o próximo ciclo fiscal.
                            </p>
                        </div>
                        <TrendingUp className="absolute -bottom-8 -right-8 text-primary/5 w-32 h-32 group-hover:scale-110 transition-transform" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultadosAnuais;
