// Dados Iniciais Baseados no Excel para popular a dashboard

const defaultData = {
    config: {
        categoriasReceita: ["Salário", "Serviços", "Mercado", "Investimento", "Venda"],
        categoriasDespesa: ["Mercado", "Contas", "Uber", "Casa", "Lazer", "Impostos"],
        contasPF: ["Conta Principal PF", "Conta Secundária PF", "Nubank", "Banco Inter"],
        contasPJ: ["Conta Principal PJ", "Conta Impostos PJ", "Cora", "Inter PJ"],
        cartoes: ["Nubank", "Nu Empresa", "PicPay", "XP"]
    },
    lancamentos: [
        // Dummy data to show on charts
        { id: 1, data: "2026-01-05", tipo: "RECEITA", desc: "Pagamento Cliente A", banco: "Conta Principal PJ", origem: "PJ", valor: 5500.00 },
        { id: 2, data: "2026-01-10", tipo: "DESPESA", desc: "Mercado Assaí", banco: "Conta Principal PF", origem: "PF", valor: 850.50 },
        { id: 3, data: "2026-01-12", tipo: "DESPESA", desc: "Energia", banco: "Conta Secundária PF", origem: "PF", valor: 230.00 },
        { id: 4, data: "2026-02-05", tipo: "RECEITA", desc: "Salário", banco: "Conta Principal PF", origem: "PF", valor: 8000.00 },
        { id: 5, data: "2026-02-15", tipo: "DESPESA", desc: "Contador", banco: "Conta Impostos PJ", origem: "PJ", valor: 350.00 }
    ],
    investimentos: [
        { id: 1, investidor: "Luiz", origem: "Conta Principal PF", valorRecebido: 2000.00, valorDevolver: 2180.00, inicio: "2025-10-30", final: "2026-04-30", status: "Ativo" },
        { id: 2, investidor: "Isabela", origem: "Conta Principal PJ", valorRecebido: 25073.85, valorDevolver: 26202.18, inicio: "2026-01-25", final: "2026-04-25", status: "Ativo" }
    ]
};

const store = {
    init: function () {
        if (!localStorage.getItem('financeiroPro_data')) {
            localStorage.setItem('financeiroPro_data', JSON.stringify(defaultData));
        }
    },

    getData: function () {
        return JSON.parse(localStorage.getItem('financeiroPro_data'));
    },

    saveData: function (data) {
        localStorage.setItem('financeiroPro_data', JSON.stringify(data));
    },

    addLancamento: function (lancamento) {
        const data = this.getData();
        lancamento.id = Date.now();
        data.lancamentos.push(lancamento);
        this.saveData(data);
    },

    // Métodos para Dashboard
    getResumoMensal: function (ano, mes) {
        const data = this.getData();
        let totalReceita = 0;
        let totalDespesa = 0;

        data.lancamentos.forEach(l => {
            const dt = new Date(l.data);
            if (dt.getFullYear() === ano && dt.getMonth() + 1 === mes) {
                if (l.tipo === "RECEITA") totalReceita += l.valor;
                if (l.tipo === "DESPESA") totalDespesa += l.valor;
            }
        });

        return { receita: totalReceita, despesa: totalDespesa, saldo: totalReceita - totalDespesa };
    },

    getTotalInvestido: function () {
        const data = this.getData();
        return data.investimentos.reduce((acc, curr) => acc + curr.valorRecebido, 0);
    },

    getFluxoCaixaMensal: function (ano) {
        // Retorna array de 12 meses [jan, fev...] com receitas e despesas
        const res = [];
        const data = this.getData();

        for (let i = 1; i <= 12; i++) {
            let r = 0, d = 0;
            data.lancamentos.forEach(l => {
                const dt = new Date(l.data);
                if (dt.getFullYear() === ano && dt.getMonth() + 1 === i) {
                    if (l.tipo === "RECEITA") r += l.valor;
                    if (l.tipo === "DESPESA") d += l.valor;
                }
            });
            res.push({ mes: i, receita: r, despesa: d });
        }
        return res;
    }
};

store.init();
