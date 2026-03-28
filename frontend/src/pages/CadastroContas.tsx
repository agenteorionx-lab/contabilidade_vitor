import React, { useState } from 'react';
import { useActiveData } from '../store/useStore';
import { Plus, Edit2, Trash2, Landmark, Wallet, Check } from 'lucide-react';
import { useOrganization } from '@clerk/clerk-react';
import type { ContaBancaria } from '../types';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const CadastroContas = () => {
    const { config, setConfig, cascadeAgenciaGlobal, lancamentos } = useActiveData();
    const contas = config.contas || [];

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [nome, setNome] = useState('');
    const [saldoInicial, setSaldoInicial] = useState('0');
    const [instituicao, setInstituicao] = useState('');
    const [carteira, setCarteira] = useState('Conta PF');
    const [cor, setCor] = useState('#3b82f6'); // blue default
    const [incluirSoma, setIncluirSoma] = useState(true);

    const { organization, membership } = useOrganization();
    const isAdmin = !organization || membership?.role === 'org:admin';

    if (!isAdmin) return <div className="p-8 text-center text-slate-400">Acesso Restrito (Admin Apenas)</div>;

    const presetColors = ['#0ea5e9', '#8b5cf6', '#84cc16', '#f59e0b', '#ef4444', '#14b8a6', '#64748b'];

    const openNewModal = () => {
        setEditingId(null);
        setNome('');
        setSaldoInicial('0');
        setInstituicao('');
        setCarteira('Conta PF');
        setCor(presetColors[0]);
        setIncluirSoma(true);
        setIsModalOpen(true);
    };

    const openEditModal = (conta: ContaBancaria) => {
        setEditingId(conta.id);
        setNome(conta.nome);
        setSaldoInicial(conta.saldoInicial.toString());
        setInstituicao(conta.instituicao);
        setCarteira(conta.carteira);
        setCor(conta.cor || presetColors[0]);
        setIncluirSoma(conta.incluirSoma !== false); // default true se underfined
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        const numSaldo = parseFloat(saldoInicial.replace(',', '.')) || 0;

        let newContas = [...contas];

        if (editingId) {
            const oldConta = contas.find(c => c.id === editingId);
            newContas = newContas.map(conta => {
                if (conta.id === editingId) {
                    return { id: conta.id, nome, saldoInicial: numSaldo, instituicao, carteira, cor, incluirSoma };
                }
                return conta;
            });

            // Cascade name change to historical transactions if name changed
            if (oldConta && oldConta.nome !== nome) {
                cascadeAgenciaGlobal(oldConta.nome, nome);
            }
        } else {
            newContas.push({
                id: generateId(),
                nome: nome || instituicao, // Fallback p nome se vazio
                saldoInicial: numSaldo,
                instituicao,
                carteira,
                cor,
                incluirSoma
            });
        }

        setConfig({ ...config, contas: newContas });
        setIsModalOpen(false);
    };

    const handleDelete = (conta: ContaBancaria) => {
        if (window.confirm(`Tem certeza que deseja remover a conta "${conta.nome}"?`)) {
            const newContas = contas.filter(c => c.id !== conta.id);
            setConfig({ ...config, contas: newContas });
        }
    };

    // Derived Balance (Initial + Transactions)
    const getSaldoAtual = (contaNome: string, initial: number) => {
        const transacoes = lancamentos.filter(l => l.banco === contaNome && l.metodoPagamento !== 'Cartão de Crédito');
        const saldo = transacoes.reduce((acc, l) => acc + (l.tipo === 'RECEITA' ? l.valor : -l.valor), initial);
        return saldo;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Contas Bancárias</h1>
                    <p className="text-slate-400 mt-1">Gerencie suas contas, saldos e carteiras para os lançamentos.</p>
                </div>
                <button
                    onClick={openNewModal}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus size={20} /> Nova Conta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contas.length === 0 ? (
                    <div className="col-span-full text-center p-12 glass-card border-dashed">
                        <Landmark size={48} className="mx-auto text-slate-500 mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-slate-300">Nenhuma conta cadastrada</h3>
                        <p className="text-slate-500 mt-2">Você ainda não registrou nenhuma conta bancária ativa.</p>
                        <button onClick={openNewModal} className="mt-4 text-primary font-medium hover:underline">
                            Adicionar primeira conta
                        </button>
                    </div>
                ) : (
                    contas.map(conta => (
                        <div key={conta.id} className="glass-card flex flex-col relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: conta.cor || '#3b82f6' }} />

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800/50 border border-slate-700">
                                        <Landmark size={20} style={{ color: conta.cor || '#3b82f6' }} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{conta.nome}</h3>
                                        <p className="text-xs text-slate-400">{conta.instituicao}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal(conta)} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(conta)} className="p-1.5 text-slate-400 hover:text-danger bg-slate-800 rounded-lg">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto space-y-4 pt-4 border-t border-slate-800/50">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Saldo Atual</p>
                                    <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                        {formatCurrency(getSaldoAtual(conta.nome, conta.saldoInicial))}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="flex items-center gap-1 text-slate-400"><Wallet size={12} /> {conta.carteira}</span>
                                    {conta.incluirSoma ? (
                                        <span className="text-success bg-success/10 px-2 py-0.5 rounded-full">Soma no Dashboard</span>
                                    ) : (
                                        <span className="text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Oculto do Dashboard</span>
                                    )}
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
                            <h2 className="text-2xl font-bold">{editingId ? 'Editar conta' : 'Nova conta'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                                <Trash2 size={20} className="hidden" /> {/* just for spacing alignment, use close X instead if needed */}
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">
                            {/* Saldo Input styled large */}
                            <div className="border-b border-dashed border-slate-700 pb-2">
                                <label className="text-xs text-slate-500 font-medium">SALDO INICIAL R$</label>
                                <input
                                    type="number" step="0.01" value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)}
                                    className="w-full bg-transparent border-none p-0 text-slate-200 focus:ring-0 outline-none text-4xl font-light placeholder-slate-600 mt-2"
                                    placeholder="0,00"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">Nome identificador (Apelido)</label>
                                <input
                                    type="text" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Nubank Pessoal"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 focus:border-primary outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-slate-400 flex items-center gap-2"><Landmark size={14} /> Instituição financeira</label>
                                <input
                                    type="text" required value={instituicao} onChange={e => setInstituicao(e.target.value)} placeholder="Ex: Nubank, Banco do Brasil"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 focus:border-primary outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-slate-400 flex items-center gap-2"><Wallet size={14} /> Carteira</label>
                                <select
                                    value={carteira} onChange={e => setCarteira(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 focus:border-primary outline-none"
                                >
                                    <option value="Conta PF">Conta PF (Pessoal)</option>
                                    <option value="Conta PJ">Conta PJ (Empresarial)</option>
                                    <option value="Dinheiro Vivo">Dinheiro Vivo / Espécie</option>
                                    <option value="Investimentos">Investimentos / Poupança</option>
                                </select>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-sm text-slate-400">Cor da conta</label>
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

                            <div className="flex items-center justify-between pt-2">
                                <label className="text-sm text-slate-300 flex items-center gap-2 cursor-pointer" onClick={() => setIncluirSoma(!incluirSoma)}>
                                    <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center">
                                        <span className="text-[10px] italic font-serif">i</span>
                                    </div>
                                    Incluir na soma da tela inicial
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIncluirSoma(!incluirSoma)}
                                    className={`w-11 h-6 rounded-full transition-colors relative ${incluirSoma ? 'bg-primary' : 'bg-slate-700'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${incluirSoma ? 'left-5.5 right-0.5 transform translate-x-[18px]' : 'left-0.5'}`} />
                                </button>
                            </div>

                            <div className="flex justify-between items-center pt-6 mt-2">
                                <button type="button" className="text-primary font-bold text-sm tracking-wide bg-transparent">
                                    REAJUSTE DE SALDO
                                </button>
                                <button type="submit" className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl transition-colors font-bold shadow-lg shadow-primary/20">
                                    SALVAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CadastroContas;
