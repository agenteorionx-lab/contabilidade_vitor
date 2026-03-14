export type TipoOrigin = "PF" | "PJ";
export type TipoTransacao = "RECEITA" | "DESPESA";
export type MetodoPagamento = "PIX" | "Cartão de Crédito" | "Dinheiro" | "Boleto" | "Transferência";
export type StatusInvestimento = "Ativo" | "Quitado";
export type StatusDivida = "Em Andamento" | "Quitada";

export interface DashboardEntity {
    id: string; // uuid
}

export interface Tag {
    id: string; // uuid
    nome: string;
    cor: string; // hex color
}

export interface ContaBancaria {
    id: string;
    nome: string;
    saldoInicial: number;
    instituicao: string; // ex: 'Nubank', 'Itaú'
    carteira: string;    // ex: 'Conta PF', 'Conta PJ'
    cor: string;         // hex color
    incluirSoma: boolean;
}

export interface CartaoCredito {
    id: string;
    nome: string;
    limite: number;
    diaVencimento: number;
    diaFechamento: number;
    cor: string;
    instituicao: string;
}

export interface Lancamento extends DashboardEntity {
    data: string; // YYYY-MM-DD
    tipo: TipoTransacao;
    categoria: string;
    origem: TipoOrigin;
    banco: string;
    metodoPagamento: string;
    valor: number;
    descricao: string;
    isParcela?: boolean;
    parcelaInfo?: string;
    dividaId?: string; // Vincula um pagamento a uma dívida
    custoFixoId?: string; // Vincula a um custo fixo para marcar como pago no mês
    tagsIds?: string[]; // Arrays de ids de tags
    ignorarNoDashboard?: boolean; // Flag para transferências/pagamentos de fatura que não afetam a DRE
    cartaoCreditado?: string; // Nome do cartão que teve a fatura paga para recalcular limite
    observacoes?: string;
}

export interface Investimento extends DashboardEntity {
    investidor: string;
    origem: TipoOrigin;
    valorRecebido: number;
    valorDevolver: number;
    dataInicio: string; // YYYY-MM-DD
    dataFim: string; // YYYY-MM-DD
    status: StatusInvestimento;
    observacoes?: string;
}

export interface AtivoBolsa extends DashboardEntity {
    ticker: string; // ex: RZAK11
    empresa: string;
    setor: string;
    quantia: number;
    valorPago: number; // Preço Médio pago por cota
    valorAtual: number; // Cotação atual no mercado
    rendiTrimes: number; // Dividendos recebidos
}

export interface Divida extends DashboardEntity {
    credor: string;
    origem: TipoOrigin;
    valorOriginal: number;
    dataInicio: string; // YYYY-MM-DD
    status: StatusDivida | 'Liquidada';
    observacoes?: string;
}

export interface ConfigData {
    categoriasReceita: string[];
    categoriasDespesa: string[];
    contas: ContaBancaria[]; // Substitui bancosPF e bancosPJ
    cartoesCredito: CartaoCredito[]; // Substitui cartoes (string)
    metodosPagamento: string[];
    tags: Tag[]; // Nova propriedade para armazenar tags globalmente
    // Legado para migração na store
    bancosPF?: string[];
    bancosPJ?: string[];
    cartoes?: string[];
}

export interface CustoFixo extends DashboardEntity {
    nome: string;
    valorEsperado: number;
    diaVencimento?: number; // Ex: 10, para vencer todo dia 10
    categoria: string;
}

export interface StoreState {
    lancamentos: Lancamento[];
    investimentos: Investimento[];
    ativosBolsa: AtivoBolsa[];
    dividas: Divida[];
    custosFixos: CustoFixo[];
    config: ConfigData;
    userId: string | null;
    setLancamentos: (l: Lancamento[]) => void;
    setInvestimentos: (i: Investimento[]) => void;
    setAtivosBolsa: (a: AtivoBolsa[]) => void;
    setDividas: (d: Divida[]) => void;
    setCustosFixos: (c: CustoFixo[]) => void;
    setConfig: (c: ConfigData) => void;

    // Ações globais (State Management)
    renameCategoriaGlobal: (oldName: string, newName: string, tipo: 'RECEITA' | 'DESPESA') => void;
    deleteCategoriaGlobal: (name: string, tipo: 'RECEITA' | 'DESPESA') => void;
    // Bancos e cartões agora serão geridos por CRUD direto de objetos na Store (via setConfig), mas 
    // precisamos de uma ação para cascatear o nome antigo pro nome novo em Lançamentos Históricos
    cascadeAgenciaGlobal: (oldName: string, newName: string) => void;

    // Cloud Sync (Supabase)
    setUserId: (userId: string | null) => void;
    initializeFromCloud: (userId: string) => Promise<void>;
    clearState: () => void;
}
