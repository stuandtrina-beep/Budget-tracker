const STORAGE_KEY = 'budgetPortfolioTracker_v1';

const DEFAULT_ACCOUNTS = [
  { id: 'acc_checking', name: 'Checking', currency: 'GBP', type: 'bank' },
  { id: 'acc_isa', name: 'ISA', currency: 'GBP', type: 'isa' },
  { id: 'acc_sipp', name: 'SIPP', currency: 'GBP', type: 'sipp' },
  { id: 'acc_gia', name: 'GIA', currency: 'GBP', type: 'gia' },
];

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse data', e);
    }
  }
  return {
    accounts: DEFAULT_ACCOUNTS,
    categories: [],
    transactions: [],
    budgets: [],
    holdings: [],
    exchangeRates: { GBP: 1, USD: 1.27 },
    settings: {
      baseCurrency: 'GBP',
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      finnhubApiKey: 'da1uu49r01qp0a25u5q0da1uu49r01qp0a25u5qg'
    }
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadData();
if (state.settings.darkMode) document.body.classList.add('dark');

function formatMoney(amount, currency = state.settings.baseCurrency) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function convertToBase(amount, fromCurrency) {
  if (fromCurrency === state.settings.baseCurrency) return amount;
  const rates = state.exchangeRates;
  return (amount / (rates[fromCurrency] || 1)) * (rates[state.settings.baseCurrency] || 1);
}

async function fetchStockPrice(symbol) {
  if (!symbol) return null;
  const apiKey = state.settings.finnhubApiKey || 'da1uu49r01qp0a25u5q0da1uu49r01qp0a25u5qg';
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol.trim())}&token=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data && typeof data.c === 'number' && data.c > 0) ? data.c : null;
  } catch (e) {
    console.error('Finnhub error:', e);
    return null;
  }
}

const content = document.getElementById('content');
const modalOverlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');

function closeModal() {
  modalOverlay.classList.add('hidden');
  modal.innerHTML = '';
}

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPage(btn.dataset.page);
  });
});

function renderPage(page) {
  if (page === 'portfolio') renderPortfolio();
  else renderDashboard();
}

async function refreshHoldingPrice(id) {
  const h = state.holdings.find(x => x.id === id);
  if (!h || !h.symbol) {
    alert('No ticker symbol assigned.');
    return;
  }
  const priceBtn = document.getElementById(`refresh-btn-${id}`);
  if (priceBtn) priceBtn.textContent = '...';
  
  const livePrice = await fetchStockPrice(h.symbol);
  if (livePrice && livePrice > 0) {
    h.currentPrice = livePrice;
    saveData();
    renderPortfolio();
  } else {
    alert('Could not fetch price from Finnhub. Check the symbol.');
    if (priceBtn) priceBtn.textContent = '↻';
  }
}

async function refreshAllHoldingPrices() {
  let count = 0;
  for (const h of state.holdings) {
    if (h.symbol) {
      const livePrice = await fetchStockPrice(h.symbol);
      if (livePrice && livePrice > 0) {
        h.currentPrice = livePrice;
        count++;
      }
    }
  }
  saveData();
  renderPortfolio();
  alert(`Updated prices for ${count} holdings.`);
}

function renderPortfolio() {
  let totalValue = 0, totalCost = 0;
  const holdingsData = state.holdings.map(h => {
    const valBase = convertToBase(h.quantity * h.currentPrice, h.currency);
    const costBase = convertToBase(h.quantity * h.costBasis, h.currency);
    const gainBase = valBase - costBase;
    const gainPct = costBase > 0 ? (gainBase / costBase) * 100 : 0;
    const acc = state.accounts.find(a => a.id === h.accountId);
    totalValue += valBase;
    totalCost += costBase;
    return { ...h, valueBase: valBase, costBase: costBase, gainBase, gainPct, accountName: acc?.name || 'Account' };
  });

  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  content.innerHTML = `
    <div class="page-header">
      <h1>Portfolio</h1>
      <div class="flex gap-2">
        <button class="btn btn-sm btn-secondary" onclick="refreshAllHoldingPrices()">↻ Prices</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Total Value</div>
      <div class="card-value">${formatMoney(totalValue)}</div>
      <div class="text-sm mt-2" style="color: ${totalGain >= 0 ? 'var(--success)' : 'var(--danger)'}">
        Cost: ${formatMoney(totalCost)} · ${totalGain >= 0 ? '+' : ''}${formatMoney(totalGain)} (${totalGainPct.toFixed(1)}%)
      </div>
    </div>
    <div class="card">
      ${holdingsData.map(h => `
        <div class="list-item">
          <div class="list-item-main">
            <div class="list-item-title">${h.name} ${h.symbol ? `<span class="badge">${h.symbol}</span>` : ''}</div>
            <div class="list-item-sub">${h.quantity} @ ${formatMoney(h.currentPrice, h.currency)}</div>
          </div>
          <div class="flex items-center gap-2">
            <div style="text-align:right">
              <div style="font-weight:700">${formatMoney(h.valueBase)}</div>
              <div class="text-xs" style="color: ${h.gainBase >= 0 ? 'var(--success)' : 'var(--danger)'}">${h.gainBase >= 0 ? '+' : ''}${h.gainPct.toFixed(1)}%</div>
            </div>
            ${h.symbol ? `<button id="refresh-btn-${h.id}" class="btn btn-sm btn-secondary" onclick="refreshHoldingPrice('${h.id}')">↻</button>` : ''}
          </div>
        </div>
      `).join('')}
      ${!holdingsData.length ? '<div class="empty-state">No holdings added yet.</div>' : ''}
    </div>
  `;
}

function renderDashboard() {
  content.innerHTML = `<div class="page-header"><h1>Dashboard</h1></div><div class="card"><p>Welcome to your Budget & Portfolio Tracker. Tap Portfolio to manage holdings and update prices.</p></div>`;
}

window.refreshHoldingPrice = refreshHoldingPrice;
window.refreshAllHoldingPrices = refreshAllHoldingPrices;

renderPortfolio();
