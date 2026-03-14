import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { AtivoBolsa } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { TrendingUp, Plus, RefreshCw, Trash2, PieChart as PieChartIcon, Activity } from 'lucide-react';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatPercent = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(val / 100);
};

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#14b8a6', '#f43f5e', '#6366f1'];

const Investimentos = () => {
    const { ativosBolsa, setAtivosBolsa } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [ticker, setTicker] = useState('');
    const [empresa, setEmpresa] = useState('');
    const [setor, setSetor] = useState('');
    const [quantia, setQuantia] = useState('');
    const [valorPago, setValorPago] = useState('');
    const [valorAtual, setValorAtual] = useState('');

    const [isUpdating, setIsUpdating] = useState(false);

    const carteiraMetrics = useMemo(() => {
        let totalPago = 0;
        let totalAtual = 0;
        let totalRendimentos = 0;

        (ativosBolsa || []).forEach(a => {
            totalPago += a.quantia * a.valorPago;
            totalAtual += a.quantia * a.valorAtual;
            totalRendimentos += a.rendiTrimes; // assuming it's total absolute value received
        });

        const valorizacao = totalAtual - totalPago;
        const valorizacaoPercent = totalPago > 0 ? (valorizacao / totalPago) * 100 : 0;

        // Distribuição por Setor
        const setorMap = new Map<string, number>();
        // Distribuição por Ativo
        const ativoMap = new Map<string, number>();

        (ativosBolsa || []).forEach(a => {
            const pAtual = a.quantia * a.valorAtual;
            setorMap.set(a.setor, (setorMap.get(a.setor) || 0) + pAtual);
            ativoMap.set(a.ticker, (ativoMap.get(a.ticker) || 0) + pAtual);
        });

        const dataSetor = Array.from(setorMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const dataAtivo = Array.from(ativoMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        return {
            totalPago,
            totalAtual,
            valorizacao,
            valorizacaoPercent,
            totalRendimentos,
            dataSetor,
            dataAtivo
        };
    }, [ativosBolsa]);

    const handleSaveAtivo = (e: React.FormEvent) => {
        e.preventDefault();
        const numQuantia = parseFloat(quantia);
        const numPM = parseFloat(valorPago);
        const numAtual = valorAtual ? parseFloat(valorAtual) : numPM; // fallback para PM se não informar atual

        if (isNaN(numQuantia) || isNaN(numPM)) return;

        const newAtivo: AtivoBolsa = {
            id: crypto.randomUUID(),
            ticker: ticker.toUpperCase(),
            empresa,
            setor,
            quantia: numQuantia,
            valorPago: numPM,
            valorAtual: numAtual,
            rendiTrimes: 0 // Iniciar zerado
        };

        setAtivosBolsa([...(ativosBolsa || []), newAtivo]);
        setIsModalOpen(false);
        setTicker(''); setEmpresa(''); setSetor(''); setQuantia(''); setValorPago(''); setValorAtual('');
    };

    const handleDelete = (id: string) => {
        setAtivosBolsa((ativosBolsa || []).filter(a => a.id !== id));
    };

    const handleUpdatePrices = async () => {
        if (!ativosBolsa || ativosBolsa.length === 0) return;
        setIsUpdating(true);

        try {
            // Utilizando a API pública brAPI (brapi.dev) que não requer auth para uso básico low-volume
            const tickers = (ativosBolsa || []).map(a => a.ticker).join(',');
            const response = await fetch(`https://brapi.dev/api/quote/${tickers}`);
            const data = await response.json();

            if (data.results && Array.isArray(data.results)) {
                // Prepara mapa de preços
                const priceMap = new Map<string, number>();
                data.results.forEach((r: any) => {
                    if (r.regularMarketPrice) {
                        priceMap.set(r.symbol, r.regularMarketPrice);
                    }
                });

                // Atualiza o state global
                const updatedAtivos = (ativosBolsa || []).map(a => {
                    const price = priceMap.get(a.ticker);
                    return price ? { ...a, valorAtual: price } : a;
                });

                setAtivosBolsa(updatedAtivos);
            }
        } catch (error) {
            console.error("Erro ao atualizar cotações", error);
            alert("Erro ao buscar cotações do mercado. Verifique a conexão.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <TrendingUp className="text-purple-500" size={32} />
                        Ações & FIIs
                    </h1>
                    <p className="text-slate-400 mt-1">Sua carteira de Renda Variável atualizada a mercado.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={handleUpdatePrices}
                        disabled={isUpdating}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={isUpdating ? "animate-spin" : ""} />
                        <span>{isUpdating ? 'Atualizando...' : 'Atualizar Cotações'}</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus size={20} />
                        <span>Novo Ativo</span>
                    </button>
                </div>
            </div>

            {/* Resumo Carteira */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card border-l-4 border-l-slate-500">
                    <p className="text-slate-400 font-medium mb-1">Total Aportado (Pago)</p>
                    <h3 className="text-2xl font-bold text-slate-100">{formatCurrency(carteiraMetrics.totalPago)}</h3>
                </div>

                <div className="glass-card border-l-4 border-l-blue-500">
                    <p className="text-slate-400 font-medium mb-1">Patrimônio Atual</p>
                    <h3 className="text-2xl font-bold text-blue-400">{formatCurrency(carteiraMetrics.totalAtual)}</h3>
                </div>

                <div className={`glass-card border-l-4 ${carteiraMetrics.valorizacao >= 0 ? 'border-l-success' : 'border-l-danger'}`}>
                    <p className="text-slate-400 font-medium mb-1">Lucro/Prejuízo Aberto</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className={`text-2xl font-bold ${carteiraMetrics.valorizacao >= 0 ? 'text-success' : 'text-danger'}`}>
                            {carteiraMetrics.valorizacao > 0 ? '+' : ''}{formatCurrency(carteiraMetrics.valorizacao)}
                        </h3>
                        <span className={`text-sm font-medium ${carteiraMetrics.valorizacao >= 0 ? 'text-success/80' : 'text-danger/80'}`}>
                            ({formatPercent(carteiraMetrics.valorizacaoPercent)})
                        </span>
                    </div>
                </div>

                <div className="glass-card border-l-4 border-l-warning">
                    <p className="text-slate-400 font-medium mb-1">Rendimentos Acum. (Div.)</p>
                    <h3 className="text-2xl font-bold text-warning">{formatCurrency(carteiraMetrics.totalRendimentos)}</h3>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <PieChartIcon size={20} className="text-primary" /> Distribuição por Setor
                    </h3>
                    <div className="h-64 w-full relative">
                        {carteiraMetrics.dataSetor.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">Sem ativos na carteira.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={carteiraMetrics.dataSetor} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                        {carteiraMetrics.dataSetor.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} formatter={(val: any) => formatCurrency(Number(val))} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="glass-card">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-purple-500" /> Distribuição por Ativo
                    </h3>
                    <div className="h-64 w-full relative">
                        {carteiraMetrics.dataAtivo.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">Sem ativos na carteira.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={carteiraMetrics.dataAtivo} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                        {carteiraMetrics.dataAtivo.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} formatter={(val: any) => formatCurrency(Number(val))} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabela Excel-like */}
            <div className="glass-card">
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-900 border-b border-border">
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50 text-center">Ações</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50">Fundos / Ativos</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50 text-right">Quantia</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50 text-right">Valor Pago (PM)</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50 text-right">Valor Atual</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50 text-right bg-slate-800/50">P. Total</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50 text-right bg-blue-500/10">P. Atual</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50 text-center">Valorização</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50 text-center">% Distribuída</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-r border-border/50">Empresa</th>
                                <th className="p-3 text-slate-400 font-bold uppercase text-[10px] tracking-wider">Setor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!ativosBolsa || ativosBolsa.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-slate-500">Sua planilha de Renda Variável está vazia. Comece adicionando ativos.</td>
                                </tr>
                            ) : (
                                (ativosBolsa || []).map(l => {
                                    const pTotal = l.quantia * l.valorPago;
                                    const pAtual = l.quantia * l.valorAtual;
                                    const valorizacao = pAtual - pTotal;
                                    const dist = carteiraMetrics.totalAtual > 0 ? (pAtual / carteiraMetrics.totalAtual) * 100 : 0;
                                    const percentVal = pTotal > 0 ? (valorizacao / pTotal) * 100 : 0;

                                    return (
                                        <tr key={l.id} className="hover:bg-slate-800/50 transition-colors border-b border-border/50 text-sm">
                                            <td className="p-2 border-r border-border/50 text-center">
                                                <button onClick={() => handleDelete(l.id)} className="p-1.5 text-slate-500 hover:text-danger hover:bg-danger/10 rounded transition-colors" title="Remover Ativo">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                            <td className="p-2 border-r border-border/50 font-bold text-slate-200">{l.ticker}</td>
                                            <td className="p-2 border-r border-border/50 text-right font-medium">{l.quantia}</td>
                                            <td className="p-2 border-r border-border/50 text-right text-slate-300">{formatCurrency(l.valorPago)}</td>
                                            <td className="p-2 border-r border-border/50 text-right text-slate-300 bg-slate-900/40">{formatCurrency(l.valorAtual)}</td>
                                            <td className="p-2 border-r border-border/50 text-right text-orange-200/80 bg-slate-800/50">{formatCurrency(pTotal)}</td>
                                            <td className="p-2 border-r border-border/50 text-right font-bold text-blue-400 bg-blue-500/10">{formatCurrency(pAtual)}</td>
                                            <td className={`p-2 border-r border-border/50 text-center font-bold text-[12px] ${valorizacao >= 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                                                <div>{formatCurrency(valorizacao)}</div>
                                                <div className="opacity-70 text-[10px]">{formatPercent(percentVal)}</div>
                                            </td>
                                            <td className="p-2 border-r border-border/50 text-center text-slate-300 font-medium">{formatPercent(dist)}</td>
                                            <td className="p-2 border-r border-border/50 text-slate-400 truncate max-w-[150px]" title={l.empresa}>{l.empresa}</td>
                                            <td className="p-2 text-slate-400 truncate max-w-[150px]" title={l.setor}>{l.setor}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-black border-t border-border text-sm">
                                <td colSpan={5} className="p-2 text-right font-bold text-white uppercase border-r border-border/50">TOTAIS:</td>
                                <td className="p-2 text-right font-bold text-orange-200/80 border-r border-border/50">{formatCurrency(carteiraMetrics.totalPago)}</td>
                                <td className="p-2 text-right font-bold text-blue-400 border-r border-border/50">{formatCurrency(carteiraMetrics.totalAtual)}</td>
                                <td className={`p-2 text-center font-bold border-r border-border/50 ${carteiraMetrics.valorizacao >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {formatCurrency(carteiraMetrics.valorizacao)}
                                </td>
                                <td colSpan={3} className="bg-dark"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Modal Novo Ativo */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-xl font-bold">Lançar Compra de Ativo</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <Trash2 size={24} className="opacity-0" /> {/* Spacer */}
                                <span className="absolute top-6 right-6 text-xl leading-none">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveAtivo} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Ticker (Fundo/Ação)</label>
                                    <input
                                        type="text" required value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Ex: RZAK11"
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none font-medium uppercase"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Quantidade</label>
                                    <input
                                        type="number" step="0.0001" required value={quantia} onChange={e => setQuantia(e.target.value)} placeholder="0"
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Valor Pago (Preço Médio) R$</label>
                                    <input
                                        type="number" step="0.01" required value={valorPago} onChange={e => setValorPago(e.target.value)} placeholder="0.00"
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400 flex items-center justify-between">
                                        <span>Valor Atual R$</span>
                                        <span className="text-[10px] text-primary">Opcional</span>
                                    </label>
                                    <input
                                        type="number" step="0.01" value={valorAtual} onChange={e => setValorAtual(e.target.value)} placeholder="Mesmo que o Pago"
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400 flex items-center justify-between">
                                        <span>Empresa (Opcional)</span>
                                    </label>
                                    <input
                                        type="text" value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ex: Broadstone Net Lease"
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400 flex items-center justify-between">
                                        <span>Setor (Opcional)</span>
                                    </label>
                                    <input
                                        type="text" value={setor} onChange={e => setSetor(e.target.value)} placeholder="Ex: Net Lease, Retail..."
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                >
                                    Salvar Ativo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Investimentos;
