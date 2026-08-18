document.addEventListener('DOMContentLoaded', () => {
    // State management
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];

    // Tab Navigation Logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(button.dataset.target).classList.add('active');
        });
    });

    // DOM Elements
    const transactionForm = document.getElementById('transaction-form');
    const transactionList = document.getElementById('transaction-list');
    const portfolioForm = document.getElementById('portfolio-form');
    const portfolioList = document.getElementById('portfolio-list');

    const totalBalanceEl = document.getElementById('total-balance');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const portfolioValueEl = document.getElementById('portfolio-value');

    // Initialize UI
    function init() {
        renderTransactions();
        renderPortfolio();
        updateMetrics();
    }

    // Transactions Handlers
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = document.getElementById('desc').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;

        const newTx = {
            id: Date.now(),
            desc,
            amount,
            type
        };

        transactions.push(newTx);
        saveAndRefresh();
        transactionForm.reset();
    });

    window.deleteTransaction = function(id) {
        transactions = transactions.filter(tx => tx.id !== id);
        saveAndRefresh();
    };

    function renderTransactions() {
        transactionList.innerHTML = '';
        if (transactions.length === 0) {
            transactionList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">No transactions recorded yet.</td></tr>`;
            return;
        }

        transactions.forEach(tx => {
            const isIncome = tx.type === 'income';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHTML(tx.desc)}</td>
                <td>
                    <strong>${isIncome ? '+' : '-'}£${tx.amount.toFixed(2)}</strong> 
                    <span style="font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; background: ${isIncome ? '#dcfce7; color: #166534;' : '#fee2e2; color: #991b1b;}; margin-left: 6px;">
                        ${isIncome ? 'INCOME' : 'EXPENSE'}
                    </span>
                </td>
                <td style="text-transform: capitalize;">${tx.type}</td>
                <td><button class="delete-btn" onclick="deleteTransaction(${tx.id})">Delete</button></td>
            `;
            transactionList.appendChild(tr);
        });
    }

    // Portfolio Handlers
    portfolioForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('asset-name').value;
        const shares = parseFloat(document.getElementById('asset-shares').value);
        const price = parseFloat(document.getElementById('asset-price').value);

        const newAsset = {
            id: Date.now(),
            name,
            shares,
            price
        };

        portfolio.push(newAsset);
        saveAndRefresh();
        portfolioForm.reset();
    });

    window.deleteAsset = function(id) {
        portfolio = portfolio.filter(item => item.id !== id);
        saveAndRefresh();
    };

    function renderPortfolio() {
        portfolioList.innerHTML = '';
        if (portfolio.length === 0) {
            portfolioList.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b;">No portfolio assets added yet.</td></tr>`;
            return;
        }

        portfolio.forEach(item => {
            const totalVal = item.shares * item.price;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHTML(item.name)}</td>
                <td>${item.shares}</td>
                <td>£${item.price.toFixed(2)}</td>
                <td><strong>£${totalVal.toFixed(2)}</strong></td>
                <td><button class="delete-btn" onclick="deleteAsset(${item.id})">Delete</button></td>
            `;
            portfolioList.appendChild(tr);
        });
    }

    // Calculations & Metrics
    function updateMetrics() {
        let income = 0;
        let expenses = 0;

        transactions.forEach(tx => {
            if (tx.type === 'income') income += tx.amount;
            else expenses += tx.amount;
        });

        const balance = income - expenses;
        const portfolioTotal = portfolio.reduce((acc, item) => acc + (item.shares * item.price), 0);

        totalBalanceEl.textContent = `£${balance.toFixed(2)}`;
        totalIncomeEl.textContent = `£${income.toFixed(2)}`;
        totalExpensesEl.textContent = `£${expenses.toFixed(2)}`;
        portfolioValueEl.textContent = `£${portfolioTotal.toFixed(2)}`;
    }

    function saveAndRefresh() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
        renderTransactions();
        renderPortfolio();
        updateMetrics();
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    init();
});
