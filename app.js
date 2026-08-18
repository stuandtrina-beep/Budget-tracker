// ==========================================
// 1. APPLICATION STATE & LOCAL STORAGE
// ==========================================
const STORAGE_KEY = 'BUDGET_PORTFOLIO_APP_STATE_V1';

let appState = {
    settings: { darkMode: false, baseCurrency: 'GBP', finnhubApiKey: '' },
    accounts: [
        { id: 'acc_1', name: 'Main Bank', type: 'bank', balance: 0 },
        { id: 'acc_2', name: 'ISA Portfolio', type: 'investment', balance: 0 }
    ],
    categories: [
        { id: 'cat_1', name: 'Groceries', type: 'expense' },
        { id: 'cat_2', name: 'Salary', type: 'income' }
    ],
    transactions: [],
    holdings: [],
    budget: { period: 'monthly', limit: 1000, categoryLimits: {} }
};

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            appState = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load state from localStorage, using defaults.', e);
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
        console.error('Failed to save state to localStorage.', e);
    }
}

// ==========================================
// 2. SAFE UI RENDERING & NAVIGATION
// ==========================================
function initApp() {
    try {
        loadState();
        setupNavigation();
        setupCsvUpload();
        renderDashboard();
        console.log('App initialized successfully.');
    } catch (e) {
        console.error('Error during app initialization:', e);
    }
}

function setupNavigation() {
    const navButtons = document.querySelectorAll('[data-target-view]');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetView = e.currentTarget.getAttribute('data-target-view');
            switchView(targetView);
        });
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });
    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = 'block';
    } else {
        console.warn(`Target view not found: ${viewId}`);
    }
}

// ==========================================
// 3. WORKING CSV UPLOAD & PARSER
// ==========================================
function setupCsvUpload() {
    const fileInput = document.getElementById('csvFileInput');
    const dropZone = document.getElementById('csvDropZone');

    if (!fileInput) return;

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            processCsvFile(file);
        }
    });

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processCsvFile(e.dataTransfer.files[0]);
            }
        });
    }
}

function processCsvFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            parseCsvData(text);
        } catch (err) {
            console.error('Error parsing CSV file content:', err);
            alert('Could not parse the CSV file. Please check the file format.');
        }
    };

    reader.onerror = function() {
        console.error('Failed to read file.');
        alert('Error reading file.');
    };

    reader.readAsText(file);
}

function parseCsvData(csvText) {
    const lines = csvText.split(/\r\n|\n/);
    if (lines.length === 0) return;

    // Basic CSV Line Parser handling quotes and commas
    const parsedRows = lines.map(line => {
        const row = [];
        let insideQuote = false;
        let entry = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
                row.push(entry.trim());
                entry = '';
            } else {
                entry += char;
            }
        }
        row.push(entry.trim());
        return row;
    }).filter(row => row.length > 1 || row[0] !== '');

    if (parsedRows.length > 1) {
        const headers = parsedRows[0].map(h => h.toLowerCase());
        const dataRows = parsedRows.slice(1);
        
        console.log('Parsed Headers:', headers);
        console.log(`Successfully parsed ${dataRows.length} rows.`);
        
        // Import holdings or transactions based on detected headers
        importHoldingsFromCsv(headers, dataRows);
    } else {
        alert('The CSV file appears to be empty or formatted incorrectly.');
    }
}

function importHoldingsFromCsv(headers, rows) {
    // Example mapping logic for brokerage exports (like Interactive Investor)
    const symbolIdx = headers.findIndex(h => h.includes('symbol') || h.includes('ticker') | h.includes('code'));
    const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('shares') || h.includes('holding'));
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('description') || h.includes('security'));

    let importedCount = 0;

    rows.forEach(row => {
        const name = nameIdx > -1 ? row[nameIdx] : 'Unknown Asset';
        const symbol = symbolIdx > -1 ? row[symbolIdx] : 'UNKNOWN';
        const quantity = qtyIdx > -1 ? parseFloat(row[qtyIdx]) || 0 : 0;

        if (symbol && quantity > 0) {
            appState.holdings.push({
                id: 'hold_' + Math.random().toString(36.substring(2, 9)),
                name,
                symbol,
                quantity,
                costBasis: 0,
                currentPrice: 0
            });
            importedCount++;
        }
    });

    saveState();
    renderDashboard();
    alert(`Successfully imported ${importedCount} items into your portfolio!`);
}

// ==========================================
// 4. RENDERING & UI UPDATES
// ==========================================
function renderDashboard() {
    const portfolioCountEl = document.getElementById('portfolioCount');
    if (portfolioCountEl) {
        portfolioCountEl.textContent = appState.holdings.length;
    }
}

// Run init when DOM is fully loaded to prevent un-clickable UI bugs
document.addEventListener('DOMContentLoaded', initApp);
