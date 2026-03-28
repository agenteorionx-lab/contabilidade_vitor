import type { Lancamento, TipoOrigin } from '../types';
import { parseISO, getMonth, getYear, isBefore, endOfMonth } from 'date-fns';

/**
 * Filter transactions by Month, Year, and Origin (PF/PJ)
 */
export const getMonthlyCashFlow = (
    lancamentos: Lancamento[],
    year: number,
    month: number, // 0-indexed (0 = Jan)
    origin?: TipoOrigin
) => {
    let receita = 0;
    let despesa = 0;
    let despesaFixa = 0;
    let despesaVariavel = 0;

    (lancamentos || []).forEach(l => {
        if (l.ignorarNoDashboard) return;

        const date = parseISO(l.data);
        if (getYear(date) === year && getMonth(date) === month) {
            if (!origin || l.origem === origin) {
                if (l.tipo === 'RECEITA') receita += l.valor;
                if (l.tipo === 'DESPESA') {
                    despesa += l.valor;
                    if (l.custoFixoId) despesaFixa += l.valor;
                    else despesaVariavel += l.valor;
                }
            }
        }
    });

    return { receita, despesa, despesaFixa, despesaVariavel, saldo: receita - despesa };
};

/**
 * Accumulated Balance: Sum of all transactions up to the end of a specific month/year
 */
export const getAccumulatedBalance = (
    lancamentos: Lancamento[],
    year: number,
    month: number,
    origin?: TipoOrigin
) => {
    const targetDate = endOfMonth(new Date(year, month));
    let acumulado = 0;

    (lancamentos || []).forEach(l => {
        if (l.ignorarNoDashboard) return;

        const date = parseISO(l.data);
        if (isBefore(date, targetDate) || date.getTime() === targetDate.getTime()) {
            if (!origin || l.origem === origin) {
                if (l.tipo === 'RECEITA') acumulado += l.valor;
                if (l.tipo === 'DESPESA') acumulado -= l.valor;
            }
        }
    });

    return acumulado;
};


/**
 * Totals for Dashboard
 */
export const getDashboardTotals = (
    lancamentos: Lancamento[],
    year: number,
    month: number,
    origin?: TipoOrigin
) => {
    const { receita, despesa, despesaFixa, despesaVariavel, saldo } = getMonthlyCashFlow(lancamentos, year, month, origin);
    const caixaAcumulado = getAccumulatedBalance(lancamentos, year, month, origin);

    return {
        receita,
        despesa,
        despesaFixa,
        despesaVariavel,
        saldo,
        caixaAcumulado
    };
};

/**
 * Aggregates monthly and quarterly data for a specific year.
 */
export const getAnnualSummary = (
    lancamentos: Lancamento[],
    year: number,
    origin?: TipoOrigin
) => {
    const monthlyData = [];
    let totalReceita = 0;
    let totalDespesa = 0;

    // Calculate Monthly Data
    for (let i = 0; i < 12; i++) {
        const { receita, despesa, saldo } = getMonthlyCashFlow(lancamentos, year, i, origin);
        const caixa = getAccumulatedBalance(lancamentos, year, i, origin);

        monthlyData.push({
            monthIndex: i,
            receita,
            despesa,
            lucro: saldo,
            caixa
        });

        totalReceita += receita;
        totalDespesa += despesa;
    }

    // Calculate Quarterly Data
    const quarterlyData = [];
    for (let q = 0; q < 4; q++) {
        const months = monthlyData.slice(q * 3, (q + 1) * 3);
        const receita = months.reduce((acc, m) => acc + m.receita, 0);
        const despesa = months.reduce((acc, m) => acc + m.despesa, 0);
        const lucro = receita - despesa;
        // Caixa at the end of the quarter
        const caixa = months[2].caixa;

        quarterlyData.push({
            name: `${q + 1}º TRI`,
            receita,
            despesa,
            lucro,
            caixa
        });
    }

    const totalLucro = totalReceita - totalDespesa;
    const finalCaixa = monthlyData[11].caixa;
    // Health metric (example: profit margin or just a placeholder 0.0 as in the image)
    const health = totalReceita > 0 ? (totalLucro / totalReceita) * 10 : 0;

    return {
        monthlyData,
        quarterlyData,
        totals: {
            receita: totalReceita,
            despesa: totalDespesa,
            lucro: totalLucro,
            caixa: finalCaixa,
            health: health.toFixed(1)
        }
    };
};

/**
 * Breakdown of expenses by category for a specific month
 */
export const getCategoryBreakdown = (
    lancamentos: Lancamento[],
    year: number,
    month: number,
    origin?: TipoOrigin
) => {
    const breakdown: Record<string, number> = {};
    (lancamentos || []).forEach(l => {
        if (l.tipo !== 'DESPESA' || l.ignorarNoDashboard) return;
        
        const date = parseISO(l.data);
        if (getYear(date) === year && getMonth(date) === month) {
            if (!origin || l.origem === origin) {
                breakdown[l.categoria] = (breakdown[l.categoria] || 0) + l.valor;
            }
        }
    });

    return Object.entries(breakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
};
