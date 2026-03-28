import React, { useState, useMemo, useEffect } from 'react';
import { useStore, useActiveData } from '../store/useStore';
import type { CustoFixo, Lancamento, TipoOrigin } from '../types';
import { useOrganization } from '@clerk/clerk-react';
import { Plus, CheckCircle2, CircleDashed, CalendarDays, Trash2, Home, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

// Robust UUID fallback
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const CustosFixos = () => {
    const { custosFixos = [], lancamentos = [], setCustosFixos, setLancamentos, config } = useActiveData();
    const [isGestaoModalOpen, setIsGestaoModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const { organization, membership } = useOrganization();
    const isAdmin = !organization || membership?.role === 'org:admin';

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 mt-20">
                <h2 className="text-2xl font-bold text-slate-200 mb-2">Acesso Restrito</h2>
                <p>A gestão de Custos Fixos estruturais exige nível de Sócio-Administrador.</p>
            </div>
        );
    }

    // Filtro de Mês/Ano para visualizar pagamentos
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedCustoParaPagar, setSelectedCustoParaPagar] = useState<CustoFixo | null>(null);

    // Form Nova Conta Fixa (Gestão)
    const [nome, setNome] = useState('');
    const [valorEsperado, setValorEsperado] = useState('');
    const [categoria, setCategoria] = useState('');
    const [diaVencimento, setDiaVencimento] = useState('');

    // Form Quick Pagamento
    const [paymentOrigin, setPaymentOrigin] = useState<TipoOrigin>('PF');
    const [paymentBanco, setPaymentBanco] = useState('');
    const [paymentMetodo, setPaymentMetodo] = useState('PIX');
    const [paymentValorReal, setPaymentValorReal] = useState('');
    const [paymentData, setPaymentData] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Sync initial state when config loads
    useEffect(() => {
        if (config) {
            if (!categoria && config.categoriasDespesa?.length > 0) setCategoria(config.categoriasDespesa[0]);
            
            const bancosDisponiveis = config.contas.filter(c => 
                paymentOrigin === 'PF' ? c.carteira === 'Conta PF' : c.carteira === 'Conta PJ'
            );
            
            if (!paymentBanco && bancosDisponiveis.length > 0) {
                setPaymentBanco(bancosDisponiveis[0].nome);
            }
            
            if (config.metodosPagamento?.length > 0 && paymentMetodo === 'PIX') setPaymentMetodo(config.metodosPagamento[0]);
        }
    }, [config, paymentOrigin]);

    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    // Cruzar Lançamentos com Custos Fixos para determinar status "Pago"
    const custosCalculados = useMemo(() => {
        return (custosFixos || []).map(cf => {
            // Verifica se existe um lançamento de DESPESA para este CustoFixo neste mês específico
            const pagamentosMes = (lancamentos || []).filter(l => {
                if (!l.data || l.custoFixoId !== cf.id) return false;
                if (l.tipo !== 'DESPESA') return false;
                try {
                    const d = parseISO(l.data);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                } catch (e) {
                    return false;
                }
            });

            const valorPagoNoMes = pagamentosMes.reduce((acc, curr) => acc + curr.valor, 0);
            const isPago = valorPagoNoMes > 0;

            return {
                ...cf,
                isPago,
                valorPagoNoMes,
                pagamentos: pagamentosMes
            };
        });
    }, [custosFixos, lancamentos, currentMonth, currentYear]);

    const metrics = useMemo(() => {
        const totalEsperado = custosCalculados.reduce((acc, curr) => acc + curr.valorEsperado, 0);
        const totalPago = custosCalculados.filter(c => c.isPago).reduce((acc, curr) => acc + curr.valorPagoNoMes, 0);
        const faltanteEsperado = custosCalculados.filter(c => !c.isPago).reduce((acc, curr) => acc + curr.valorEsperado, 0);

        let progress = 0;
        if (totalEsperado > 0) {
            progress = Math.min((totalPago / totalEsperado) * 100, 100);
        }

        return { totalEsperado, totalPago, faltanteEsperado, progress };
    }, [custosCalculados]);

    // Cadastro de Novo Modelo de Custo Fixo
    const handleSaveModelo = (e: React.FormEvent) => {
        e.preventDefault();
        const numValor = parseFloat(valorEsperado);
        if (isNaN(numValor)) return;

        const newCusto: CustoFixo = {
            id: generateId(),
            nome,
            valorEsperado: numValor,
            categoria,
            diaVencimento: diaVencimento ? parseInt(diaVencimento) : undefined
        };

        setCustosFixos([...custosFixos, newCusto]);
        setIsGestaoModalOpen(false);
        setNome(''); setValorEsperado(''); setDiaVencimento('');
    };

    const handleDeleteModelo = (id: string) => {
        if (window.confirm("Deletar este custo fixo? Ele deixará de aparecer no painel nos próximos meses.")) {
            setCustosFixos(custosFixos.filter(c => c.id !== id));
        }
    };

    // Registrar o Lançamento atrelado (marcar como pago)
    const handleOpenPayment = (cf: CustoFixo) => {
        setSelectedCustoParaPagar(cf);
        setPaymentValorReal(cf.valorEsperado.toString());
        setPaymentData(format(new Date(), 'yyyy-MM-dd'));
        setIsPaymentModalOpen(true);
    };

    const handleConfirmPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustoParaPagar) return;

        const numValor = parseFloat(paymentValorReal);
        if (isNaN(numValor) || numValor <= 0) return;

        const novoLancamento: Lancamento = {
            id: generateId(),
            data: paymentData,
            tipo: 'DESPESA',
            categoria: selectedCustoParaPagar.categoria,
            origem: paymentOrigin,
            banco: paymentBanco,
            metodoPagamento: paymentMetodo,
            valor: numValor,
            descricao: `Pagamento Fixo: ${selectedCustoParaPagar.nome}`,
            custoFixoId: selectedCustoParaPagar.id
        };

        setLancamentos([...lancamentos, novoLancamento]);
        setIsPaymentModalOpen(false);
        setSelectedCustoParaPagar(null);
    };

    // Desfazer Pagamento (Deleta o lançamento atrelado)
    const handleUndoPayment = (cfCalculated: any) => {
        if (!cfCalculated.pagamentos || cfCalculated.pagamentos.length === 0) return;

        if (window.confirm(`Desfazer pagamento de ${cfCalculated.nome}? Isso apagará a transação do Caixa.`)) {
            const idsToDelete = cfCalculated.pagamentos.map((p: Lancamento) => p.id);
            setLancamentos(lancamentos.filter(l => !idsToDelete.includes(l.id)));
        }
    };

    if (!config) return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Home className="text-pink-500" size={32} />
                        Custos Fixos Mensais
                    </h1>
                    <p className="text-slate-400 mt-1">Sua estrutura fixa. Controle aluguel, luz, internet e obrigações recorrentes.</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-900 border border-border px-4 py-2 rounded-xl text-slate-200 focus-within:border-primary transition-colors">
                        <CalendarDays size={18} className="text-primary" />
                        <input
                            type="month"
                            value={format(selectedDate, 'yyyy-MM')}
                            onChange={(e) => {
                                try {
                                    setSelectedDate(new Date(e.target.value + '-02'));
                                } catch (err) {
                                    // Fallback
                                }
                            }}
                            className="bg-transparent border-none focus:outline-none cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={() => setIsGestaoModalOpen(true)}
                        className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
                    >
                        <Plus size={20} /> Novo Modelo Fixo
                    </button>
                </div>
            </div>

            {/* Dashboard Topo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card md:col-span-2">
                    <p className="text-slate-400 font-medium mb-2">Progresso da Estrutura Fixa ({format(selectedDate, 'MMMM', { locale: ptBR })})</p>
                    <div className="flex items-end justify-between mb-2">
                        <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-indigo-500">
                            {formatCurrency(metrics.totalPago)} <span className="text-lg text-slate-500 font-medium">/ {formatCurrency(metrics.totalEsperado)}</span>
                        </h3>
                        <span className="font-bold text-slate-300">{metrics.progress.toFixed(0)}% Pago</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${metrics.progress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="glass-card flex flex-col justify-center">
                    <p className="text-slate-400 font-medium mb-1">Custo Faltante (Pendente)</p>
                    <h3 className="text-2xl font-bold text-slate-200">{formatCurrency(metrics.faltanteEsperado)}</h3>
                </div>
            </div>

            {/* Grid de Cards (Checklist) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {custosCalculados.length === 0 && (
                    <div className="col-span-full p-12 text-center glass-card border-dashed">
                        <Activity size={48} className="mx-auto text-slate-500 mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Configure sua base financeira</h3>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto">Cadastre os modelos de contas fixas (como Energia, Aluguel, IPTU). Elas aparecerão aqui todos os meses como um "To-Do List" para você acompanhar o pagamento.</p>
                        <button onClick={() => setIsGestaoModalOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                            Começar
                        </button>
                    </div>
                )}

                {custosCalculados.map(cf => (
                    <div
                        key={cf.id}
                        className={`relative rounded-xl border p-5 transition-all overflow-hidden ${cf.isPago
                            ? 'bg-success/5 border-success/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]'
                            : 'bg-card border-border hover:border-slate-600 shadow-sm'
                            }`}
                    >
                        {cf.isPago && <div className="absolute top-0 right-0 w-16 h-16 bg-success/10 rounded-bl-[100px] flex items-start justify-end p-3 pointer-events-none"></div>}

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                                    {cf.nome}
                                </h4>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 mt-1 inline-block">
                                    {cf.categoria}
                                </span>
                            </div>

                            <button onClick={() => handleDeleteModelo(cf.id)} className="text-slate-500 hover:text-danger p-1 rounded transition-colors bg-slate-800/50 hover:bg-danger/20">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-slate-500 text-sm">Valor {cf.isPago ? 'Pago no mês' : 'Previsto'}</p>
                            <h3 className={`text-2xl font-bold ${cf.isPago ? 'text-success' : 'text-slate-100'}`}>
                                {formatCurrency(cf.isPago ? cf.valorPagoNoMes : cf.valorEsperado)}
                            </h3>
                            {cf.diaVencimento && !cf.isPago && (
                                <p className="text-xs text-warning mt-1">Vence dia {cf.diaVencimento}</p>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-700/50 mt-auto">
                            {cf.isPago ? (
                                <button
                                    onClick={() => handleUndoPayment(cf)}
                                    className="w-full py-2.5 rounded-lg font-bold text-success bg-success/10 hover:bg-success/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <CheckCircle2 size={20} /> Liquidado! (Desfazer)
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleOpenPayment(cf)}
                                    className="w-full py-2.5 rounded-lg font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors flex items-center justify-center gap-2 shadow"
                                >
                                    <CircleDashed size={20} /> Marcar como Pago...
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Novo Modelo (Gestão Global) */}
            {isGestaoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus className="text-primary" /> Adicionar Custo Fixo</h2>

                        <form onSubmit={handleSaveModelo} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Nome do Gasto</label>
                                <input type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Aluguel" className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 outline-none focus:border-primary" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Valor Médio Previsto R$</label>
                                    <input type="number" step="0.01" required value={valorEsperado} onChange={e => setValorEsperado(e.target.value)} placeholder="0.00" className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 outline-none focus:border-primary" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Dia Vencimento (Opc.)</label>
                                    <input type="number" min="1" max="31" value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} placeholder="Ex: 10" className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 outline-none focus:border-primary" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Categoria Contábil (DRE)</label>
                                <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 outline-none focus:border-primary">
                                    {(config.categoriasDespesa || []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button type="button" onClick={() => setIsGestaoModalOpen(false)} className="px-4 py-2 text-slate-400">Cancelar</button>
                                <button type="submit" className="bg-primary text-white font-medium px-6 py-2 rounded-xl">Salvar Modelo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Modal Pagamento para vincular conta */}
            {isPaymentModalOpen && selectedCustoParaPagar && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-sm rounded-2xl border border-success/30 shadow-[0_0_50px_rgba(34,197,94,0.1)] p-6 relative">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Quitar Custo Fixo</h2>
                            <p className="text-slate-400 text-sm mt-1">{selectedCustoParaPagar.nome}</p>
                        </div>

                        <form onSubmit={handleConfirmPayment} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs text-slate-400">Data Base Pgto.</label>
                                    <input type="date" required value={paymentData} onChange={e => setPaymentData(e.target.value)} className="w-full bg-slate-900/50 border border-border rounded-lg px-3 py-2 text-sm" />
                                </div>

                                <div className="col-span-2 relative">
                                    <label className="text-xs text-slate-400">Valor Real Quitado</label>
                                    <div className="absolute left-3 top-8 text-slate-500 text-sm">R$</div>
                                    <input type="number" step="0.01" required value={paymentValorReal} onChange={e => setPaymentValorReal(e.target.value)} className="w-full bg-slate-900 border border-border rounded-lg pl-8 pr-3 py-2 text-lg font-bold text-success focus:border-success outline-none" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Origem Pessoal</label>
                                    <select value={paymentOrigin} onChange={e => setPaymentOrigin(e.target.value as TipoOrigin)} className="w-full bg-slate-900 border border-border rounded-lg px-2 py-2 text-sm outline-none">
                                        <option value="PF">PF</option>
                                        <option value="PJ">PJ</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Banco de Saída</label>
                                    <select value={paymentBanco} onChange={e => setPaymentBanco(e.target.value)} className="w-full bg-slate-900 border border-border rounded-lg px-2 py-2 text-sm outline-none">
                                        {config.contas
                                            .filter(c => paymentOrigin === 'PF' ? c.carteira === 'Conta PF' : c.carteira === 'Conta PJ')
                                            .map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 space-y-1 mt-1">
                                    <label className="text-xs text-slate-400">Método Operacional</label>
                                    <select value={paymentMetodo} onChange={e => setPaymentMetodo(e.target.value)} className="w-full bg-slate-900 border border-border rounded-lg px-2 py-2 text-sm outline-none">
                                        {(config.metodosPagamento || []).map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            <p className="text-[11px] text-center text-slate-500 mt-4 leading-tight">
                                Este registro será salvo automaticamente como despesa de Caixa, evitando duplicidade manual.
                            </p>

                            <div className="flex justify-between gap-3 pt-2 mt-4">
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 px-4 py-2 rounded-xl text-slate-400 border border-border/50 hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 bg-success hover:bg-success/90 text-slate-900 font-bold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-success/20">Pago!</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustosFixos;
