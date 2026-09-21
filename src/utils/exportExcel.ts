import * as XLSX from 'xlsx';
import type { SimulationResponse } from '~/types/simulation';

export function exportResultsToExcel(results: SimulationResponse, projectName?: string) {
  const wb = XLSX.utils.book_new();
  const curr = results.currency?.symbol ?? '';

  addSummarySheet(wb, results, curr);
  addCompareSheet(wb, results, curr);
  addSkuTableSheet(wb, results, curr);
  addCalendarSheet(wb, results);
  addTierActionsSheet(wb, results, curr);

  const timestamp = new Date().toISOString().slice(0, 10);
  const prefix = projectName ? projectName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'PromoSim';
  XLSX.writeFile(wb, `${prefix}_Results_${timestamp}.xlsx`);
}

function addSummarySheet(wb: XLSX.WorkBook, r: SimulationResponse, curr: string) {
  const rows = [
    ['Promo Simulator — Optimized Results Summary'],
    [],
    ['Metric', 'Value'],
    ['Objective', r.objective],
    ['Currency', `${curr} (${r.currency?.code ?? ''})`],
    [],
    ['— Hero Metrics —'],
    ['Headline', r.hero.value],
    ['Label', r.hero.label],
    ['Delta', r.hero.delta],
    ['Verdict', r.hero.verdict],
    ['Confidence', r.hero.confidence],
    ['Budget Used', r.hero.budget_used],
    ['Budget Detail', r.hero.budget_sub],
    ['Margin', stripHtml(r.hero.margin_html)],
    [],
    ['— ROI —'],
    ['Optimal ROI', r.roi.optimal],
    ['Actual ROI', r.roi.actual],
    ...Object.entries(r.roi.per_quarter ?? {}).map(([q, v]) => [`ROI ${q}`, v]),
    [],
    ['— Why This Recommendation —'],
    ...r.why_reasons.map((w) => [`#${w.num} ${w.tag}`, `${w.title}: ${w.body}`]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
}

function addCompareSheet(wb: XLSX.WorkBook, r: SimulationResponse, curr: string) {
  const c = r.compare;
  const metrics = ['turnover', 'profit', 'margin', 'qty', 'promo_weeks', 'promo_spend'] as const;
  const labels: Record<string, string> = {
    turnover: `Turnover (${curr})`,
    profit: `Profit (${curr})`,
    margin: 'Margin (%)',
    qty: 'Volume (units)',
    promo_weeks: 'Promo Weeks',
    promo_spend: `Promo Spend (${curr})`,
  };

  const header = ['Metric', 'Baseline'];
  if (c.historical) header.push(`Historical (${c.historical.year})`);
  header.push('Recommended');

  const rows: (string | number)[][] = [header];
  for (const m of metrics) {
    const row: (string | number)[] = [labels[m], c.current[m]];
    if (c.historical) row.push(c.historical[m]);
    row.push(c.recommended[m]);
    rows.push(row);
  }

  if (c.recommended.effective_turnover != null) {
    const row: (string | number)[] = [`Effective Turnover (${curr})`, ''];
    if (c.historical) row.push('');
    row.push(c.recommended.effective_turnover);
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Comparison');
}

function addSkuTableSheet(wb: XLSX.WorkBook, r: SimulationResponse, curr: string) {
  const header = [
    'SKU',
    `Base Profit (${curr})`,
    `Actual Profit (${curr})`,
    `Optimal Profit (${curr})`,
    `Gain vs Actual (${curr})`,
    `Actual Spend (${curr})`,
    `Optimal Spend (${curr})`,
    'Confidence',
    'Promo ROI (Optimal)',
    'Promo ROI (Actual)',
  ];

  const rows = r.deep_dive.sku_table.map((s) => [
    s.sku,
    s.base_profit,
    s.act_profit,
    s.opt_profit,
    s.gain,
    s.act_promo_spend,
    s.promo_spend,
    s.confidence,
    s.roi,
    s.act_roi,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 20 },
    ...Array<XLSX.ColInfo>(9).fill({ wch: 16 }),
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'SKU Table');
}

function addCalendarSheet(wb: XLSX.WorkBook, r: SimulationResponse) {
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  const skus = Object.keys(r.timeline);

  const codeLabels: Record<number, string> = {
    0: '',
    1: 'Add',
    2: 'Deepen',
    3: 'Soften',
    4: 'Remove',
  };

  const rows: (string | number)[][] = [];

  rows.push(['Optimised Discount (%)']);
  rows.push(['SKU', ...weeks.map((w) => `W${w}`)]);
  for (const sku of skus) {
    rows.push([sku, ...r.timeline[sku].opt_disc]);
  }

  rows.push([]);
  rows.push(['Historical Discount (%)']);
  rows.push(['SKU', ...weeks.map((w) => `W${w}`)]);
  for (const sku of skus) {
    rows.push([sku, ...r.timeline[sku].act_disc]);
  }

  rows.push([]);
  rows.push(['Comparison Codes (0=No change, 1=Add, 2=Deepen, 3=Soften, 4=Remove)']);
  rows.push(['SKU', ...weeks.map((w) => `W${w}`)]);
  for (const sku of skus) {
    rows.push([sku, ...r.timeline[sku].codes.map((c) => codeLabels[c] ?? c)]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 20 }, ...Array<XLSX.ColInfo>(52).fill({ wch: 5 })];
  XLSX.utils.book_append_sheet(wb, ws, 'Calendar');
}

function addTierActionsSheet(wb: XLSX.WorkBook, r: SimulationResponse, curr: string) {
  const header = ['Tier', 'SKU', 'Week', 'Weeks', 'Discount', 'Action', `Impact (${curr})`, 'Type'];
  const rows: (string | number)[][] = [header];

  const tiers = [
    { label: 'Definitely Do', bucket: r.tiers.definitely_do },
    { label: 'Worth Considering', bucket: r.tiers.worth_considering },
    { label: 'Minor Impact', bucket: r.tiers.minor_impact },
  ];

  for (const { label, bucket } of tiers) {
    for (const a of bucket.actions) {
      rows.push([label, a.sku, a.week, a.weeks_label, a.discount_text, a.action_text, a.impact, a.action_type]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 20 }, { wch: 6 }, { wch: 10 },
    { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Tier Actions');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
