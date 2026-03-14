import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { CreditCard, Calendar as CalendarIcon, WalletCards, Plus, Layers, Tag as TagIcon, Trash2 } from 'lucide-react';
import { format, parseISO, getMonth, getYear, addMonths } from 'date-fns';
import type { Lancamento, TipoOrigin, TipoTransacao } from '../types';

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

const Cartoes = () => {
    const { lancamentos = [], config, setLancamentos } = useStore();
    const [selectedCard, setSelectedCard] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const cartoesOptions = config?.cartoesCredito?.map(c => c.nome) || [];

    // Detailed card info for limits
    const selectedCardInfo = useMemo(() => {
        return config?.cartoesCredito?.find(c => c.nome === selectedCard) || null;
    }, [config, selectedCard]);

    // Limite Disponível em tempo real
    const availableLimit = useMemo(() => {
        if (!selectedCardInfo) return 0;
        const totalLimit = selectedCardInfo.limite;

        // Soma de todos os gastos já feitos no cartão (todas as datas)
        const totalGastos = lancamentos.reduce((acc, l) => {
            if (l.metodoPagamento === 'Cartão de Crédito' && l.banco === selectedCardInfo.nome && l.tipo === 'DESPESA') {
                return acc + l.valor;
            }
            if (l.metodoPagamento === 'Cartão de Crédito' && l.banco === selectedCardInfo.nome && l.tipo === 'RECEITA') {
                return acc - l.valor; // Estorno
            }
            return acc;
        }, 0);

        // Soma de todos os pagamentos de fatura feitos para esse cartão
        const totalPagamentos = lancamentos.reduce((acc, l) => {
            if (l.ignorarNoDashboard && l.cartaoCreditado === selectedCardInfo.nome && l.tipo === 'DESPESA') {
                return acc + l.valor;
            }
            return acc;
        }, 0);

        return totalLimit - totalGastos + totalPagamentos;
    }, [lancamentos, selectedCardInfo]);

    useEffect(() => {
        if (cartoesOptions.length > 0 && (!selectedCard || !cartoesOptions.includes(selectedCard))) {
            setSelectedCard(cartoesOptions[0]);
        }
    }, [config, selectedCard]);

    // Filtra transações apenas de Cartão de Crédito para o Cartão Selecionado no Mês/Ano selecionado
    const faturaLancamentos = useMemo(() => {
        const targetMonth = selectedDate.getMonth();
        const targetYear = selectedDate.getFullYear();

        return (lancamentos || []).filter(l => {
            // Banco guarda o nome do cartão quando é método cartão de crédito
            const isCompra = l.metodoPagamento === 'Cartão de Crédito' && l.banco === selectedCard;
            const isPagamento = l.ignorarNoDashboard && l.cartaoCreditado === selectedCard;

            if (!isCompra && !isPagamento) return false;

            try {
                const d = parseISO(l.data);
                return getMonth(d) === targetMonth && getYear(d) === targetYear;
            } catch {
                return false;
            }
        }).sort((a, b) => {
            try { return parseISO(b.data).getTime() - parseISO(a.data).getTime(); } catch { return 0; }
        });
    }, [lancamentos, selectedCard, selectedDate]);

    const totalFatura = useMemo(() => {
        return faturaLancamentos.reduce((acc, l) => {
            // Cartão de crédito geralmente são só despesas, mas se houver estorno (receita), subtrai
            return acc + (l.tipo === 'DESPESA' ? l.valor : -l.valor);
        }, 0);
    }, [faturaLancamentos]);

    const handleDelete = (id: string) => {
        if (window.confirm('Excluir este lançamento da fatura?')) {
            setLancamentos(lancamentos.filter(l => l.id !== id));
        }
    };


    // --- Modal form State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [tipo, setTipo] = useState<TipoTransacao>('DESPESA');
    const [categoria, setCategoria] = useState('');
    const [origem, setOrigem] = useState<TipoOrigin>('PF');
    const [parcelas, setParcelas] = useState(1);
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [tagsIds, setTagsIds] = useState<string[]>([]);

    // --- Modal Pay Invoice State ---
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payData, setPayData] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [payValor, setPayValor] = useState('');
    const [payConta, setPayConta] = useState('');

    useEffect(() => {
        if (config && config.contas?.length > 0 && !payConta && isPayModalOpen) {
            setPayConta(config.contas[0].nome);
        }
    }, [config, payConta, isPayModalOpen]);

    const handlePayInvoice = (e: React.FormEvent) => {
        e.preventDefault();
        const numValor = parseFloat(payValor);
        if (isNaN(numValor) || numValor <= 0 || !payConta) return;

        const contaObj = config?.contas?.find(c => c.nome === payConta);
        const origemConta: TipoOrigin = contaObj?.carteira === 'Conta PF' ? 'PF' : 'PJ';

        const paymentTx: Lancamento = {
            id: generateId(),
            data: payData,
            tipo: 'DESPESA',
            categoria: 'Pagamento de Fatura',
            origem: origemConta,
            banco: payConta,
            metodoPagamento: 'Transferência',
            valor: numValor,
            descricao: `Pagamento Fatura - ${selectedCard}`,
            ignorarNoDashboard: true,
            cartaoCreditado: selectedCard
        };

        setLancamentos([...lancamentos, paymentTx]);
        setIsPayModalOpen(false);
        setPayValor('');
    };

    useEffect(() => {
        if (config && !categoria) {
            setCategoria(config.categoriasDespesa?.[0] || '');
        }
    }, [config, categoria, isModalOpen]);

    useEffect(() => {
        if (tipo === 'DESPESA' && config) {
            if (!config.categoriasDespesa.includes(categoria)) setCategoria(config.categoriasDespesa[0] || '');
        } else if (tipo === 'RECEITA' && config) {
            if (!config.categoriasReceita.includes(categoria)) setCategoria(config.categoriasReceita[0] || '');
        }
    }, [tipo]);

    const toggleTag = (id: string) => {
        setTagsIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const numValor = parseFloat(valor);
        if (isNaN(numValor) || numValor <= 0) return;

        const baseDate = parseISO(data);
        const newLancs: Lancamento[] = [];

        if (tipo === 'DESPESA' && parcelas > 1) {
            const valorParcela = numValor / parcelas;
            for (let i = 0; i < parcelas; i++) {
                const dataParcela = format(addMonths(baseDate, i), 'yyyy-MM-dd');
                newLancs.push({
                    id: generateId(),
                    data: dataParcela,
                    tipo,
                    categoria,
                    origem,
                    banco: selectedCard, // Target explicitly to the selected card
                    metodoPagamento: 'Cartão de Crédito',
                    valor: valorParcela,
                    descricao: `${descricao} (Parcela ${i + 1}/${parcelas})`,
                    isParcela: true,
                    parcelaInfo: `${i + 1}/${parcelas}`,
                    tagsIds: tagsIds.length > 0 ? tagsIds : undefined,
                    observacoes: observacoes || undefined
                });
            }
        } else {
            newLancs.push({
                id: generateId(),
                data,
                tipo,
                categoria,
                origem,
                banco: selectedCard,
                metodoPagamento: 'Cartão de Crédito',
                valor: numValor,
                descricao,
                tagsIds: tagsIds.length > 0 ? tagsIds : undefined,
                observacoes: observacoes || undefined
            });
        }

        setLancamentos([...lancamentos, ...newLancs]);
        setIsModalOpen(false);
        setValor('');
        setDescricao('');
        setObservacoes('');
        setParcelas(1);
        setTagsIds([]);
    };


    if (!config) return <div className="p-8 text-center text-slate-500">Carregando permissões de Cartões...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Faturas e Cartões</h1>
                    <p className="text-slate-400 mt-1">Gerencie as transações e o limite disponível dos seus cartões de crédito.</p>
                </div>
                {selectedCard && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setPayValor(totalFatura > 0 ? totalFatura.toString() : '');
                                setIsPayModalOpen(true);
                            }}
                            className="bg-transparent border border-primary text-primary hover:bg-primary/10 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium"
                        >
                            Pagar Fatura
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
                        >
                            <Plus size={20} /> Lançar no Cartão
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card md:col-span-2 flex flex-col h-full">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 border-b border-border/50 pb-4">
                        <div className="flex flex-col gap-1 w-full md:w-auto">
                            <h2 className="text-xl font-bold text-slate-200">Visão do Cartão</h2>
                            {selectedCardInfo && (
                                <p className="text-sm">
                                    <span className="text-slate-400">Limite Disponível: </span>
                                    <span className={`font-bold ${availableLimit < 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(availableLimit)}</span>
                                    <span className="text-slate-500 text-xs ml-2">/ {formatCurrency(selectedCardInfo.limite)}</span>
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <WalletCards className="text-primary" />
                            <h2 className="text-xl font-bold">Resumo da Fatura</h2>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            {cartoesOptions.length > 0 ? (
                                <select
                                    value={selectedCard}
                                    onChange={(e) => setSelectedCard(e.target.value)}
                                    className="bg-slate-900 border border-border rounded-lg p-2 text-slate-200 focus:border-primary outline-none"
                                >
                                    {cartoesOptions.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="text-sm text-slate-500 italic">Sem cartões configurados</span>
                            )}

                            <div className="flex items-center gap-2 bg-slate-900 border border-border px-3 py-2 rounded-lg">
                                <CalendarIcon size={16} className="text-primary" />
                                <input
                                    type="month"
                                    value={format(selectedDate, 'yyyy-MM')}
                                    onChange={(e) => setSelectedDate(new Date(e.target.value + '-02'))}
                                    className="bg-transparent border-none text-slate-200 focus:outline-none text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-border flex justify-between items-center">
                        <div>
                            <p className="text-slate-400 text-sm">Total da Fatura (Vencimento em {format(selectedDate, 'MM/yyyy')})</p>
                            <h3 className="text-3xl font-bold text-danger mt-1">{formatCurrency(totalFatura)}</h3>
                        </div>
                        <CreditCard size={48} className="text-border opacity-50" />
                    </div>

                    <div className="overflow-x-auto flex-1 h-[400px]">
                        <table className="w-full text-left border-collapse h-full flex flex-col">
                            <thead className="sticky top-0 bg-transparent z-10 block">
                                <tr className="flex w-full">
                                    <th className="p-3 border-b border-border/50 text-slate-400 font-medium whitespace-nowrap w-[15%]">Data</th>
                                    <th className="p-3 border-b border-border/50 text-slate-400 font-medium w-[30%]">Descrição</th>
                                    <th className="p-3 border-b border-border/50 text-slate-400 font-medium w-[25%]">Categoria</th>
                                    <th className="p-3 border-b border-border/50 text-slate-400 font-medium text-right w-[20%]">Valor</th>
                                    <th className="p-3 border-b border-border/50 text-slate-400 font-medium text-center w-[10%]"></th>
                                </tr>
                            </thead>
                            <tbody className="block flex-1 overflow-y-auto custom-scrollbar">
                                {faturaLancamentos.length === 0 ? (
                                    <tr className="flex w-full"><td colSpan={5} className="p-8 text-center text-slate-500 w-full hover:bg-transparent">Nenhum lançamento no cartão {selectedCard || 'selecionado'} neste mês.</td></tr>
                                ) : (
                                    faturaLancamentos.map(l => (
                                        <tr key={l.id} className="hover:bg-slate-800/50 transition-colors group flex w-full">
                                            <td className="p-3 border-b border-border/50 whitespace-nowrap text-slate-300 w-[15%]">
                                                {format(parseISO(l.data), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="p-3 border-b border-border/50 font-medium text-slate-200 w-[30%] break-words">
                                                {l.descricao}
                                                {l.isParcela && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded ml-2 whitespace-nowrap">{l.parcelaInfo}</span>}
                                                {l.ignorarNoDashboard && <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded ml-2 whitespace-nowrap">Pagamento de Fatura</span>}
                                            </td>
                                            <td className="p-3 border-b border-border/50 text-slate-300 text-sm w-[25%]">
                                                <div>{l.categoria}</div>
                                                {l.tagsIds && l.tagsIds.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {l.tagsIds.map(tid => {
                                                            const tagInfo = (config.tags || []).find(t => t.id === tid);
                                                            if (!tagInfo) return null;
                                                            return (
                                                                <span key={tid} className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-border/50 whitespace-nowrap" style={{ backgroundColor: `${tagInfo.cor}20`, color: tagInfo.cor }}>
                                                                    <TagIcon size={8} /> {tagInfo.nome}
                                                                </span>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className={`p-3 border-b border-border/50 text-right font-bold w-[20%] ${l.tipo === 'RECEITA' ? 'text-success' : 'text-danger'}`}>
                                                {l.tipo === 'DESPESA' ? '-' : ''}{formatCurrency(l.valor)}
                                            </td>
                                            <td className="p-3 border-b border-border/50 text-center w-[10%]">
                                                <button onClick={() => handleDelete(l.id)} className="p-1.5 text-slate-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 mx-auto block">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-card">
                    <h3 className="text-lg font-bold mb-4">Múltiplos Cartões</h3>
                    <p className="text-sm text-slate-400 mb-6">
                        Você possui {cartoesOptions.length} cartões cadastrados. O parcelamento e lançamento das despesas de cartão unificam no fluxo de caixa (DRE).
                    </p>

                    <div className="space-y-3">
                        {cartoesOptions.map((cartao) => (
                            <div key={cartao} onClick={() => setSelectedCard(cartao)} className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedCard === cartao ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20 flex-shrink-0' : 'bg-slate-900 border-border hover:border-primary/50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedCard === cartao ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        <CreditCard size={18} />
                                    </div>
                                    <p className={`font-medium ${selectedCard === cartao ? 'text-primary-foreground' : 'text-slate-300'}`}>{cartao}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-slate-500 mt-6 text-center">
                        Para adicionar novos cartões, acesse a guia "Cadastro".
                    </p>
                </div>
            </div>

            {/* Modal Novo Lançamento de Cartão */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold mb-2">Lançar no Cartão</h2>
                        <p className="text-sm flex items-center gap-2 font-semibold text-primary mb-6 bg-primary/10 w-fit px-3 py-1 rounded-md">
                            <CreditCard size={14} /> {selectedCard}
                        </p>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Data da Despesa</label>
                                    <input
                                        type="date" required value={data} onChange={e => setData(e.target.value)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Tipo de Transação</label>
                                    <select
                                        value={tipo} onChange={e => setTipo(e.target.value as TipoTransacao)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    >
                                        <option value="DESPESA">Despesa Padrão</option>
                                        <option value="RECEITA">Estorno / Crédito</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Estabelecimento / Descrição</label>
                                    <input
                                        type="text" required value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Mercado Livre"
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400 text-slate-400">OBS (Opcional)</label>
                                    <input
                                        type="text" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Anotações para controle..."
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Origem Principal</label>
                                    <select
                                        value={origem} onChange={e => setOrigem(e.target.value as TipoOrigin)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    >
                                        <option value="PF">Pessoa Física (PF)</option>
                                        <option value="PJ">Pessoa Jurídica (PJ)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Categoria DRE</label>
                                    <select
                                        value={categoria} onChange={e => setCategoria(e.target.value)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    >
                                        {(tipo === 'RECEITA' ? (config.categoriasReceita || []) : (config.categoriasDespesa || [])).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Seleção de Tags */}
                            {(config.tags || []).length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-slate-800/50 mt-2">
                                    <label className="text-sm text-slate-400 flex items-center gap-2"><TagIcon size={14} /> Adicionar Etiquetas (Opcional)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {config.tags.map(tag => {
                                            const isSelected = tagsIds.includes(tag.id);
                                            return (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    onClick={() => toggleTag(tag.id)}
                                                    className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${isSelected ? 'border-transparent shadow' : 'bg-transparent border-slate-700 hover:border-slate-500 text-slate-400'}`}
                                                    style={isSelected ? { backgroundColor: tag.cor, color: '#fff' } : {}}
                                                >
                                                    {tag.nome}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {tipo === 'DESPESA' ? (
                                    <div className="space-y-1">
                                        <label className="text-sm flex items-center gap-1 text-slate-400"><Layers size={14} /> Parcelas</label>
                                        <input
                                            type="number" min="1" max="120" required value={parcelas} onChange={e => setParcelas(parseInt(e.target.value) || 1)}
                                            className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none font-medium text-center"
                                        />
                                    </div>
                                ) : (
                                    <div className="hidden md:block"></div>
                                )}
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm text-slate-400">Valor Total (R$)</label>
                                    <input
                                        type="number" step="0.01" required value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00"
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none font-medium text-xl"
                                    />
                                    {parcelas > 1 && tipo === 'DESPESA' && (
                                        <p className="text-xs text-slate-500 text-right mt-1">Serão {parcelas}x de {formatCurrency(parseFloat(valor) / parcelas || 0)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                                <button
                                    type="button" onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors font-medium shadow-lg shadow-primary/20"
                                >
                                    Confirmar Despesa
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Pagamento de Fatura */}
            {isPayModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold mb-2 text-primary">Pagar Fatura</h2>
                        <p className="text-sm text-slate-400 mb-6">
                            Registre o pagamento da fatura do cartão <span className="text-slate-200 font-semibold">{selectedCard}</span>. O seu limite será restaurado imediatamente e as tabelas de caixa não sofrerão impacto de duplicação.
                        </p>

                        <form onSubmit={handlePayInvoice} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Data do Pagamento</label>
                                <input
                                    type="date" required value={payData} onChange={e => setPayData(e.target.value)}
                                    className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Saindo de qual conta?</label>
                                <select
                                    required value={payConta} onChange={e => setPayConta(e.target.value)}
                                    className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                >
                                    <option value="" disabled>Selecione a conta corrente...</option>
                                    {(config?.contas || []).map(c => (
                                        <option key={c.id} value={c.nome}>{c.nome} ({c.carteira})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Valor Pago (R$)</label>
                                <input
                                    type="number" step="0.01" required value={payValor} onChange={e => setPayValor(e.target.value)} placeholder="0.00"
                                    className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none font-medium text-xl text-primary"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                                <button
                                    type="button" onClick={() => setIsPayModalOpen(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors font-medium shadow-lg shadow-primary/20"
                                >
                                    Reconstituir Limite
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cartoes;
