import React, { useState, useEffect, useMemo } from 'react';
import { useActiveData } from '../store/useStore';
import type { Lancamento, TipoOrigin, TipoTransacao } from '../types';
import { Plus, Search, Trash2, Pencil, ArrowUpCircle, ArrowDownCircle, Layers, Tag as TagIcon } from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';

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

const Lancamentos = () => {
    const { lancamentos = [], config, dividas = [], setLancamentos } = useActiveData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [tipo, setTipo] = useState<TipoTransacao>('DESPESA');
    const [categoria, setCategoria] = useState('');
    const [origem, setOrigem] = useState<TipoOrigin>('PF');
    const [banco, setBanco] = useState('');
    const [metodoPagamento, setMetodoPagamento] = useState('PIX');
    const [parcelas, setParcelas] = useState(1);
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [dividaId, setDividaId] = useState('');
    const [tagsIds, setTagsIds] = useState<string[]>([]);

    // Sync initial state when config loads/changes
    useEffect(() => {
        if (config) {
            if (!categoria && config.categoriasDespesa?.length > 0) setCategoria(config.categoriasDespesa[0]);
            if (!banco && config.contas?.length > 0) setBanco(config.contas[0].nome);
            if (config.metodosPagamento?.length > 0 && !!metodoPagamento === false) setMetodoPagamento(config.metodosPagamento[0]); // fallback if empty
        }
    }, [config]);

    const getOpcoesBanco = () => {
        if (!config) return [];
        if (metodoPagamento === 'Cartão de Crédito') {
            return (config.cartoesCredito || []).map(c => c.nome);
        }
        const carteiraFiltro = origem === 'PF' ? 'Conta PF' : 'Conta PJ';
        return (config.contas || []).filter(c => c.carteira === carteiraFiltro).map(c => c.nome);
    };

    const toggleTag = (id: string) => {
        setTagsIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const handleEdit = (l: Lancamento) => {
        setEditingId(l.id);
        setData(l.data);
        setTipo(l.tipo);
        setCategoria(l.categoria);
        setOrigem(l.origem);
        setBanco(l.banco || '');
        setMetodoPagamento(l.metodoPagamento || 'PIX');
        setValor(l.valor.toString());
        setDescricao(l.descricao);
        setObservacoes(l.observacoes || '');
        setDividaId(l.dividaId || '');
        setTagsIds(l.tagsIds || []);
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const numValor = parseFloat(valor);
        if (isNaN(numValor) || numValor <= 0) return;

        const baseDate = parseISO(data);
        
        if (editingId) {
            const updatedLancs = lancamentos.map(l => {
                if (l.id === editingId) {
                    return {
                        ...l,
                        data,
                        tipo,
                        categoria,
                        origem,
                        banco,
                        metodoPagamento,
                        valor: numValor,
                        descricao,
                        dividaId: dividaId || undefined,
                        tagsIds: tagsIds.length > 0 ? tagsIds : undefined,
                        observacoes: observacoes || undefined
                    };
                }
                return l;
            });
            setLancamentos(updatedLancs);
        } else {
            const newLancs: Lancamento[] = [];
            if (tipo === 'DESPESA' && metodoPagamento === 'Cartão de Crédito' && parcelas > 1) {
                const valorParcela = numValor / parcelas;
                for (let i = 0; i < parcelas; i++) {
                    const dataParcela = format(addMonths(baseDate, i), 'yyyy-MM-dd');
                    newLancs.push({
                        id: generateId(),
                        data: dataParcela,
                        tipo,
                        categoria,
                        origem,
                        banco,
                        metodoPagamento,
                        valor: valorParcela,
                        descricao: `${descricao} (Parcela ${i + 1}/${parcelas})`,
                        isParcela: true,
                        parcelaInfo: `${i + 1}/${parcelas}`,
                        dividaId: dividaId || undefined,
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
                    banco,
                    metodoPagamento,
                    valor: numValor,
                    descricao,
                    dividaId: dividaId || undefined,
                    tagsIds: tagsIds.length > 0 ? tagsIds : undefined,
                    observacoes: observacoes || undefined
                });
            }
            setLancamentos([...lancamentos, ...newLancs]);
        }

        setIsModalOpen(false);
        setEditingId(null);
        setValor('');
        setDescricao('');
        setObservacoes('');
        setParcelas(1);
        setDividaId('');
        setTagsIds([]);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Excluir este lançamento?')) {
            setLancamentos(lancamentos.filter(l => l.id !== id));
        }
    };

    // Safe sorting and filtering
    const sorted = useMemo(() => {
        return [...lancamentos]
            .filter(l => l.metodoPagamento !== 'Cartão de Crédito')
            .sort((a, b) => {
                try {
                    return new Date(b.data).getTime() - new Date(a.data).getTime();
                } catch (e) {
                    return 0;
                }
            });
    }, [lancamentos]);

    // Safety check for rendering
    if (!config) return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;

    return (
        <div className="space-y-6 relative h-full flex flex-col animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Lançamentos & Transações</h1>
                    <p className="text-slate-400 mt-1">Gerencie Pix, Boletos, e transações diversas.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setValor('');
                        setDescricao('');
                        setObservacoes('');
                        setParcelas(1);
                        setDividaId('');
                        setTagsIds([]);
                        setIsModalOpen(true);
                    }}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus size={20} /> Novo Lançamento
                </button>
            </div>

            <div className="glass-card flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar transação..."
                            className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 pr-2">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-card/95 backdrop-blur z-10">
                            <tr>
                                <th className="p-3 text-slate-400 font-medium border-b border-border">Data</th>
                                <th className="p-3 text-slate-400 font-medium border-b border-border">Tipo</th>
                                <th className="p-3 text-slate-400 font-medium border-b border-border text-center">Origem</th>
                                <th className="p-3 text-slate-400 font-medium border-b border-border">Categoria / Etiquetas</th>
                                <th className="p-3 text-slate-400 font-medium border-b border-border">Descrição</th>
                                <th className="p-3 text-slate-400 font-medium border-b border-border">Banco</th>
                                <th className="p-3 text-slate-400 font-medium border-b border-border text-right">Valor</th>
                                <th className="p-3 text-slate-400 font-medium border-b border-border text-center">Forma de Pgto.</th>
                                <th className="p-3 text-slate-400 font-medium border-b border-border">OBS</th>
                                <th className="p-3 text-slate-400 font-medium border-b border-border text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.length === 0 && (
                                <tr><td colSpan={10} className="text-center p-8 text-slate-500">Nenhum lançamento registrado.</td></tr>
                            )}
                            {sorted.map(l => (
                                <tr key={l.id} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-3 border-b border-border/50 text-slate-300 whitespace-nowrap">
                                        {l.data ? format(parseISO(l.data), 'dd/MM/yyyy') : '-'}
                                    </td>
                                    <td className="p-3 border-b border-border/50">
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${l.tipo === 'RECEITA' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                            {l.tipo === 'RECEITA' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                            {l.tipo}
                                        </div>
                                    </td>
                                    <td className="p-3 border-b border-border/50 text-center">
                                        <span className="px-2 py-1 bg-slate-800 rounded-md text-xs font-medium border border-border">{l.origem}</span>
                                    </td>
                                    <td className="p-3 border-b border-border/50">
                                        <div className="text-sm text-slate-300 font-medium">{l.categoria}</div>
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
                                    <td className="p-3 border-b border-border/50 font-medium text-slate-200">
                                        {l.descricao}
                                    </td>
                                    <td className="p-3 border-b border-border/50 text-sm text-slate-300">
                                        {l.banco}
                                    </td>
                                    <td className={`p-3 border-b border-border/50 text-right font-bold whitespace-nowrap ${l.tipo === 'RECEITA' ? 'text-success' : 'text-danger'}`}>
                                        {l.tipo === 'DESPESA' ? '-' : ''}{formatCurrency(l.valor)}
                                    </td>
                                    <td className="p-3 border-b border-border/50 text-center text-xs text-slate-400">
                                        {l.metodoPagamento}
                                    </td>
                                    <td className="p-3 border-b border-border/50 text-xs text-slate-400 max-w-[150px] truncate" title={l.observacoes}>
                                        {l.observacoes || '-'}
                                    </td>
                                    <td className="p-3 border-b border-border/50 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => handleEdit(l)} className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <Pencil size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(l.id)} className="p-2 text-slate-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Novo Lançamento */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                        <h2 className="text-2xl font-bold mb-6">{editingId ? 'Editar Transação' : 'Nova Transação'}</h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Data do Lançamento</label>
                                    <input
                                        type="date" required value={data} onChange={e => setData(e.target.value)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Tipo da Transação</label>
                                    <select
                                        value={tipo} onChange={e => setTipo(e.target.value as TipoTransacao)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    >
                                        <option value="RECEITA">Receita</option>
                                        <option value="DESPESA">Despesa</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Descrição / Produto</label>
                                    <input
                                        type="text" required value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Pagamento Fornecedor Ltda"
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400 text-slate-400">OBS (Opcional)</label>
                                    <input
                                        type="text" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações adicionais..."
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Origem</label>
                                    <select
                                        value={origem} onChange={e => setOrigem(e.target.value as TipoOrigin)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    >
                                        <option value="PF">PF</option>
                                        <option value="PJ">PJ</option>
                                    </select>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-sm text-slate-400">Banco / Responsável</label>
                                    <select
                                        value={banco} onChange={e => setBanco(e.target.value)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {getOpcoesBanco().map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                {tipo === 'DESPESA' && (dividas || []).some(d => d.status !== 'Quitada') && (
                                    <div className="space-y-1">
                                        <label className="text-sm flex items-center gap-2 text-warning">
                                            Vincular à Dívida <span className="text-[10px] bg-warning/20 px-1 rounded font-bold">Opcional</span>
                                        </label>
                                        <select
                                            value={dividaId} onChange={e => setDividaId(e.target.value)}
                                            className="w-full bg-slate-900 border border-warning/50 rounded-lg p-2.5 text-warning focus:border-warning outline-none"
                                        >
                                            <option value="">-- Não vincular --</option>
                                            {(dividas || []).filter(d => d.status !== 'Quitada').map(d => {
                                                const pago = (lancamentos || []).filter(l => l.dividaId === d.id && l.tipo === 'DESPESA').reduce((acc, curr) => acc + curr.valor, 0);
                                                const restante = Math.max(0, d.valorOriginal - pago);
                                                return <option key={d.id} value={d.id}>{d.credor} (Restante: {formatCurrency(restante)})</option>
                                            })}
                                        </select>
                                    </div>
                                )}
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

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1 lg:col-span-1">
                                    <label className="text-sm text-slate-400">Método</label>
                                    <select
                                        value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)}
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none"
                                    >
                                        {(config.metodosPagamento || []).filter(m => m !== 'Cartão de Crédito').map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>

                                {metodoPagamento === 'Cartão de Crédito' && tipo === 'DESPESA' ? (
                                    <div className="space-y-1 lg:col-span-1">
                                        <label className="text-sm flex items-center gap-1 text-slate-400"><Layers size={14} /> Parcelas</label>
                                        <input
                                            type="number" min="1" max="120" required value={parcelas} onChange={e => setParcelas(parseInt(e.target.value) || 1)}
                                            className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none font-medium"
                                        />
                                    </div>
                                ) : (
                                    <div className="hidden lg:block lg:col-span-1"></div>
                                )}

                                <div className="space-y-1 lg:col-span-2">
                                    <label className="text-sm text-slate-400">Valor Total (R$)</label>
                                    <input
                                        type="number" step="0.01" required value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00"
                                        className="w-full bg-slate-900 border border-border rounded-lg p-2.5 text-slate-200 focus:border-primary outline-none font-medium text-xl"
                                    />
                                    {parcelas > 1 && metodoPagamento === 'Cartão de Crédito' && (
                                        <p className="text-xs text-slate-500 text-right">Serão {parcelas}x de {formatCurrency(parseFloat(valor) / parcelas || 0)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                                <button
                                    type="button" onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingId(null);
                                    }}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors font-medium shadow-lg shadow-primary/20"
                                >
                                    Salvar Transação
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lancamentos;
