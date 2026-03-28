import React, { useState } from 'react';
import { useStore, useActiveData } from '../store/useStore';
import { Plus, Edit2, Trash2, CreditCard, Calendar, Check } from 'lucide-react';
import { useOrganization } from '@clerk/clerk-react';
import type { CartaoCredito } from '../types';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const CadastroCartoes = () => {
    const { config, setConfig, cascadeAgenciaGlobal } = useActiveData();
    const cartoes = config.cartoesCredito || [];

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [nome, setNome] = useState('');
    const [limite, setLimite] = useState('');
    const [instituicao, setInstituicao] = useState('');
    const [diaVencimento, setDiaVencimento] = useState(10);
    const [diaFechamento, setDiaFechamento] = useState<number>(3);
    const [cor, setCor] = useState('#000000');

    const { organization, membership } = useOrganization();
    const isAdmin = !organization || membership?.role === 'org:admin';

    if (!isAdmin) return <div className="p-8 text-center text-slate-400">Acesso Restrito (Admin Apenas)</div>;

    const presetColors = ['#0ea5e9', '#8b5cf6', '#84cc16', '#f59e0b', '#ef4444', '#f43f5e', '#64748b'];

    const openNewModal = () => {
        setEditingId(null);
        setNome('');
        setLimite('');
        setInstituicao('');
        setDiaVencimento(10);
        setDiaFechamento(3);
        setCor(presetColors[1]); // Roxo default pra cartão
        setIsModalOpen(true);
    };

    const openEditModal = (cartao: CartaoCredito) => {
        setEditingId(cartao.id);
        setNome(cartao.nome);
        setLimite(cartao.limite ? cartao.limite.toString() : '');
        setInstituicao(cartao.instituicao);
        setDiaVencimento(cartao.diaVencimento);
        setDiaFechamento(cartao.diaFechamento);
        setCor(cartao.cor || presetColors[1]);
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        const numLimite = parseFloat(limite.replace(',', '.')) || 0;

        let newCartoes = [...cartoes];

        if (editingId) {
            const oldCartao = cartoes.find(c => c.id === editingId);
            newCartoes = newCartoes.map(cartao => {
                if (cartao.id === editingId) {
                    return { id: cartao.id, nome, limite: numLimite, instituicao, diaVencimento, diaFechamento, cor };
                }
                return cartao;
            });

            // Cascade name change to historical transactions if name changed
            if (oldCartao && oldCartao.nome !== nome) {
                cascadeAgenciaGlobal(oldCartao.nome, nome);
            }
        } else {
            newCartoes.push({
                id: generateId(),
                nome: nome || instituicao, // Fallback p nome se vazio
                limite: numLimite,
                instituicao,
                diaVencimento,
                diaFechamento,
                cor
            });
        }

        setConfig({ ...config, cartoesCredito: newCartoes });
        setIsModalOpen(false);
    };

    const handleDelete = (cartao: CartaoCredito) => {
        if (window.confirm(`Tem certeza que deseja remover o cartão "${cartao.nome}"?`)) {
            const newCartoes = cartoes.filter(c => c.id !== cartao.id);
            setConfig({ ...config, cartoesCredito: newCartoes });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Cartões de Crédito</h1>
                    <p className="text-slate-400 mt-1">Gerencie seus cartões, limites e dias de fechamento.</p>
                </div>
                <button
                    onClick={openNewModal}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus size={20} /> Novo Cartão
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cartoes.length === 0 ? (
                    <div className="col-span-full text-center p-12 glass-card border-dashed">
                        <CreditCard size={48} className="mx-auto text-slate-500 mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-slate-300">Nenhum cartão cadastrado</h3>
                        <p className="text-slate-500 mt-2">Você ainda não registrou nenhum cartão de crédito.</p>
                        <button onClick={openNewModal} className="mt-4 text-primary font-medium hover:underline">
                            Adicionar primeiro cartão
                        </button>
                    </div>
                ) : (
                    cartoes.map(cartao => (
                        <div key={cartao.id} className="glass-card flex flex-col relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: cartao.cor || '#8b5cf6' }} />

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800/50 border border-slate-700">
                                        <CreditCard size={20} style={{ color: cartao.cor || '#8b5cf6' }} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{cartao.nome}</h3>
                                        <p className="text-xs text-slate-400">{cartao.instituicao}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal(cartao)} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(cartao)} className="p-1.5 text-slate-400 hover:text-danger bg-slate-800 rounded-lg">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto space-y-4 pt-4 border-t border-slate-800/50">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Limite Disponível</p>
                                    <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                        {cartao.limite ? formatCurrency(cartao.limite) : 'Não definido'}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="flex items-center gap-1 text-slate-400 bg-slate-800 px-2 py-1 rounded"><Calendar size={12} /> Vence dia {cartao.diaVencimento}</span>
                                    <span className="flex items-center gap-1 text-slate-400 bg-slate-800 px-2 py-1 rounded">Fecha dia {cartao.diaFechamento}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Cadastro */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">{editingId ? 'Editar cartão' : 'Novo cartão'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                                <Trash2 size={20} className="hidden" />
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">
                            {/* Limite Input styled large */}
                            <div className="border-b border-dashed border-slate-700 pb-2">
                                <label className="text-xs text-slate-500 font-medium">LIMITE DO CARTÃO R$</label>
                                <input
                                    type="number" step="0.01" value={limite} onChange={e => setLimite(e.target.value)}
                                    className="w-full bg-transparent border-none p-0 text-slate-200 focus:ring-0 outline-none text-4xl font-light placeholder-slate-600 mt-2"
                                    placeholder="0,00"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Nome identificador (Apelido)</label>
                                <input
                                    type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Cartão Nubank Pessoal"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 focus:border-primary outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-slate-400 flex items-center gap-2"><CreditCard size={14} /> Instituição financeira</label>
                                <input
                                    type="text" required value={instituicao} onChange={e => setInstituicao(e.target.value)} placeholder="Ex: Nubank, Itaú"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 focus:border-primary outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Dia de fechamento</label>
                                    <input
                                        type="number" min="1" max="31" required value={diaFechamento} onChange={e => setDiaFechamento(parseInt(e.target.value) || 1)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-slate-400">Dia de vencimento</label>
                                    <input
                                        type="number" min="1" max="31" required value={diaVencimento} onChange={e => setDiaVencimento(parseInt(e.target.value) || 1)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-sm text-slate-400">Cor do cartão</label>
                                <div className="flex gap-2">
                                    {presetColors.map(c => (
                                        <button
                                            key={c} type="button" onClick={() => setCor(c)}
                                            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                                            style={{ backgroundColor: c }}
                                        >
                                            {cor === c && <Check size={16} color="#fff" />}
                                        </button>
                                    ))}
                                    <div className="relative">
                                        <input
                                            type="color" value={cor} onChange={e => setCor(e.target.value)}
                                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                        />
                                        <button type="button" className="px-3 py-1.5 bg-slate-800 text-xs font-medium rounded-full text-slate-300">OUTROS</button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 mt-2">
                                <button type="submit" className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl transition-colors font-bold shadow-lg shadow-primary/20">
                                    SALVAR CARTÃO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CadastroCartoes;
