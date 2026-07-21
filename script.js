let transactions = JSON.parse(localStorage.getItem('expenseTrackerData')) || [];
let expenseChartInstance = null;

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

const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const currentBalanceEl = document.getElementById('current-balance');

const searchFilter = document.getElementById('search-filter');
const typeFilter = document.getElementById('type-filter');
const categoryFilter = document.getElementById('category-filter');
const dateStartFilter = document.getElementById('date-start-filter');
const dateEndFilter = document.getElementById('date-end-filter');

function init() {
    setupEventListeners();
    updateUI();
}

function setupEventListeners() {
    form.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', resetForm);
    
    // Unified Event Delegation on transaction list
    transactionList.addEventListener('click', handleListAction);

    // Filters
    searchFilter.addEventListener('input', updateUI);
    typeFilter.addEventListener('change', updateUI);
    categoryFilter.addEventListener('change', updateUI);
    dateStartFilter.addEventListener('change', updateUI);
    dateEndFilter.addEventListener('change', updateUI);

    document.getElementById('clear-all-btn').addEventListener('click', clearAllData);
    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
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
        transactions = transactions.map(t => t.id === transaction.id ? transaction : t);
    } else {
        transactions.push(transaction);
    }

    saveData();
    resetForm();
    updateUI();
}

function handleListAction(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'edit') {
        editTransaction(id);
    } else if (action === 'delete') {
        deleteTransaction(id);
    }
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveData();
    updateUI();
}

function editTransaction(id) {
    const t = transactions.find(t => t.id === id);
    if (!t) return;

    titleInput.value = t.title;
    amountInput.value = t.amount;
    typeInput.value = t.type;
    categoryInput.value = t.category;
    dateInput.value = t.date;
    editIdInput.value = t.id;

    formTitle.textContent = 'Edit Transaction';
    submitBtn.textContent = 'Update Transaction';
    cancelEditBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    form.reset();
    editIdInput.value = '';
    formTitle.textContent = 'Add Transaction';
    submitBtn.textContent = 'Save Transaction';
    cancelEditBtn.classList.add('hidden');
    clearErrors();
}

function clearAllData() {
    if (confirm("Are you sure you want to clear all data? This action cannot be undone.")) {
        transactions = [];
        saveData();
        updateUI();
    }
}

function saveData() {
    localStorage.setItem('expenseTrackerData', JSON.stringify(transactions));
}

function validateInputs() {
    let isValid = true;
    clearErrors();

    const titleVal = titleInput.value.trim();
    if (titleVal === '') {
        showError('title-error', 'Please enter a transaction title.');
        isValid = false;
    }

    const amountVal = parseFloat(amountInput.value);
    if (isNaN(amountVal) || amountVal <= 0) {
        showError('amount-error', 'Please enter an amount greater than zero.');
        isValid = false;
    } else if (amountVal > 100000000) {
        showError('amount-error', 'Amount exceeds maximum allowable limit.');
        isValid = false;
    }

    if (dateInput.value === '') {
        showError('date-error', 'Please select a date.');
        isValid = false;
    } else {
        const selectedDate = new Date(dateInput.value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        if (selectedDate > today) {
            showError('date-error', 'Date cannot be in the future.');
            isValid = false;
        }
    }

    return isValid;
}

function showError(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

function clearErrors() {
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
}

function updateUI() {
    const filteredTransactions = getFilteredTransactions();
    
    renderTransactionList(filteredTransactions);
    updateSummary(filteredTransactions);
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
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTransactionList(filteredTransactions) {
    transactionList.innerHTML = '';

    if (filteredTransactions.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    filteredTransactions.forEach(t => {
        const li = document.createElement('li');
        li.className = 'transaction-item';

        // 1. Transaction Info Group
        const infoDiv = document.createElement('div');
        infoDiv.className = 'transaction-info';

        const h4 = document.createElement('h4');
        h4.textContent = t.title;

       const metaSpan = document.createElement('span');
        metaSpan.className = 'transaction-meta';
        // FIXED: Using standard single quotes and + sign
        metaSpan.textContent = t.date + ' | ' + t.category;

        infoDiv.appendChild(h4);
        infoDiv.appendChild(metaSpan);

        // 2. Transaction Amount Group
        const sign = t.type === 'income' ? '+' : '-';
        const amountClass = t.type === 'income' ? 'success' : 'danger';

        const amountDiv = document.createElement('div');
        // FIXED: Standard string concatenation
        amountDiv.className = 'transaction-amount ' + amountClass;
        amountDiv.textContent = sign + '₹' + t.amount.toFixed(2);

        // 3. Action Buttons Group
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'transaction-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn secondary-btn small-btn';
        editBtn.textContent = 'Edit';
        editBtn.dataset.id = t.id;
        editBtn.dataset.action = 'edit';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn danger-btn small-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.dataset.id = t.id;
        deleteBtn.dataset.action = 'delete';

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        // 4. Append All to List Item
        li.appendChild(infoDiv);
        li.appendChild(amountDiv);
        li.appendChild(actionsDiv);

        transactionList.appendChild(li);
    });
}

function updateSummary(filteredTransactions) {
    const income = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
    const expense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate actual total position from full dataset (not affected by list filters)
    const overallIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
    const overallExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
    const trueOverallBalance = overallIncome - overallExpense;

    totalIncomeEl.textContent = `₹${income.toFixed(2)}`;
    totalExpenseEl.textContent = `₹${expense.toFixed(2)}`;
    currentBalanceEl.textContent = `₹${trueOverallBalance.toFixed(2)}`;

    if (trueOverallBalance < 0) {
        currentBalanceEl.classList.add('danger');
        currentBalanceEl.classList.remove('success');
    } else if (trueOverallBalance > 0) {
        currentBalanceEl.classList.add('success');
        currentBalanceEl.classList.remove('danger');
    } else {
        currentBalanceEl.classList.remove('success', 'danger');
    }
}

function updateChart(filteredTransactions) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
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
        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['No Expense Data'], datasets: [{ data: [1], backgroundColor: ['#e1e8ed'] }] },
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

function exportToCSV() {
    if (transactions.length === 0) {
        alert("No data to export!");
        return;
    }

    const headers = ["ID", "Title", "Amount", "Type", "Category", "Date"];
    const rows = transactions.map(t => {
        const escapedTitle = t.title.replace(/"/g, '""');
        return [
            t.id,
            "${escapedTitle}",
            t.amount,
            t.type,
            t.category,
            t.date
        ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "expense_tracker_backup.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

init();