import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreState, ConfigData } from '../types';
import { supabase } from '../lib/supabaseClient';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const initialConfig: ConfigData = {
    categoriasReceita: ['Salário', 'Serviços', 'Venda', 'Investimento', 'Outros'],
    categoriasDespesa: ['Mercado', 'Moradia', 'Energia', 'Água', 'Lazer', 'Impostos', 'Transporte', 'Saúde'],
    contas: [],
    cartoesCredito: [],
    metodosPagamento: ['PIX', 'Cartão de Crédito', 'Dinheiro', 'Boleto', 'Transferência'],
    tags: []
};

// Types definitions to assist type inference in migration
type AnyState = any;

export const useStore = create<StoreState>()(
    persist(
        (set, get) => ({
            lancamentos: [],
            investimentos: [],
            ativosBolsa: [],
            dividas: [],
            custosFixos: [],
            config: initialConfig,
            userId: null,

            setUserId: (userId: string | null) => set({ userId }),

            setLancamentos: async (lancamentos) => {
                set({ lancamentos });
                const userId = get().userId;
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    // Sync to cloud (Simplified bulk upsert for this dashboard)
                    // In a production app with high volume, we'd sync individual changes
                    const syncData = lancamentos.map(l => ({ ...l, user_id: userId }));
                    await supabase.from('lancamentos').upsert(syncData);
                }
            },
            setInvestimentos: async (investimentos) => {
                set({ investimentos });
                const userId = get().userId;
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    const syncData = investimentos.map(i => ({ ...i, user_id: userId }));
                    await supabase.from('investimentos').upsert(syncData);
                }
            },
            setAtivosBolsa: async (ativosBolsa) => {
                set({ ativosBolsa });
                const userId = get().userId;
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    // Assuming assets table exists or we'll add it
                    const syncData = ativosBolsa.map(a => ({ ...a, user_id: userId }));
                    await supabase.from('ativos_bolsa').upsert(syncData);
                }
            },
            setDividas: async (dividas) => {
                set({ dividas });
                const userId = get().userId;
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    const syncData = dividas.map(d => ({ ...d, user_id: userId }));
                    await supabase.from('dividas').upsert(syncData);
                }
            },
            setCustosFixos: async (custosFixos) => {
                set({ custosFixos });
                const userId = get().userId;
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    const syncData = custosFixos.map(cf => ({ ...cf, user_id: userId }));
                    await supabase.from('custos_fixos').upsert(syncData);
                }
            },
            setConfig: async (config) => {
                set({ config });
                const userId = get().userId;
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    // Sync Accounts
                    if (config.contas) {
                        const syncContas = config.contas.map(c => ({ ...c, user_id: userId }));
                        await supabase.from('contas').upsert(syncContas);
                    }
                    // Sync Cards
                    if (config.cartoesCredito) {
                        const syncCards = config.cartoesCredito.map(c => ({ ...c, user_id: userId }));
                        await supabase.from('cartoes_credito').upsert(syncCards);
                    }
                    // Sync Global Config (Categories, etc)
                    await supabase.from('config_global').upsert({
                        user_id: userId,
                        categorias_receita: config.categoriasReceita,
                        categorias_despesa: config.categoriasDespesa,
                        metodos_pagamento: config.metodosPagamento,
                        tags: config.tags
                    });
                }
            },

            clearState: () => {
                set({ 
                    lancamentos: [], 
                    investimentos: [], 
                    ativosBolsa: [], 
                    dividas: [], 
                    custosFixos: [], 
                    config: initialConfig,
                    userId: null
                });
            },

            initializeFromCloud: async (userId: string) => {
                if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    return;
                }

                try {
                    const [
                        { data: lancs },
                        { data: invs },
                        { data: costs },
                        { data: accs },
                        { data: cards },
                        { data: glob }
                    ] = await Promise.all([
                        supabase.from('lancamentos').select('*').eq('user_id', userId),
                        supabase.from('investimentos').select('*').eq('user_id', userId),
                        supabase.from('custos_fixos').select('*').eq('user_id', userId),
                        supabase.from('contas').select('*').eq('user_id', userId),
                        supabase.from('cartoes_credito').select('*').eq('user_id', userId),
                        supabase.from('config_global').select('*').eq('user_id', userId).single()
                    ]);

                    const newConfig = { ...get().config };
                    if (accs) newConfig.contas = accs;
                    if (cards) newConfig.cartoesCredito = cards;
                    if (glob) {
                        newConfig.categoriasReceita = glob.categorias_receita;
                        newConfig.categoriasDespesa = glob.categorias_despesa;
                        newConfig.metodosPagamento = glob.metodos_pagamento;
                        newConfig.tags = glob.tags;
                    }

                    set({
                        lancamentos: lancs || [],
                        investimentos: invs || [],
                        custosFixos: costs || [],
                        config: newConfig
                    });
                } catch (error) {
                    console.error('Error fetching from cloud:', error);
                }
            },

            // Substituir categorias de toda a base em um único movimento
            renameCategoriaGlobal: (oldName, newName, tipo) => set((state) => {
                const isDespesa = tipo === 'DESPESA';
                const key = isDespesa ? 'categoriasDespesa' : 'categoriasReceita';

                // 1. Atualizar no Config list
                const newConfig = { ...state.config };
                if (newConfig[key]) {
                    newConfig[key] = newConfig[key].map(c => c === oldName ? newName : c);
                }

                // 2. Atualizar nos Lançamentos passados
                const newLancamentos = state.lancamentos.map(l => {
                    if (l.tipo === tipo && l.categoria === oldName) {
                        return { ...l, categoria: newName };
                    }
                    return l;
                });

                // 3. Se for despesa, atualizar os Custos Fixos que baseiam no mesmo nome
                let newCustosFixos = state.custosFixos;
                if (isDespesa) {
                    newCustosFixos = state.custosFixos.map(cf => {
                        if (cf.categoria === oldName) return { ...cf, categoria: newName };
                        return cf;
                    });
                }

                return { config: newConfig, lancamentos: newLancamentos, custosFixos: newCustosFixos };
            }),

            deleteCategoriaGlobal: (name, tipo) => set((state) => {
                const key = tipo === 'DESPESA' ? 'categoriasDespesa' : 'categoriasReceita';
                const newConfig = { ...state.config };
                if (newConfig[key]) {
                    newConfig[key] = newConfig[key].filter(c => c !== name);
                }
                return { config: newConfig };
            }),

            // Update legacy data across the ledger when an Account or Card is renamed
            cascadeAgenciaGlobal: (oldName, newName) => set((state) => {
                const newLancamentos = state.lancamentos.map(l => {
                    // Method payments are distinct, but the "banco" field historically captured both Account ID or Card ID
                    if (l.banco === oldName) {
                        return { ...l, banco: newName };
                    }
                    return l;
                });
                return { lancamentos: newLancamentos };
            }),
        }),
        {
            name: 'finance-dashboard-storage',
            version: 1, // Start versions for potential future schema migrations
            migrate: (persistedState: AnyState, version: number) => {
                // Perform state migrations here if needed when parsing JSON
                if (version === 0 || !persistedState?.config?.contas) {
                    // Base Migration Scenario: moving basic string config into object config
                    const state = { ...persistedState } as StoreState;
                    if (state.config) {
                        state.config.contas = state.config.contas || [];
                        state.config.cartoesCredito = state.config.cartoesCredito || [];

                        // Migrate Legacy BancosPF
                        if (state.config.bancosPF && Array.isArray(state.config.bancosPF)) {
                            state.config.bancosPF.forEach((bancoStr) => {
                                if (typeof bancoStr === 'string' && !state.config.contas.some(c => c.nome === bancoStr)) {
                                    state.config.contas.push({
                                        id: generateId(),
                                        nome: bancoStr,
                                        saldoInicial: 0,
                                        instituicao: bancoStr,
                                        carteira: 'Conta PF',
                                        cor: '#3b82f6', // blue-500
                                        incluirSoma: true
                                    });
                                }
                            });
                            // Remove legacy arrays
                            delete state.config.bancosPF;
                        }

                        // Migrate Legacy BancosPJ
                        if (state.config.bancosPJ && Array.isArray(state.config.bancosPJ)) {
                            state.config.bancosPJ.forEach((bancoStr) => {
                                if (typeof bancoStr === 'string' && !state.config.contas.some(c => c.nome === bancoStr)) {
                                    state.config.contas.push({
                                        id: generateId(),
                                        nome: bancoStr,
                                        saldoInicial: 0,
                                        instituicao: bancoStr,
                                        carteira: 'Conta PJ',
                                        cor: '#8b5cf6', // purple-500
                                        incluirSoma: true
                                    });
                                }
                            });
                            // Remove legacy arrays
                            delete state.config.bancosPJ;
                        }

                        // Migrate Legacy Cartoes
                        if (state.config.cartoes && Array.isArray(state.config.cartoes)) {
                            state.config.cartoes.forEach((cartaoStr) => {
                                if (typeof cartaoStr === 'string' && !state.config.cartoesCredito.some(c => c.nome === cartaoStr)) {
                                    state.config.cartoesCredito.push({
                                        id: generateId(),
                                        nome: cartaoStr,
                                        limite: 0,
                                        diaVencimento: 10,
                                        diaFechamento: 3,
                                        cor: '#ef4444', // red-500
                                        instituicao: cartaoStr
                                    });
                                }
                            });
                            // Remove legacy arrays
                            delete state.config.cartoes;
                        }
                    }
                    return state;
                }
                return persistedState;
            }
        }
    )
);
