// Função formata moeda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Objeto App principal
const app = {
    init: function () {
        this.cacheDOM();
        this.bindEvents();
        this.renderDashboard();
        this.populatePixTable();
        this.populateConfig();
        this.populateSelects();
    },

    cacheDOM: function () {
        this.sidebar = document.querySelector(".sidebar");
        this.sidebarBtn = document.querySelector(".bx-menu");
        this.navLinks = document.querySelectorAll(".nav-links li a[data-target]");
        this.views = document.querySelectorAll(".view-section");
        this.pageTitle = document.getElementById("page-title");

        // Modal Pix
        this.formPix = document.getElementById("formPix");
        this.pixData = document.getElementById("pixData");
        this.pixTipo = document.getElementById("pixTipo");
        this.pixDesc = document.getElementById("pixDesc");
        this.pixConta = document.getElementById("pixConta");
        this.pixOrigem = document.getElementById("pixOrigem");
        this.pixValor = document.getElementById("pixValor");
    },

    bindEvents: function () {
        // Toggle Menu
        this.sidebarBtn.addEventListener("click", () => {
            this.sidebar.classList.toggle("close");
        });

        // Abas Menu Lateral
        this.navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const target = link.getAttribute("data-target");
                this.switchView(target, link);
            });
        });

        // Bind escape on modules
        window.onclick = (event) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(m => {
                if (event.target == m) {
                    m.style.display = 'none';
                }
            });
        }
    },

    switchView: function (targetId, activeLink) {
        // Remove Active Class
        this.navLinks.forEach(l => l.classList.remove("active"));
        activeLink.classList.add("active");

        // Hide all views, show targeted
        this.views.forEach(v => v.style.display = "none");
        document.getElementById("view-" + targetId).style.display = "block";

        // Update title
        this.pageTitle.innerText = activeLink.querySelector('.link_name').innerText;

        if (targetId === 'dashboard') {
            this.renderDashboard(); // re-render para animação
        }
    },

    openModal: function (id) {
        document.getElementById(id).style.display = "block";
    },

    closeModal: function (id) {
        document.getElementById(id).style.display = "none";
        if (id === 'modalPix') this.formPix.reset();
    },

    savePix: function (e) {
        e.preventDefault();
        const value = parseFloat(this.pixValor.value);
        if (isNaN(value) || value <= 0) {
            alert("Valor inválido");
            return;
        }

        const newPix = {
            data: this.pixData.value,
            tipo: this.pixTipo.value,
            desc: this.pixDesc.value,
            banco: this.pixConta.value,
            origem: this.pixOrigem.value,
            valor: value
        };

        store.addLancamento(newPix);
        this.populatePixTable();
        this.renderDashboard(); // Atualiza painel caso aba dashboard visível
        this.closeModal('modalPix');
    },

    populateSelects: function () {
        const d = store.getData();
        const config = d.config;

        // Conta mix PF e PJ para o select do modal de Lançamento
        this.pixConta.innerHTML = '';
        [...config.contasPF, ...config.contasPJ].forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.text = c;
            this.pixConta.appendChild(opt);
        });
    },

    populateConfig: function () {
        const d = store.getData();
        const conf = d.config;

        const renderList = (id, items) => {
            const ul = document.getElementById(id);
            if (!ul) return;
            ul.innerHTML = '';
            items.forEach(item => {
                const li = document.createElement('li');
                li.innerText = item;
                ul.appendChild(li);
            });
        };

        renderList('list-categories', conf.categoriasDespesa);
        renderList('list-contas-pf', conf.contasPF);
        renderList('list-contas-pj', conf.contasPJ);
        renderList('list-cartoes', conf.cartoes);
    },

    populatePixTable: function () {
        const tbody = document.querySelector("#table-pix tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        const lancamentos = store.getData().lancamentos;

        // Ordena mais recente primeiro
        lancamentos.sort((a, b) => new Date(b.data) - new Date(a.data));

        lancamentos.forEach(l => {
            const tr = document.createElement("tr");
            const valColorClass = l.tipo === 'RECEITA' ? 'text-green' : 'text-red';
            tr.innerHTML = `
                <td>${new Date(l.data).toLocaleDateString('pt-BR')}</td>
                <td><span class="badge ${valColorClass}">${l.tipo}</span></td>
                <td>${l.desc}</td>
                <td>${l.banco}</td>
                <td>${l.origem}</td>
                <td class="${valColorClass} font-weight-bold">${formatCurrency(l.valor)}</td>
                <td>
                    <button class="btn btn-sm btn-outline"><i class='bx bx-edit'></i></button>
                    <button class="btn btn-sm btn-outline text-red"><i class='bx bx-trash'></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderDashboard: function () {
        const hoje = new Date();
        const resumo = store.getResumoMensal(hoje.getFullYear(), hoje.getMonth() + 1);
        const invTotal = store.getTotalInvestido();

        document.getElementById('metric-receita').innerText = formatCurrency(resumo.receita);
        document.getElementById('metric-despesa').innerText = formatCurrency(resumo.despesa);
        document.getElementById('metric-investido').innerText = formatCurrency(invTotal);
        document.getElementById('metric-saldo').innerText = formatCurrency(resumo.saldo);

        // Força cor do saldo
        const elSaldo = document.getElementById('metric-saldo');
        if (resumo.saldo >= 0) {
            elSaldo.classList.replace('text-red', 'text-blue');
        } else {
            elSaldo.classList.replace('text-blue', 'text-red');
        }

        // Chama renderização de gráficos
        if (typeof renderCharts === 'function') {
            renderCharts(hoje.getFullYear());
        }
    }
};

// Inicializa quando dom carregar
document.addEventListener("DOMContentLoaded", () => {
    app.init();
});
