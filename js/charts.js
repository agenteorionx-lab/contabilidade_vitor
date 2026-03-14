let cashchartInstance = null;
let expchartInstance = null;

function renderCharts(year) {
    const ctxCash = document.getElementById('cashflowChart');
    const ctxExp = document.getElementById('expensesChart');

    if (!ctxCash || !ctxExp) return;

    // Destroy prev instances if exist
    if (cashchartInstance) cashchartInstance.destroy();
    if (expchartInstance) expchartInstance.destroy();

    const fluxoData = store.getFluxoCaixaMensal(year);
    const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Gradient definitions
    const gradientGreen = ctxCash.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradientGreen.addColorStop(0, 'rgba(16, 185, 129, 0.5)'); // Accent green
    gradientGreen.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const gradientRed = ctxCash.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradientRed.addColorStop(0, 'rgba(239, 68, 68, 0.5)'); // Accent red
    gradientRed.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    // Common options for neat glassmorphism look
    Chart.defaults.color = "#94a3b8";
    Chart.defaults.font.family = "'Inter', sans-serif";

    cashchartInstance = new Chart(ctxCash, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: fluxoData.map(d => d.receita),
                    borderColor: '#10b981',
                    backgroundColor: gradientGreen,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4 // Curvas suaves
                },
                {
                    label: 'Despesas',
                    data: fluxoData.map(d => d.despesa),
                    borderColor: '#ef4444',
                    backgroundColor: gradientRed,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    beginAtZero: true
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // Expenses Chart
    // Fake data for expenses categories distribution
    expchartInstance = new Chart(ctxExp, {
        type: 'doughnut',
        data: {
            labels: ["Mercado", "Contas", "Impostos", "Lazer", "Outros"],
            datasets: [{
                data: [35, 25, 20, 15, 5],
                backgroundColor: [
                    '#3b82f6', // blue
                    '#8b5cf6', // purple
                    '#ef4444', // red
                    '#f59e0b', // yellow
                    '#10b981'  // green
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}
