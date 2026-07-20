// ==========================================
// STATE MANAGEMENT
// ==========================================
let transactions = JSON.parse(localStorage.getItem('expenseTrackerData')) || [];
let expenseChartInstance = null;

// ==========================================
// DOM ELEMENTS
// ==========================================
const form = document.getElementById('transaction-form');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const editIdInput = document.getElementById('edit-id');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const formTitle = document.getElementById('form-title');
const transactionList = document.getElementById('transaction-list');
const emptyState = document.getElementById('empty-state');

// Summary Elements
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const currentBalanceEl = document.getElementById('current-balance');

// Filter Elements
const searchFilter = document.getElementById('search-filter');
const typeFilter = document.getElementById('type-filter');
const categoryFilter = document.getElementById('category-filter');
const dateStartFilter = document.getElementById('date-start-filter');
const dateEndFilter = document.getElementById('date-end-filter');

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    setupEventListeners();
    updateUI();
}

// ==========================================
// CORE LOGIC (Stage 1 & 5)
// ==========================================
function setupEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', resetForm);
    
    // Filter listeners (trigger on change/keyup)
    searchFilter.addEventListener('keyup', updateUI);
    typeFilter.addEventListener('change', updateUI);
    categoryFilter.addEventListener('change', updateUI);
    dateStartFilter.addEventListener('change', updateUI);
    dateEndFilter.addEventListener('change', updateUI);

    // Global Buttons
    document.getElementById('clear-all-btn').addEventListener('click', clearAllData);
    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV); // Extra feature
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateInputs()) return;

    const transaction = {
        id: editIdInput.value ? editIdInput.value : Date.now().toString(),
        title: titleInput.value.trim(),
        amount: parseFloat(amountInput.value),
        type: typeInput.value,
        category: categoryInput.value,
        date: dateInput.value
    };

    if (editIdInput.value) {
        // Edit existing
        transactions = transactions.map(t => t.id === transaction.id ? transaction : t);
    } else {
        // Add new
        transactions.push(transaction);
    }

    saveData();
    resetForm();
    updateUI();
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveData();
    updateUI();
}

function editTransaction(id) {
    const t = transactions.find(t => t.id === id);
    if (!t) return;

    // Populate form
    titleInput.value = t.title;
    amountInput.value = t.amount;
    typeInput.value = t.type;
    categoryInput.value = t.category;
    dateInput.value = t.date;
    editIdInput.value = t.id;

    // Update UI for editing state
    formTitle.innerText = 'Edit Transaction';
    submitBtn.innerText = 'Update Transaction';
    cancelEditBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    form.reset();
    editIdInput.value = '';
    formTitle.innerText = 'Add Transaction';
    submitBtn.innerText = 'Save Transaction';
    cancelEditBtn.classList.add('hidden');
    clearErrors();
}

function clearAllData() {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
        transactions = [];
        saveData();
        updateUI();
    }
}

function saveData() {
    localStorage.setItem('expenseTrackerData', JSON.stringify(transactions));
}

// ==========================================
// VALIDATION
// ==========================================
function validateInputs() {
    let isValid = true;
    clearErrors();

    if (titleInput.value.trim() === '') {
        showError('title-error', 'Please enter a title.');
        isValid = false;
    }
    
    const amountVal = parseFloat(amountInput.value);
    if (isNaN(amountVal) || amountVal <= 0) {
        showError('amount-error', 'Please enter an amount greater than 0.');
        isValid = false;
    }

    if (dateInput.value === '') {
        showError('date-error', 'Please select a date.');
        isValid = false;
    }

    return isValid;
}

function showError(elementId, message) {
    document.getElementById(elementId).innerText = message;
}

function clearErrors() {
    document.querySelectorAll('.error-msg').forEach(el => el.innerText = '');
}

// ==========================================
// UI UPDATES & FILTERING (Stage 2 & 3)
// ==========================================
function updateUI() {
    const filteredTransactions = getFilteredTransactions();
    
    // 1. Render List
    renderTransactionList(filteredTransactions);
    
    // 2. Update Live Summary (Stage 2)
    updateSummary(filteredTransactions);
    
    // 3. Update Chart (Stage 4)
    updateChart(filteredTransactions);
}

function getFilteredTransactions() {
    const searchTerm = searchFilter.value.toLowerCase();
    const type = typeFilter.value;
    const category = categoryFilter.value;
    const startDate = dateStartFilter.value;
    const endDate = dateEndFilter.value;

    return transactions
        .filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchTerm);
            const matchesType = type === 'all' || t.type === type;
            const matchesCategory = category === 'all' || t.category === category;
            
            let matchesDate = true;
            if (startDate) matchesDate = matchesDate && t.date >= startDate;
            if (endDate) matchesDate = matchesDate && t.date <= endDate;

            return matchesSearch && matchesType && matchesCategory && matchesDate;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first
}

function renderTransactionList(filteredTransactions) {
    transactionList.innerHTML = '';

    if (filteredTransactions.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filteredTransactions.forEach(t => {
            const li = document.createElement('li');
            li.classList.add('transaction-item');
            
            const sign = t.type === 'income' ? '+' : '-';
            const amountClass = t.type === 'income' ? 'success' : 'danger';
            
            li.innerHTML = `
                <div class="transaction-info">
                    <h4>${t.title}</h4>
                    <span class="transaction-meta">${t.date} | ${t.category}</span>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${sign}₹${t.amount.toFixed(2)}
                </div>
                <div class="transaction-actions">
                    <button class="btn secondary-btn small-btn" onclick="editTransaction('${t.id}')">Edit</button>
                    <button class="btn danger-btn small-btn" onclick="deleteTransaction('${t.id}')">Delete</button>
                </div>
            `;
            transactionList.appendChild(li);
        });
    }
}

function updateSummary(filteredTransactions) {
    const income = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const expense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const balance = income - expense;

    // FIX HERE:
    totalIncomeEl.innerText = `₹${income.toFixed(2)}`;
    totalExpenseEl.innerText = `₹${expense.toFixed(2)}`;
    currentBalanceEl.innerText = `₹${balance.toFixed(2)}`;

    // Red color for negative balance
    if (balance < 0) {
        currentBalanceEl.classList.add('danger');
        currentBalanceEl.classList.remove('success');
    } else if (balance > 0) {
        currentBalanceEl.classList.add('success');
        currentBalanceEl.classList.remove('danger');
    } else {
        currentBalanceEl.classList.remove('success', 'danger');
    }
}

// ==========================================
// VISUAL BREAKDOWN (Stage 4)
// ==========================================
function updateChart(filteredTransactions) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    // Group only expenses by category for a meaningful spending chart
    const expensesByCategory = {};
    filteredTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);

    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    if (labels.length === 0) {
        // Render empty chart if no expenses
        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#e1e8ed'] }] },
            options: { responsive: true, plugins: { tooltip: { enabled: false } } }
        });
        return;
    }

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// ==========================================
// EXTRA FEATURE: Export to CSV (Ground Rules)
// ==========================================
function exportToCSV() {
    if (transactions.length === 0) {
        alert("No data to export!");
        return;
    }
    
    const headers = ["ID", "Title", "Amount", "Type", "Category", "Date"];
    const rows = transactions.map(t => 
        [t.id, "${t.title}", t.amount, t.type, t.category, t.date].join(",")
    );
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expense_tracker_backup.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
}

// Boot up the app
init();