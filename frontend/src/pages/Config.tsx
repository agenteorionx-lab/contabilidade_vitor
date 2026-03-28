import React, { useState } from 'react';
import { useStore, useActiveData } from '../store/useStore';
import { useOrganization } from '@clerk/clerk-react';
import { Settings, Plus, Trash2, Tag as TagIcon, AlertTriangle } from 'lucide-react';
import type { Tag } from '../types';

// Helper Component for List Cards
const ConfigListCard = ({
    title,
    items,
    onRename,
    onDelete,
    onAdd,
    placeholder = "Novo item..."
}: {
    title: string;
    items: string[];
    onRename: (oldName: string, newName: string) => void;
    onDelete: (name: string) => void;
    onAdd: (name: string) => void;
    placeholder?: string;
}) => {
    const [newItem, setNewItem] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem('');
        }
    };

    return (
        <div className="bg-[#1A1D2A] border border-border/30 rounded-xl overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 border-b border-white/5">
                <h3 className="font-bold text-slate-200 text-lg">{title}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {items.length === 0 && <p className="text-sm text-slate-500 italic p-2">Nenhum item cadastrado.</p>}
                {items.map((item, idx) => (
                    <div key={idx} className="group flex items-center justify-between py-2.5 border-b border-white/5 last:border-0 relative">
                        <input
                            type="text"
                            defaultValue={item}
                            // Only trigger rename if the value actually changed
                            onBlur={(e) => {
                                if (e.target.value.trim() && e.target.value !== item) {
                                    onRename(item, e.target.value);
                                } else {
                                    e.target.value = item; // Revert if empty
                                }
                            }}
                            className="bg-transparent border-none text-slate-400 font-medium text-sm focus:outline-none focus:text-slate-200 w-[85%] truncate pr-2"
                        />
                        <button
                            onClick={() => {
                                if (window.confirm(`Tem certeza que deseja remover "${item}"? O histórico será mantido.`)) {
                                    onDelete(item);
                                }
                            }}
                            className="text-slate-600 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity p-1 absolute right-0 bg-[#1A1D2A]"
                            title="Remover"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="p-4 pt-4 border-t border-white/5 mt-auto">
                <form onSubmit={handleAdd} className="flex items-center gap-2">
                    <button type="submit" className="border border-slate-700/50 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap">
                        <Plus size={16} /> Add
                    </button>
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder={placeholder}
                        className="bg-transparent border-none text-slate-200 px-2 py-1 focus:outline-none text-sm w-full font-medium placeholder:text-slate-600"
                    />
                </form>
            </div>
        </div>
    );
};


const Config = () => {
    const {
        config,
        setConfig,
        renameCategoriaGlobal,
        deleteCategoriaGlobal
    } = useActiveData();

    const { organization, membership } = useOrganization();
    const isAdmin = !organization || membership?.role === 'org:admin';

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 mt-20">
                <AlertTriangle size={64} className="text-warning mb-6 opacity-80" />
                <h2 className="text-2xl font-bold text-slate-200 mb-2">Acesso Restrito</h2>
                <p>O seu perfil possui nível de acesso restrito nesta organização.</p>
                <p>Apenas Sócios-Administradores podem modificar estas configurações.</p>
            </div>
        );
    }

    // Tags states
    const [newTagNome, setNewTagNome] = useState('');
    const [newTagCor, setNewTagCor] = useState('#3b82f6');

    // Add Functions
    const safeAdd = (key: keyof typeof config, value: string) => {
        const arr = config[key] as string[];
        if (arr.includes(value)) return;
        setConfig({ ...config, [key]: [...arr, value] });
    };

    // Tags Functions
    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTagNome.trim()) return;
        const newTag: Tag = { id: crypto.randomUUID(), nome: newTagNome.trim(), cor: newTagCor };
        setConfig({ ...config, tags: [...(config.tags || []), newTag] });
        setNewTagNome('');
    };

    const handleDeleteTag = (id: string) => {
        setConfig({ ...config, tags: (config.tags || []).filter(t => t.id !== id) });
    };

    const handleUpdateTag = (id: string, updates: Partial<Tag>) => {
        setConfig({ ...config, tags: (config.tags || []).map(t => t.id === id ? { ...t, ...updates } : t) });
    };

    // System Reset
    const handleResetAll = () => {
        if (confirm("ATENÇÃO: Restaura Categorias, Bancos e Cartões pro padrão inicial. Opcional se você 'quebrou' a lista sem querer. Deseja continuar?")) {
            const initialConfig = {
                categoriasReceita: ['Salário', 'Serviços', 'Venda', 'Investimento', 'Outros'],
                categoriasDespesa: ['Mercado', 'Moradia', 'Energia', 'Água', 'Lazer', 'Impostos', 'Transporte', 'Saúde'],
                contas: [],
                cartoesCredito: [],
                metodosPagamento: ['PIX', 'Cartão de Crédito', 'Dinheiro', 'Boleto', 'Transferência'],
                tags: []
            };
            setConfig(initialConfig);
        }
    };

    if (!config) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Settings className="text-primary" size={32} /> Central de Configurações
                </h1>
                <p className="text-slate-400 mt-1">Organize suas gavetas. Tudo que for alterado aqui irá refletir magicamente em todo o histórico de lançamentos e relatórios.</p>
            </div>

            {/* Linha Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ConfigListCard
                    title="Categorias (Despesa)"
                    items={config.categoriasDespesa}
                    onRename={(oldN, newN) => renameCategoriaGlobal(oldN, newN, 'DESPESA')}
                    onDelete={(name) => deleteCategoriaGlobal(name, 'DESPESA')}
                    onAdd={(name) => safeAdd('categoriasDespesa', name)}
                    placeholder="Nova despesa..."
                />

                <ConfigListCard
                    title="Categorias (Receita)"
                    items={config.categoriasReceita}
                    onRename={(oldN, newN) => renameCategoriaGlobal(oldN, newN, 'RECEITA')}
                    onDelete={(name) => deleteCategoriaGlobal(name, 'RECEITA')}
                    onAdd={(name) => safeAdd('categoriasReceita', name)}
                    placeholder="Nova receita..."
                />

                {/* Tags Management */}
                <div className="bg-card border border-border/50 rounded-xl p-6 h-[400px] flex flex-col">
                    <h3 className="font-bold text-slate-200 text-lg flex items-center gap-2 mb-2 min-h-[28px]"><TagIcon size={20} className="text-primary" /> Etiquetas (Tags)</h3>

                    <form onSubmit={handleAddTag} className="flex gap-2 mb-4 shrink-0 mt-3 border-b border-white/5 pb-4">
                        <input
                            type="text"
                            required
                            value={newTagNome}
                            onChange={e => setNewTagNome(e.target.value)}
                            placeholder="Nome..."
                            className="bg-slate-900 border border-border text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary text-sm w-[110px]"
                        />
                        <div className="w-10">
                            <input
                                type="color"
                                value={newTagCor}
                                onChange={e => setNewTagCor(e.target.value)}
                                className="w-full h-[34px] p-0 border-none outline-none cursor-pointer bg-slate-900 rounded-lg overflow-hidden"
                            />
                        </div>
                        <button type="submit" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors h-[34px]">
                            Add
                        </button>
                    </form>

                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                        {(!config.tags || config.tags.length === 0) && (
                            <p className="text-slate-500 text-sm italic p-2">Nenhuma tag cadastrada.</p>
                        )}
                        {(config.tags || []).map(tag => (
                            <div key={tag.id} className="bg-slate-900 border border-white/5 rounded-lg p-2.5 flex items-center gap-3 group shrink-0">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.cor }}></div>
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                    <input
                                        type="text"
                                        defaultValue={tag.nome}
                                        onBlur={(e) => handleUpdateTag(tag.id, { nome: e.target.value })}
                                        className="bg-transparent border-none text-slate-300 font-medium p-0 focus:ring-0 focus:outline-none text-sm w-full truncate"
                                    />
                                    <input
                                        type="color"
                                        defaultValue={tag.cor}
                                        onBlur={(e) => handleUpdateTag(tag.id, { cor: e.target.value })}
                                        className="w-4 h-4 p-0 border-none outline-none cursor-pointer bg-transparent shrink-0"
                                    />
                                </div>
                                <button onClick={() => handleDeleteTag(tag.id)} className="text-slate-500 hover:text-danger opacity-0 group-hover:opacity-100 p-1 shrink-0">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-8 border-t border-border/50 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            if (confirm("Isso irá preencher seu dashboard com dados fictícios para fins de teste. Deseja continuar?")) {
                                useStore.getState().seedMockData();
                                alert("Dados de teste gerados com sucesso!");
                            }
                        }}
                        className="flex items-center gap-2 bg-success/10 text-success hover:bg-success/20 px-4 py-2 rounded-xl transition-all text-sm font-bold border border-success/20"
                    >
                        ✨ Gerar Dados de Teste
                    </button>

                    <button
                        onClick={() => {
                            if (confirm("Isso irá apagar TODOS os seus dados locais. Tem certeza?")) {
                                useStore.getState().clearState();
                                window.location.reload();
                            }
                        }}
                        className="flex items-center gap-2 bg-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded-xl transition-all text-sm font-medium"
                    >
                        <Trash2 size={16} /> Limpar Tudo
                    </button>
                </div>

                <button
                    onClick={handleResetAll}
                    className="flex items-center gap-2 text-danger opacity-60 hover:opacity-100 hover:bg-danger/10 px-4 py-2 rounded-xl transition-all text-sm font-medium"
                >
                    <AlertTriangle size={16} /> Restaurar Tabelas Padrões
                </button>
            </div>

        </div>
    );
};

export default Config;
