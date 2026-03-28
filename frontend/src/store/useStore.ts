import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type { StoreState, ConfigData, Lancamento } from '../types';
import { supabase } from '../lib/supabaseClient';

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const initialConfig: ConfigData = {
    categoriasReceita: ['Salário', 'Serviços', 'Venda', 'Outros'],
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
            dividas: [],
            custosFixos: [],
            config: initialConfig,
            userId: null,
            activeOrgId: null,

            setUserId: (userId: string | null) => set({ userId }),
            setActiveOrgId: (orgId: string | null) => set({ activeOrgId: orgId }),

            setLancamentos: async (lancamentos) => {
                const { userId, activeOrgId, lancamentos: allL } = get();
                const others = allL.filter(l => activeOrgId ? l.orgId !== activeOrgId : (l.orgId && l.orgId !== null));
                const combined = [...others, ...lancamentos];
                set({ lancamentos: combined });
                
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    const syncData = lancamentos.map(l => ({ ...l, user_id: userId, org_id: activeOrgId }));
                    await supabase.from('lancamentos').upsert(syncData);
                }
            },
            setDividas: async (dividas) => {
                const { userId, activeOrgId, dividas: allD } = get();
                const others = allD.filter(d => activeOrgId ? d.orgId !== activeOrgId : (d.orgId && d.orgId !== null));
                set({ dividas: [...others, ...dividas] });
                
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    const syncData = dividas.map(d => ({ ...d, user_id: userId, org_id: activeOrgId }));
                    await supabase.from('dividas').upsert(syncData);
                }
            },
            setCustosFixos: async (custosFixos) => {
                const { userId, activeOrgId, custosFixos: allC } = get();
                const others = allC.filter(c => activeOrgId ? c.orgId !== activeOrgId : (c.orgId && c.orgId !== null));
                set({ custosFixos: [...others, ...custosFixos] });
                
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    const syncData = custosFixos.map(cf => ({ ...cf, user_id: userId, org_id: activeOrgId }));
                    await supabase.from('custos_fixos').upsert(syncData);
                }
            },
            setConfig: async (config) => {
                const { userId, activeOrgId, config: oldConfig } = get();
                
                // Preserve other orgs accounts/cards
                const otherContas = oldConfig.contas?.filter(c => activeOrgId ? c.orgId !== activeOrgId : (c.orgId && c.orgId !== null)) || [];
                const otherCartoes = oldConfig.cartoesCredito?.filter(c => activeOrgId ? c.orgId !== activeOrgId : (c.orgId && c.orgId !== null)) || [];
                
                const finalConfig = {
                    ...config,
                    contas: [...otherContas, ...(config.contas || [])],
                    cartoesCredito: [...otherCartoes, ...(config.cartoesCredito || [])]
                };
                
                set({ config: finalConfig });
                
                if (userId && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    if (config.contas) {
                        const syncContas = config.contas.map(c => ({ ...c, user_id: userId, org_id: activeOrgId }));
                        await supabase.from('contas').upsert(syncContas);
                    }
                    if (config.cartoesCredito) {
                        const syncCards = config.cartoesCredito.map(c => ({ ...c, user_id: userId, org_id: activeOrgId }));
                        await supabase.from('cartoes_credito').upsert(syncCards);
                    }
                    await supabase.from('config_global').upsert({
                        user_id: userId,
                        org_id: activeOrgId,
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
                    let lancsQuery = supabase.from('lancamentos').select('*');
                    let costsQuery = supabase.from('custos_fixos').select('*');
                    let accsQuery = supabase.from('contas').select('*');
                    let cardsQuery = supabase.from('cartoes_credito').select('*');
                    let globQuery = supabase.from('config_global').select('*');
                    let divsQuery = supabase.from('dividas').select('*');

                    const { activeOrgId } = get();
                    if (activeOrgId) {
                        lancsQuery = lancsQuery.eq('org_id', activeOrgId);
                        costsQuery = costsQuery.eq('org_id', activeOrgId);
                        accsQuery = accsQuery.eq('org_id', activeOrgId);
                        cardsQuery = cardsQuery.eq('org_id', activeOrgId);
                        globQuery = globQuery.eq('org_id', activeOrgId);
                        divsQuery = divsQuery.eq('org_id', activeOrgId);
                    } else {
                        lancsQuery = lancsQuery.eq('user_id', userId);
                        costsQuery = costsQuery.eq('user_id', userId);
                        accsQuery = accsQuery.eq('user_id', userId);
                        cardsQuery = cardsQuery.eq('user_id', userId);
                        globQuery = globQuery.eq('user_id', userId);
                        divsQuery = divsQuery.eq('user_id', userId);
                    }

                    const [
                        lancsRes,
                        costsRes,
                        accsRes,
                        cardsRes,
                        globRes,
                        divsRes
                    ] = await Promise.all([
                        lancsQuery,
                        costsQuery,
                        accsQuery,
                        cardsQuery,
                        globQuery,
                        divsQuery
                    ]);

                    // Proteção contra falhas no Supabase (ex: coluna org_id não existe)
                    if (lancsRes.error) console.error("Supabase sync erro (lancamentos):", lancsRes.error);
                    if (costsRes.error) console.error("Supabase sync erro (custos):", costsRes.error);
                    if (globRes.error) console.error("Supabase sync erro (config):", globRes.error);
                    if (divsRes.error) console.error("Supabase sync erro (dividas):", divsRes.error);

                    const { lancamentos: currL, dividas: currD, custosFixos: currC, config: currConf } = get();
                    
                    // Preservar dados de outras Organizações no LocalStorage
                    const keepLancs = currL.filter(l => activeOrgId ? l.orgId !== activeOrgId : (l.orgId && l.orgId !== null));
                    const keepCosts = currC.filter(c => activeOrgId ? c.orgId !== activeOrgId : (c.orgId && c.orgId !== null));
                    const keepDivs = currD.filter(d => activeOrgId ? d.orgId !== activeOrgId : (d.orgId && d.orgId !== null));
                    const keepContas = currConf.contas?.filter(c => activeOrgId ? c.orgId !== activeOrgId : (c.orgId && c.orgId !== null)) || [];
                    const keepCartoes = currConf.cartoesCredito?.filter(c => activeOrgId ? c.orgId !== activeOrgId : (c.orgId && c.orgId !== null)) || [];

                    let newConfig = { ...currConf };
                    
                    if (globRes.data && globRes.data.length > 0) {
                        const cloudConfig = globRes.data[0];
                        newConfig = {
                            ...newConfig,
                            categoriasReceita: cloudConfig.categorias_receita || newConfig.categoriasReceita,
                            categoriasDespesa: cloudConfig.categorias_despesa || newConfig.categoriasDespesa,
                            metodosPagamento: cloudConfig.metodos_pagamento || newConfig.metodosPagamento,
                            tags: cloudConfig.tags || newConfig.tags,
                        };
                    }
                    
                    if (!accsRes.error && accsRes.data) {
                        newConfig.contas = [...keepContas, ...accsRes.data];
                    }
                    if (!cardsRes.error && cardsRes.data) {
                        newConfig.cartoesCredito = [...keepCartoes, ...cardsRes.data];
                    }

                    set({
                        lancamentos: lancsRes.error ? currL : [...keepLancs, ...(lancsRes.data || [])],
                        custosFixos: costsRes.error ? currC : [...keepCosts, ...(costsRes.data || [])],
                        dividas: divsRes.error ? currD : [...keepDivs, ...(divsRes.data || [])],
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
                    if (l.banco === oldName) {
                        return { ...l, banco: newName };
                    }
                    return l;
                });
                return { lancamentos: newLancamentos };
            }),

            seedMockData: () => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const formatD = (day: number) => {
                    const d = new Date(year, month, day);
                    return d.toISOString().split('T')[0];
                };

                const oid = get().activeOrgId;

                const mockConfig: ConfigData = {
                    ...get().config,
                    contas: [
                        { id: generateId(), orgId: oid, nome: 'NuBank PF', saldoInicial: 5000, instituicao: 'NuBank', carteira: 'Conta PF', cor: '#8b5cf6', incluirSoma: true },
                        { id: generateId(), orgId: oid, nome: 'Itaú PJ', saldoInicial: 15000, instituicao: 'Itaú', carteira: 'Conta PJ', cor: '#f97316', incluirSoma: true }
                    ],
                    cartoesCredito: [
                        { id: generateId(), orgId: oid, nome: 'Inter Black', limite: 10000, diaVencimento: 10, diaFechamento: 3, cor: '#000000', instituicao: 'Banco Inter' },
                        { id: generateId(), orgId: oid, nome: 'Visa Platinum', limite: 5000, diaVencimento: 20, diaFechamento: 13, cor: '#3b82f6', instituicao: 'Bradesco' }
                    ]
                };

                const mockLancamentos: Lancamento[] = [
                    // Receitas
                    { id: generateId(), orgId: oid, data: formatD(5), descricao: 'Salário Mensal', valor: 8500, tipo: 'RECEITA', categoria: 'Salário', banco: 'NuBank PF', origem: 'PF', metodoPagamento: 'PIX' },
                    { id: generateId(), orgId: oid, data: formatD(10), descricao: 'Projeto Freelance', valor: 3200, tipo: 'RECEITA', categoria: 'Serviços', banco: 'Itaú PJ', origem: 'PJ', metodoPagamento: 'Transferência' },
                    
                    // Despesas Fixas
                    { id: generateId(), orgId: oid, data: formatD(1), descricao: 'Aluguel Apê', valor: 2800, tipo: 'DESPESA', categoria: 'Moradia', banco: 'NuBank PF', origem: 'PF', metodoPagamento: 'Boleto', custoFixoId: generateId() },
                    { id: generateId(), orgId: oid, data: formatD(5), descricao: 'Energia Elétrica', valor: 250, tipo: 'DESPESA', categoria: 'Energia', banco: 'NuBank PF', origem: 'PF', metodoPagamento: 'PIX', custoFixoId: generateId() },
                    
                    // Despesas Variáveis
                    { id: generateId(), orgId: oid, data: formatD(12), descricao: 'Jantar Restaurante', valor: 180, tipo: 'DESPESA', categoria: 'Lazer', banco: 'NuBank PF', origem: 'PF', metodoPagamento: 'PIX' },
                    { id: generateId(), orgId: oid, data: formatD(15), descricao: 'Mercado Semanal', valor: 450, tipo: 'DESPESA', categoria: 'Mercado', banco: 'NuBank PF', origem: 'PF', metodoPagamento: 'PIX' },
                    
                    // Lançamentos no Cartão
                    { id: generateId(), orgId: oid, data: formatD(8), descricao: 'Assinatura Netflix', valor: 55.90, tipo: 'DESPESA', categoria: 'Lazer', banco: 'Inter Black', origem: 'PF', metodoPagamento: 'Cartão de Crédito' },
                    { id: generateId(), orgId: oid, data: formatD(14), descricao: 'Combustível', valor: 220, tipo: 'DESPESA', categoria: 'Transporte', banco: 'Inter Black', origem: 'PF', metodoPagamento: 'Cartão de Crédito' },
                    { id: generateId(), orgId: oid, data: formatD(20), descricao: 'Compra Amazon', valor: 890, tipo: 'DESPESA', categoria: 'Outros', banco: 'Visa Platinum', origem: 'PF', metodoPagamento: 'Cartão de Crédito' }
                ];

                const existingLancamentos = get().lancamentos;
                
                set({
                    config: mockConfig,
                    lancamentos: [...existingLancamentos, ...mockLancamentos]
                });

                // Clear cloud sync to avoid polluting database during local tests
                // (Optional, user can sync later if they change VITE_SUPABASE_URL)
            },
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

// High-level hook to filter all state by the active organization without causing infinite renders
export const useActiveData = () => {
    const store = useStore(); // Inicia render tracking do zustand para TODO o store
    
    return useMemo(() => {
        const oId = store.activeOrgId;
        const isOwner = (item: any) => oId ? item.orgId === oId : (!item.orgId || item.orgId === null);
        
        return {
            ...store,
            lancamentos: (store.lancamentos || []).filter(isOwner),
            dividas: (store.dividas || []).filter(isOwner),
            custosFixos: (store.custosFixos || []).filter(isOwner),
            config: store.config ? {
                ...store.config,
                contas: store.config.contas?.filter(isOwner) || [],
                cartoesCredito: store.config.cartoesCredito?.filter(isOwner) || []
            } : store.config
        };
    }, [store]);
};
