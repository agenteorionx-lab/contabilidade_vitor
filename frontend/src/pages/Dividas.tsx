import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Divida } from '../types';
import { Plus, ReceiptEuro, WalletCards, CheckCircle2, CircleDashed, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const Dividas = () => {
    const { dividas, setDividas, lancamentos } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'Todas' | 'Em Andamento' | 'Liquidada'>('Em Andamento');

    // Form State
    const [credor, setCredor] = useState('');
    const [origem, setOrigem] = useState<'PF' | 'PJ'>('PF');
    const [valorOriginal, setValorOriginal] = useState('');
    const [dataInicio, setDataInicio] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Calcular valores dinâmicos das dívidas cruzando com Lançamentos
    const dividasCalculadas = useMemo(() => {
        return (dividas || []).map(divida => {
            // "O Pulo do Gato": Somar todos os lançamentos de DESPESA que têm este dividaId
            const valorPago = (lancamentos || [])
                .filter(l => l.dividaId === divida.id && l.tipo === 'DESPESA')
                .reduce((acc, curr) => acc + curr.valor, 0);

            const saldoRestante = Math.max(0, divida.valorOriginal - valorPago);
            const isLiquidada = saldoRestante === 0;
            const statusCalculado = isLiquidada ? 'Liquidada' : divida.status;

            return {
                ...divida,
                valorPagoCalculado: valorPago,
                saldoRestante,
                statusCalculado,
                progresso: Math.min(100, (valorPago / divida.valorOriginal) * 100)
            };
        });
    }, [dividas, lancamentos]);

    // Totais para os Cards
    const totais = useMemo(() => {
        let totalOriginal = 0;
        let totalPago = 0;
        let saldoDevedor = 0;

        dividasCalculadas.forEach(d => {
            totalOriginal += d.valorOriginal;
            totalPago += d.valorPagoCalculado;
            saldoDevedor += d.saldoRestante;
        });

        return { totalOriginal, totalPago, saldoDevedor };
    }, [dividasCalculadas]);

    // Filtrar dívidas para exibição
    const dividasFiltradas = dividasCalculadas.filter(d =>
        filterStatus === 'Todas' ? true : d.statusCalculado === filterStatus
    );

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const numOriginal = parseFloat(valorOriginal);
        if (isNaN(numOriginal)) return;

        const newDivida: Divida = {
            id: crypto.randomUUID(),
            credor,
            origem,
            valorOriginal: numOriginal,
            dataInicio,
            status: 'Em Andamento'
        };

        setDividas([...(dividas || []), newDivida]);
        setIsModalOpen(false);
        setCredor(''); setValorOriginal(''); setDataInicio(format(new Date(), 'yyyy-MM-dd'));
    };

    const handleDelete = (id: string) => {
        setDividas((dividas || []).filter(d => d.id !== id));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <ReceiptEuro className="text-danger" size={32} />
                        Controle de Dívidas
                    </h1>
                    <p className="text-slate-400 mt-1">Gerencie débitos, saldos e pagamentos em tempo real.</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={20} />
                    <span>Nova Dívida</span>
                </button>
            </div>

            {/* Sumário */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card border-l-4 border-l-slate-500">
                    <p className="text-slate-400 font-medium mb-1">Total Geral em Dívidas</p>
                    <h3 className="text-2xl font-bold text-slate-100">{formatCurrency(totais.totalOriginal)}</h3>
                </div>
                <div className="glass-card border-l-4 border-l-success">
                    <p className="text-slate-400 font-medium mb-1">Total Já Pago</p>
                    <h3 className="text-2xl font-bold text-success">{formatCurrency(totais.totalPago)}</h3>
                </div>
                <div className="glass-card border-l-4 border-l-danger">
                    <p className="text-slate-400 font-medium mb-1 flex items-center gap-2"><WalletCards size={18} /> Saldo Devedor Atual</p>
                    <h3 className="text-2xl font-bold text-danger">{formatCurrency(totais.saldoDevedor)}</h3>
                </div>
            </div>

            {/* Filtros e Lista */}
            <div className="glass-card space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                    <span className="text-sm font-medium text-slate-400 mr-2">Filtrar por:</span>
                    {(['Em Andamento', 'Todas', 'Liquidada'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            className={`px-3 py-1 text-sm rounded-lg border transition-all ${filterStatus === f ? 'bg-primary/20 border-primary text-primary' : 'bg-transparent border-border text-slate-400 hover:border-slate-500'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dividasFiltradas.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-slate-500">Nenhuma dívida encontrada para este filtro.</div>
                    ) : (
                        dividasFiltradas.map(d => (
                            <div key={d.id} className="bg-slate-900 border border-border rounded-xl p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-200">{d.credor}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{d.origem}</span>
                                            <span className="text-xs text-slate-500">{format(parseISO(d.dataInicio), 'dd/MM/yyyy')}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(d.id)} className="text-slate-500 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="space-y-4 mt-6">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-slate-400 mb-0.5">Valor Original</p>
                                            <p className="font-medium text-slate-300">{formatCurrency(d.valorOriginal)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400 mb-0.5">Saldo Restante</p>
                                            <p className={`font-bold ${d.statusCalculado === 'Liquidada' ? 'text-success' : 'text-danger'}`}>
                                                {formatCurrency(d.saldoRestante)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Barra de Progresso */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-success font-medium">Pago: {formatCurrency(d.valorPagoCalculado)}</span>
                                            <span className="text-slate-400">{Math.round(d.progresso)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${d.statusCalculado === 'Liquidada' ? 'bg-success' : 'bg-primary'}`}
                                                style={{ width: `${d.progresso}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Bagde */}
                                <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold flex items-center gap-1 ${d.statusCalculado === 'Liquidada' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                                    {d.statusCalculado === 'Liquidada' ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}
                                    {d.statusCalculado}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal Nova Dívida */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-xl font-bold">Nova Dívida</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Credor (Nome do Banco, Pessoa, etc)</label>
                                <input
                                    type="text" required value={credor} onChange={e => setCredor(e.target.value)} placeholder="Ex: Itaú Financiamento"
                                    className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Origem</label>
                                    <select
                                        value={origem} onChange={e => setOrigem(e.target.value as 'PF' | 'PJ')}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    >
                                        <option value="PF">Pessoa Física</option>
                                        <option value="PJ">Empresa PJ</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Data de Início</label>
                                    <input
                                        type="date" required value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Valor Total da Dívida R$</label>
                                <input
                                    type="number" step="0.01" required value={valorOriginal} onChange={e => setValorOriginal(e.target.value)} placeholder="0.00"
                                    className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none text-xl font-bold"
                                />
                            </div>

                            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm text-primary/80 mt-2">
                                <strong>Dica:</strong> Para amortizar essa dívida, vá até a tela de Lançamentos e crie uma despesa associada a este credor. O saldo e a barra de progresso descontarão automaticamente!
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                                    Registrar Dívida
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dividas;
