// ========================================
// MINHAS FINANÇAS - APP DE CONTROLE FINANCEIRO
// ========================================

// Estado da aplicação
const state = {
    transactions: [],
    categories: {
        income: [
            { id: 1, name: 'Salário', icon: 'fas fa-briefcase', color: '#10b981' },
            { id: 2, name: 'Freelance', icon: 'fas fa-laptop', color: '#3b82f6' },
            { id: 3, name: 'Investimentos', icon: 'fas fa-chart-line', color: '#8b5cf6' },
            { id: 4, name: 'Outros', icon: 'fas fa-plus-circle', color: '#6b7280' }
        ],
        expense: [
            { id: 5, name: 'Alimentação', icon: 'fas fa-utensils', color: '#ef4444' },
            { id: 6, name: 'Transporte', icon: 'fas fa-car', color: '#f59e0b' },
            { id: 7, name: 'Moradia', icon: 'fas fa-home', color: '#06b6d4' },
            { id: 8, name: 'Saúde', icon: 'fas fa-heartbeat', color: '#ec4899' },
            { id: 9, name: 'Educação', icon: 'fas fa-graduation-cap', color: '#8b5cf6' },
            { id: 10, name: 'Lazer', icon: 'fas fa-gamepad', color: '#10b981' },
            { id: 11, name: 'Compras', icon: 'fas fa-shopping-cart', color: '#f97316' },
            { id: 12, name: 'Contas', icon: 'fas fa-file-invoice', color: '#64748b' }
        ]
    },
    currentMonth: new Date(),
    currentSection: 'dashboard',
    editingTransaction: null,
    charts: {}
};



// Meses em português
const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// ========================================
// CONFIGURAÇÃO GOOGLE SHEETS
// ========================================

//let GOOGLE_SCRIPT_URL = localStorage.getItem('googleScriptUrl') || '';

// ========================================
// CONFIGURAÇÃO AUTO-SYNC
// ========================================

const AUTO_SYNC_CONFIG = {
    enabled: true,
    syncOnChange: true,
    syncInterval: 5,
    debounceTime: 3000
};

let syncTimeout = null;
let autoSyncInterval = null;


// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initializeApp();
    setupEventListeners();
    updateUI();
});

function initializeApp() {
    updateMonthDisplay();
    setDefaultDate();
    loadGoogleConfig(); // Adicione esta linha
    updateLastSyncDisplay(); // E esta também

    // Inicia sincronização automática periódica
    startAutoSync();

    // Tenta inicializar Google API se tiver credenciais
    if (GOOGLE_CONFIG.API_KEY && GOOGLE_CONFIG.CLIENT_ID) {
        initGoogleAPI().catch(console.error);
    }
}


function loadData() {
    const savedTransactions = localStorage.getItem('financas_transactions');
    const savedCategories = localStorage.getItem('financas_categories');
    
    if (savedTransactions) {
        state.transactions = JSON.parse(savedTransactions);
    }
    
    if (savedCategories) {
        state.categories = JSON.parse(savedCategories);
    }
}

function saveData() {
    localStorage.setItem('financas_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('financas_categories', JSON.stringify(state.categories));
    
    // Agenda sincronização automática
    scheduleSync();
}


// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });
    
    // Menu mobile
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    
    // Seletor de mês
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    
    // Modal de transação
    document.getElementById('btnAddTransaction').addEventListener('click', () => openTransactionModal());
    document.getElementById('closeModal').addEventListener('click', closeTransactionModal);
    document.getElementById('cancelTransaction').addEventListener('click', closeTransactionModal);
    document.getElementById('transactionForm').addEventListener('submit', handleTransactionSubmit);
    
    // Tipo de transação
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', handleTypeToggle);
    });
    
    // Modal de categoria
    document.querySelectorAll('.btn-add-category').forEach(btn => {
        btn.addEventListener('click', openCategoryModal);
    });
    document.getElementById('closeCategoryModal').addEventListener('click', closeCategoryModal);
    document.getElementById('cancelCategory').addEventListener('click', closeCategoryModal);
    document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);
    
    // Icon picker
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.addEventListener('click', handleIconSelect);
    });
    
    // Color picker
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', handleColorSelect);
    });
    
    // Filtros de transações
    document.getElementById('filterType').addEventListener('change', filterTransactions);
    document.getElementById('filterCategory').addEventListener('change', filterTransactions);
    document.getElementById('searchTransaction').addEventListener('input', filterTransactions);
    
    // Máscara de valor
    document.getElementById('amount').addEventListener('input', handleAmountInput);
    
    // Limpar dados
    document.getElementById('clearData').addEventListener('click', clearAllData);
    
    // Fechar modal clicando fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ========================================
// NAVEGAÇÃO
// ========================================
function handleNavigation(e) {
    e.preventDefault();
    const section = e.currentTarget.dataset.section;
    
    // Atualiza nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Atualiza seção
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    // Atualiza título
    const titles = {
        dashboard: 'Dashboard',
        transacoes: 'Transações',
        categorias: 'Categorias',
        relatorios: 'Relatórios'
    };
    document.getElementById('pageTitle').textContent = titles[section];
    
    state.currentSection = section;
    
    // Fecha sidebar em mobile
    document.querySelector('.sidebar').classList.remove('active');
    
    // Atualiza UI da seção
    if (section === 'transacoes') updateTransactionsTable();
    if (section === 'categorias') updateCategoriesUI();
    if (section === 'relatorios') updateReportsUI();
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// ========================================
// CONTROLE DE MÊS
// ========================================
function changeMonth(delta) {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + delta);
    updateMonthDisplay();
    updateUI();
}

function updateMonthDisplay() {
    const month = monthNames[state.currentMonth.getMonth()];
    const year = state.currentMonth.getFullYear();
    document.getElementById('currentMonth').textContent = `${month} ${year}`;
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// ========================================
// MODAL DE TRANSAÇÃO
// ========================================
function openTransactionModal(transaction = null) {
    const modal = document.getElementById('transactionModal');
    const form = document.getElementById('transactionForm');
    
    if (transaction) {
        // Modo edição
        state.editingTransaction = transaction;
        document.getElementById('modalTitle').textContent = 'Editar Transação';
        document.getElementById('transactionId').value = transaction.id;
        document.getElementById('description').value = transaction.description;
        document.getElementById('amount').value = formatCurrency(transaction.amount).replace('R$ ', '');
        document.getElementById('date').value = transaction.date;
        document.getElementById('notes').value = transaction.notes || '';
        
        // Seleciona tipo
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === transaction.type);
        });
        
        updateCategorySelect(transaction.type);
        setTimeout(() => {
            document.getElementById('category').value = transaction.categoryId;
        }, 100);
    } else {
        // Modo novo
        state.editingTransaction = null;
        document.getElementById('modalTitle').textContent = 'Nova Transação';
        form.reset();
        setDefaultDate();
        
        // Reset tipo para receita
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === 'income');
        });
        
        updateCategorySelect('income');
    }
    
    modal.classList.add('active');
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('active');
    state.editingTransaction = null;
}

function handleTypeToggle(e) {
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    const type = e.currentTarget.dataset.type;
    updateCategorySelect(type);
}

function updateCategorySelect(type) {
    const select = document.getElementById('category');
    const categories = state.categories[type];
    
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    categories.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
    
    // Atualiza também o filtro de categorias
    updateFilterCategories();
}

function handleAmountInput(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value) {
        value = (parseInt(value) / 100).toFixed(2);
        value = value.replace('.', ',');
        value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    e.target.value = value;
}

function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const type = document.querySelector('.type-btn.active').dataset.type;
    const description = document.getElementById('description').value.trim();
    const amountStr = document.getElementById('amount').value.replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(amountStr);
    const date = document.getElementById('date').value;
    const categoryId = parseInt(document.getElementById('category').value);
    const notes = document.getElementById('notes').value.trim();
    
    if (!description || !amount || !date || !categoryId) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    if (state.editingTransaction) {
        // Atualiza transação existente
        const index = state.transactions.findIndex(t => t.id === state.editingTransaction.id);
        if (index !== -1) {
            state.transactions[index] = {
                ...state.transactions[index],
                type,
                description,
                amount,
                date,
                categoryId,
                notes
            };
        }
        showToast('Transação atualizada com sucesso!', 'success');
    } else {
        // Nova transação
        const transaction = {
            id: Date.now(),
            type,
            description,
            amount,
            date,
            categoryId,
            notes,
            createdAt: new Date().toISOString()
        };
        state.transactions.push(transaction);
        showToast('Transação adicionada com sucesso!', 'success');
    }
    
    saveData();
    closeTransactionModal();
    updateUI();
}

// ========================================
// MODAL DE CATEGORIA
// ========================================
function openCategoryModal(e) {
    const type = e.currentTarget.dataset.type;
    document.getElementById('categoryType').value = type;
    document.getElementById('categoryModalTitle').textContent = 
        `Nova Categoria de ${type === 'income' ? 'Receita' : 'Despesa'}`;
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryModal').classList.add('active');
    
    // Reset seleções
    document.querySelectorAll('.icon-option').forEach((btn, i) => {
        btn.classList.toggle('active', i === 0);
    });
    document.querySelectorAll('.color-option').forEach((btn, i) => {
        btn.classList.toggle('active', i === 0);
    });
    document.getElementById('categoryIcon').value = 'fas fa-question';
    document.getElementById('categoryColor').value = '#4CAF50';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

function handleIconSelect(e) {
    document.querySelectorAll('.icon-option').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    document.getElementById('categoryIcon').value = e.currentTarget.dataset.icon;
}

function handleColorSelect(e) {
    document.querySelectorAll('.color-option').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    document.getElementById('categoryColor').value = e.currentTarget.dataset.color;
}

function handleCategorySubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('categoryType').value;
    const name = document.getElementById('categoryName').value.trim();
    const icon = document.getElementById('categoryIcon').value;
    const color = document.getElementById('categoryColor').value;
    
    if (!name) {
        showToast('Digite o nome da categoria', 'error');
        return;
    }
    
    const category = {
        id: Date.now(),
        name,
        icon,
        color
    };
    
    state.categories[type].push(category);
    saveData();
    closeCategoryModal();
    updateCategoriesUI();
    showToast('Categoria criada com sucesso!', 'success');
}

function deleteCategory(type, id) {
    // Verifica se há transações usando esta categoria
    const hasTransactions = state.transactions.some(t => t.categoryId === id);
    
    if (hasTransactions) {
        showToast('Não é possível excluir uma categoria com transações', 'error');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
        state.categories[type] = state.categories[type].filter(c => c.id !== id);
        saveData();
        updateCategoriesUI();
        showToast('Categoria excluída', 'success');
    }
}

// ========================================
// TRANSAÇÕES
// ========================================
function getFilteredTransactions() {
    const month = state.currentMonth.getMonth();
    const year = state.currentMonth.getFullYear();
    
    return state.transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === month && date.getFullYear() === year;
    });
}

function deleteTransaction(id) {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
        showToast('Transação excluída', 'success');
    }
}

function editTransaction(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (transaction) {
        openTransactionModal(transaction);
    }
}

function filterTransactions() {
    updateTransactionsTable();
}

function updateFilterCategories() {
    const select = document.getElementById('filterCategory');
    const allCategories = [...state.categories.income, ...state.categories.expense];
    
    select.innerHTML = '<option value="all">Todas as categorias</option>';
    allCategories.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

// ========================================
// ATUALIZAÇÃO DA UI
// ========================================
function updateUI() {
    updateSummaryCards();
    updateRecentTransactions();
    updateExpenseChart();
    updateProgressBars();
    updateTransactionsTable();
    updateCategoriesUI();
    updateFilterCategories();
}

function updateSummaryCards() {
    const transactions = getFilteredTransactions();
    
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;
    const economyRate = income > 0 ? ((income - expense) / income * 100) : 0;
    
    document.getElementById('totalBalance').textContent = formatCurrency(balance);
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense);
    document.getElementById('totalEconomy').textContent = `${economyRate.toFixed(1)}%`;
    
    // Atualiza cor do saldo
    const balanceElement = document.getElementById('totalBalance');
    balanceElement.style.color = balance >= 0 ? '#818cf8' : '#ef4444';
}

function updateRecentTransactions() {
    const container = document.getElementById('recentTransactionsList');
    const transactions = getFilteredTransactions()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Nenhuma transação neste mês</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = transactions.map(t => {
        const category = getCategoryById(t.categoryId);
        return `
            <div class="transaction-item">
                <div class="transaction-left">
                    <div class="transaction-icon" style="background: ${category?.color}20; color: ${category?.color}">
                        <i class="${category?.icon || 'fas fa-question'}"></i>
                    </div>
                    <div class="transaction-info">
                        <h4>${t.description}</h4>
                        <span>${formatDate(t.date)} • ${category?.name || 'Sem categoria'}</span>
                    </div>
                </div>
                <div class="transaction-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </div>
            </div>
        `;
    }).join('');
}

function updateExpenseChart() {
    const transactions = getFilteredTransactions().filter(t => t.type === 'expense');
    
    const categoryTotals = {};
    transactions.forEach(t => {
        const category = getCategoryById(t.categoryId);
        if (category) {
            if (!categoryTotals[category.name]) {
                categoryTotals[category.name] = { total: 0, color: category.color };
            }
            categoryTotals[category.name].total += t.amount;
        }
    });
    
    const labels = Object.keys(categoryTotals);
    const data = labels.map(l => categoryTotals[l].total);
    const colors = labels.map(l => categoryTotals[l].color);
    
    // Atualiza legenda
    const legendContainer = document.getElementById('chartLegend');
    legendContainer.innerHTML = labels.map((label, i) => `
        <div class="legend-item">
            <span class="legend-color" style="background: ${colors[i]}"></span>
            <span>${label}: ${formatCurrency(data[i])}</span>
        </div>
    `).join('');
    
    // Atualiza gráfico
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    if (state.charts.expense) {
        state.charts.expense.destroy();
    }
    
    if (data.length === 0) {
        legendContainer.innerHTML = '<p style="color: var(--text-muted)">Sem despesas neste mês</p>';
        return;
    }
    
    state.charts.expense = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            cutout: '70%'
        }
    });
}

function updateProgressBars() {
    const transactions = getFilteredTransactions();
    
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const maxValue = Math.max(income, expense, 1);
    
    document.getElementById('incomeProgress').textContent = formatCurrency(income);
    document.getElementById('expenseProgress').textContent = formatCurrency(expense);
    
    document.getElementById('incomeBar').style.width = `${(income / maxValue) * 100}%`;
    document.getElementById('expenseBar').style.width = `${(expense / maxValue) * 100}%`;
}

function updateTransactionsTable() {
    const filterType = document.getElementById('filterType').value;
    const filterCategory = document.getElementById('filterCategory').value;
    const search = document.getElementById('searchTransaction').value.toLowerCase();
    
    let transactions = getFilteredTransactions();
    
    // Aplicar filtros
    if (filterType !== 'all') {
        transactions = transactions.filter(t => t.type === filterType);
    }
    
    if (filterCategory !== 'all') {
        transactions = transactions.filter(t => t.categoryId === parseInt(filterCategory));
    }
    
    if (search) {
        transactions = transactions.filter(t => 
            t.description.toLowerCase().includes(search)
        );
    }
    
    // Ordenar por data (mais recente primeiro)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const tbody = document.getElementById('transactionsTableBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>Nenhuma transação encontrada</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = transactions.map(t => {
        const category = getCategoryById(t.categoryId);
        return `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.description}</td>
                <td>
                    <span style="color: ${category?.color}">
                        <i class="${category?.icon}"></i> ${category?.name || 'N/A'}
                    </span>
                </td>
                <td>
                    <span class="type-badge ${t.type}">
                        <i class="fas fa-arrow-${t.type === 'income' ? 'up' : 'down'}"></i>
                        ${t.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                </td>
                <td style="color: ${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}; font-weight: 600">
                    ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-action btn-edit" onclick="editTransaction(${t.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteTransaction(${t.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateCategoriesUI() {
    // Categorias de receita
    const incomeList = document.getElementById('incomeCategoriesList');
    incomeList.innerHTML = state.categories.income.map(cat => `
        <div class="category-item">
            <div class="category-left">
                <div class="category-icon" style="background: ${cat.color}">
                    <i class="${cat.icon}"></i>
                </div>
                <span class="category-name">${cat.name}</span>
            </div>
            <div class="category-actions">
                <button class="btn-action btn-delete" onclick="deleteCategory('income', ${cat.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Categorias de despesa
    const expenseList = document.getElementById('expenseCategoriesList');
    expenseList.innerHTML = state.categories.expense.map(cat => `
        <div class="category-item">
            <div class="category-left">
                <div class="category-icon" style="background: ${cat.color}">
                    <i class="${cat.icon}"></i>
                </div>
                <span class="category-name">${cat.name}</span>
            </div>
            <div class="category-actions">
                <button class="btn-action btn-delete" onclick="deleteCategory('expense', ${cat.id})" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateReportsUI() {
    updateYearlyChart();
    updateTopExpenses();
    updateCategoryBalance();
}

function updateYearlyChart() {
    const year = state.currentMonth.getFullYear();
    const monthlyData = {
        income: Array(12).fill(0),
        expense: Array(12).fill(0)
    };
    
    state.transactions.forEach(t => {
        const date = new Date(t.date);
        if (date.getFullYear() === year) {
            monthlyData[t.type][date.getMonth()] += t.amount;
        }
    });
    
    const ctx = document.getElementById('yearlyChart').getContext('2d');
    
    if (state.charts.yearly) {
        state.charts.yearly.destroy();
    }
    
    state.charts.yearly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthNames.map(m => m.substring(0, 3)),
            datasets: [
                {
                    label: 'Receitas',
                    data: monthlyData.income,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                },
                {
                    label: 'Despesas',
                    data: monthlyData.expense,
                    backgroundColor: '#ef4444',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8' }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function updateTopExpenses() {
    const transactions = getFilteredTransactions().filter(t => t.type === 'expense');
    
    const categoryTotals = {};
    transactions.forEach(t => {
        const category = getCategoryById(t.categoryId);
        if (category) {
            if (!categoryTotals[category.name]) {
                categoryTotals[category.name] = { total: 0, icon: category.icon, color: category.color };
            }
            categoryTotals[category.name].total += t.amount;
        }
    });
    
    const sorted = Object.entries(categoryTotals)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);
    
    const container = document.getElementById('topExpensesList');
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <p>Sem despesas neste mês</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = sorted.map(([name, data], index) => `
        <div class="top-expense-item">
            <div class="top-expense-rank">${index + 1}</div>
            <div class="top-expense-info">
                <h4><i class="${data.icon}" style="color: ${data.color}"></i> ${name}</h4>
            </div>
            <div class="top-expense-value">${formatCurrency(data.total)}</div>
        </div>
    `).join('');
}

function updateCategoryBalance() {
    const transactions = getFilteredTransactions().filter(t => t.type === 'expense');
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    const categoryTotals = {};
    transactions.forEach(t => {
        const category = getCategoryById(t.categoryId);
        if (category) {
            if (!categoryTotals[category.name]) {
                categoryTotals[category.name] = { total: 0, count: 0 };
            }
            categoryTotals[category.name].total += t.amount;
            categoryTotals[category.name].count++;
        }
    });
    
    const tbody = document.getElementById('categoryBalanceBody');
    
    if (Object.keys(categoryTotals).length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 40px">
                    Sem dados para exibir
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = Object.entries(categoryTotals)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, data]) => `
            <tr>
                <td>${name}</td>
                <td style="font-weight: 600">${formatCurrency(data.total)}</td>
                <td>${total > 0 ? ((data.total / total) * 100).toFixed(1) : 0}%</td>
                <td>${formatCurrency(data.total / (data.count || 1))}</td>
            </tr>
        `).join('');
}

// ========================================
// UTILITÁRIOS
// ========================================
function getCategoryById(id) {
    return [...state.categories.income, ...state.categories.expense]
        .find(c => c.id === id);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function clearAllData() {
    if (confirm('Tem certeza que deseja apagar TODOS os dados? Esta ação não pode ser desfeita.')) {
        localStorage.removeItem('financas_transactions');
        localStorage.removeItem('financas_categories');
        
        state.transactions = [];
        state.categories = {
            income: [
                { id: 1, name: 'Salário', icon: 'fas fa-briefcase', color: '#10b981' },
                { id: 2, name: 'Freelance', icon: 'fas fa-laptop', color: '#3b82f6' },
                { id: 3, name: 'Investimentos', icon: 'fas fa-chart-line', color: '#8b5cf6' },
                { id: 4, name: 'Outros', icon: 'fas fa-plus-circle', color: '#6b7280' }
            ],
            expense: [
                { id: 5, name: 'Alimentação', icon: 'fas fa-utensils', color: '#ef4444' },
                { id: 6, name: 'Transporte', icon: 'fas fa-car', color: '#f59e0b' },
                { id: 7, name: 'Moradia', icon: 'fas fa-home', color: '#06b6d4' },
                { id: 8, name: 'Saúde', icon: 'fas fa-heartbeat', color: '#ec4899' },
                { id: 9, name: 'Educação', icon: 'fas fa-graduation-cap', color: '#8b5cf6' },
                { id: 10, name: 'Lazer', icon: 'fas fa-gamepad', color: '#10b981' },
                { id: 11, name: 'Compras', icon: 'fas fa-shopping-cart', color: '#f97316' },
                { id: 12, name: 'Contas', icon: 'fas fa-file-invoice', color: '#64748b' }
            ]
        };
        
        saveData();
        updateUI();
        showToast('Todos os dados foram apagados', 'warning');
    }
}

// ========================================
// EXPORTAR / IMPORTAR DADOS
// ========================================

function exportData() {
    const data = {
        transactions: state.transactions,
        categories: state.categories,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `minhas-financas-backup-${formatDateForFile(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Backup exportado com sucesso!', 'success');
}

function importData(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validação básica
            if (!data.transactions || !data.categories) {
                throw new Error('Arquivo inválido');
            }
            
            // Confirma importação
            if (confirm(`Importar backup de ${formatDate(data.exportDate?.split('T')[0] || new Date().toISOString().split('T')[0])}?\n\nIsso substituirá todos os dados atuais.`)) {
                state.transactions = data.transactions;
                state.categories = data.categories;
                saveData();
                updateUI();
                showToast('Dados importados com sucesso!', 'success');
            }
        } catch (error) {
            showToast('Erro ao importar: arquivo inválido', 'error');
            console.error('Import error:', error);
        }
    };
    
    reader.readAsText(file);
}

function formatDateForFile(date) {
    return date.toISOString().split('T')[0];
}

// Função para mesclar dados (importar sem substituir)
function mergeImportData(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.transactions || !data.categories) {
                throw new Error('Arquivo inválido');
            }
            
            if (confirm('Deseja MESCLAR os dados importados com os existentes?\n\n(Transações duplicadas serão ignoradas)')) {
                // Mescla transações (evita duplicatas por ID)
                const existingIds = new Set(state.transactions.map(t => t.id));
                const newTransactions = data.transactions.filter(t => !existingIds.has(t.id));
                state.transactions = [...state.transactions, ...newTransactions];
                
                // Mescla categorias
                ['income', 'expense'].forEach(type => {
                    const existingCatIds = new Set(state.categories[type].map(c => c.id));
                    const newCats = data.categories[type].filter(c => !existingCatIds.has(c.id));
                    state.categories[type] = [...state.categories[type], ...newCats];
                });
                
                saveData();
                updateUI();
                showToast(`${newTransactions.length} transações importadas!`, 'success');
            }
        } catch (error) {
            showToast('Erro ao importar: arquivo inválido', 'error');
        }
    };
    
    reader.readAsText(file);
}

// ========================================
// GOOGLE SHEETS SYNC
// ========================================

const GOOGLE_CONFIG = {
    // Você precisará configurar estes valores
    API_KEY: '', // Sua API Key do Google
    CLIENT_ID: '', // Seu Client ID do Google
    SPREADSHEET_ID: '1ASyZ3HjbBqo-nelZbbGlGphQusaBsCLl2emoswjQJSo', // ID da planilha
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
    // GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwQgDXJvp_aEKKZaR_K6fvmR55vHb9qbM0R7tBw3GsbeUIR1sp31DbVVu0CYis5sSYK/exec'
};

let googleAuth = null;
let isGoogleInitialized = false;

// Inicializa a API do Google
function initGoogleAPI() {
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', async () => {
            try {
                await gapi.client.init({
                    apiKey: GOOGLE_CONFIG.API_KEY,
                    clientId: GOOGLE_CONFIG.CLIENT_ID,
                    scope: GOOGLE_CONFIG.SCOPES,
                    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
                });
                
                googleAuth = gapi.auth2.getAuthInstance();
                isGoogleInitialized = true;
                
                // Verifica se já está logado
                if (googleAuth.isSignedIn.get()) {
                    updateGoogleButtonState(true);
                }
                
                resolve();
            } catch (error) {
                console.error('Erro ao inicializar Google API:', error);
                reject(error);
            }
        });
    });
}

// Login no Google
async function googleSignIn() {
    if (!isGoogleInitialized) {
        showToast('Google API não inicializada. Configure as credenciais.', 'error');
        openGoogleConfigModal();
        return;
    }
    
    try {
        await googleAuth.signIn();
        updateGoogleButtonState(true);
        showToast('Conectado ao Google!', 'success');
    } catch (error) {
        console.error('Erro no login:', error);
        showToast('Erro ao conectar com Google', 'error');
    }
}

// Logout do Google
async function googleSignOut() {
    if (googleAuth) {
        await googleAuth.signOut();
        updateGoogleButtonState(false);
        showToast('Desconectado do Google', 'warning');
    }
}

// Atualiza estado do botão
function updateGoogleButtonState(isConnected) {
    const btn = document.getElementById('googleSyncBtn');
    const statusDot = document.getElementById('googleStatus');
    
    if (btn) {
        btn.innerHTML = isConnected 
            ? '<i class="fas fa-cloud-upload-alt"></i> <span>Sincronizar</span>'
            : '<i class="fab fa-google"></i> <span>Conectar Google</span>';
    }
    
    if (statusDot) {
        statusDot.className = `status-dot ${isConnected ? 'connected' : ''}`;
    }
}

// Exporta para Google Sheets
async function syncToGoogleSheets() {
    if (!googleAuth?.isSignedIn.get()) {
        await googleSignIn();
        return;
    }
    
    if (!GOOGLE_CONFIG.SPREADSHEET_ID) {
        showToast('Configure o ID da planilha primeiro', 'warning');
        openGoogleConfigModal();
        return;
    }
    
    showToast('Sincronizando...', 'warning');
    
    try {
        // Prepara dados das transações
        const transactionRows = [
            ['ID', 'Tipo', 'Descrição', 'Valor', 'Data', 'Categoria ID', 'Categoria Nome', 'Observações', 'Criado Em']
        ];
        
        state.transactions.forEach(t => {
            const category = getCategoryById(t.categoryId);
            transactionRows.push([
                t.id.toString(),
                t.type,
                t.description,
                t.amount,
                t.date,
                t.categoryId?.toString() || '',
                category?.name || '',
                t.notes || '',
                t.createdAt || ''
            ]);
        });
        
        // Prepara dados das categorias
        const categoryRows = [
            ['ID', 'Tipo', 'Nome', 'Ícone', 'Cor']
        ];
        
        ['income', 'expense'].forEach(type => {
            state.categories[type].forEach(c => {
                categoryRows.push([
                    c.id.toString(),
                    type,
                    c.name,
                    c.icon,
                    c.color
                ]);
            });
        });
        
        // Limpa e atualiza aba de Transações
        await gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
            range: 'Transações!A:I'
        });
        
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
            range: 'Transações!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: transactionRows }
        });
        
        // Limpa e atualiza aba de Categorias
        await gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
            range: 'Categorias!A:E'
        });
        
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
            range: 'Categorias!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: categoryRows }
        });
        
        // Salva timestamp da última sincronização
        localStorage.setItem('lastGoogleSync', new Date().toISOString());
        updateLastSyncDisplay();
        
        showToast('Sincronizado com Google Sheets!', 'success');
        
    } catch (error) {
        console.error('Erro ao sincronizar:', error);
        showToast('Erro ao sincronizar: ' + error.message, 'error');
    }
}

// Importa do Google Sheets (via Apps Script)
async function importFromGoogleSheets() {
    if (!confirm('Isso substituirá todos os dados locais pelos dados do Google Sheets. Continuar?')) {
        return;
    }
    
    const btn = document.querySelector('[onclick="importFromGoogleSheets()"]');
    if (btn) btn.disabled = true;
    
    showNotification('📥 Importando do Google Sheets...', 'warning');
    
    try {
        const payload = { action: 'import' };
        const urlComDados = GOOGLE_SCRIPT_URL + '?data=' + encodeURIComponent(JSON.stringify(payload));
        
        const response = await fetch(urlComDados);
        const result = await response.json();
        
        if (result.success) {
            // Salvar no localStorage
            localStorage.setItem('financas_transactions', JSON.stringify(result.transactions));
            localStorage.setItem('financas_categories', JSON.stringify(result.categories));
            
            showNotification('✅ Importado! ' + result.transactions.length + ' transações', 'success');
            
            // Recarrega para mostrar os dados
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification('❌ Erro: ' + result.error, 'error');
        }
    } catch (error) {
        showNotification('❌ Erro: ' + error.message, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Salva configurações do Google
function saveGoogleConfig() {
    const apiKey = document.getElementById('googleApiKey').value.trim();
    const clientId = document.getElementById('googleClientId').value.trim();
    const spreadsheetId = document.getElementById('googleSpreadsheetId').value.trim();
    
    if (!spreadsheetId) {
        showToast('Informe pelo menos o ID da planilha', 'error');
        return;
    }
    
    GOOGLE_CONFIG.API_KEY = apiKey;
    GOOGLE_CONFIG.CLIENT_ID = clientId;
    GOOGLE_CONFIG.SPREADSHEET_ID = spreadsheetId;
    
    // Salva no localStorage
    localStorage.setItem('googleConfig', JSON.stringify({
        apiKey,
        clientId,
        spreadsheetId
    }));
    
    closeGoogleConfigModal();
    showToast('Configurações salvas!', 'success');
    
    // Reinicializa API se tiver credenciais completas
    if (apiKey && clientId) {
        initGoogleAPI();
    }
}

// Carrega configurações salvas
function loadGoogleConfig() {
    const saved = localStorage.getItem('googleConfig');
    if (saved) {
        const config = JSON.parse(saved);
        GOOGLE_CONFIG.API_KEY = config.apiKey || '';
        GOOGLE_CONFIG.CLIENT_ID = config.clientId || '';
        GOOGLE_CONFIG.SPREADSHEET_ID = config.spreadsheetId || '';
        
        // Preenche campos do modal
        if (document.getElementById('googleApiKey')) {
            document.getElementById('googleApiKey').value = config.apiKey || '';
            document.getElementById('googleClientId').value = config.clientId || '';
            document.getElementById('googleSpreadsheetId').value = config.spreadsheetId || '';
        }
    }
}

// Atualiza display da última sincronização
function updateLastSyncDisplay() {
    const lastSync = localStorage.getItem('lastGoogleSync');
    const display = document.getElementById('lastSyncTime');
    
    if (display && lastSync) {
        const date = new Date(lastSync);
        display.textContent = `Última sync: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
}

// Modais de configuração
function openGoogleConfigModal() {
    loadGoogleConfig();
    document.getElementById('googleConfigModal').classList.add('active');
}

function closeGoogleConfigModal() {
    document.getElementById('googleConfigModal').classList.remove('active');
}


// Inicia sincronização automática periódica
function startAutoSync() {
    if (AUTO_SYNC_CONFIG.syncInterval > 0 && GOOGLE_SCRIPT_URL) {
        // Limpa intervalo anterior se existir
        if (autoSyncInterval) {
            clearInterval(autoSyncInterval);
        }
        
        // Cria novo intervalo
        autoSyncInterval = setInterval(() => {
            if (GOOGLE_SCRIPT_URL) {
                console.log('⏰ Auto-sync periódico...');
                syncToGoogleSheets(true); // true = silencioso
            }
        }, AUTO_SYNC_CONFIG.syncInterval * 60 * 1000);
        
        console.log(`✅ Auto-sync configurado para cada ${AUTO_SYNC_CONFIG.syncInterval} minutos`);
    }
}

// Para sincronização automática
function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
    }
}

// Agenda sincronização com debounce (evita muitas chamadas seguidas)
function scheduleSync() {
    // Verifica se auto-sync está habilitado e URL configurada
    if (!AUTO_SYNC_CONFIG.enabled || !AUTO_SYNC_CONFIG.syncOnChange) {
        return;
    }
    
    // Verifica se a URL existe
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === '') {
        return; // Sai silenciosamente se não tiver URL configurada
    }
    
    // Cancela sync pendente
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    
    // Agenda novo sync
    syncTimeout = setTimeout(() => {
        console.log('📤 Auto-sync após alteração...');
        syncToGoogleSheets(true);
    }, AUTO_SYNC_CONFIG.debounceTime);
}


// Atualiza a função syncToGoogleSheets para aceitar modo silencioso
async function syncToGoogleSheets(silent = false) {
    if (!GOOGLE_SCRIPT_URL) {
        if (!silent) openGoogleConfigModal();
        return;
    }
    
    if (!silent) showToast('Sincronizando...', 'warning');
    
    try {
        const transactionsWithCategoryNames = state.transactions.map(t => ({
            ...t,
            categoryName: getCategoryById(t.categoryId)?.name || ''
        }));
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'sync',
                transactions: transactionsWithCategoryNames,
                categories: state.categories
            })
        });
        
        const now = new Date().toISOString();
        localStorage.setItem('lastGoogleSync', now);
        updateLastSyncDisplay();
        updateGoogleButtonState(true);
        
        if (!silent) {
            showToast('Sincronizado com Google Sheets!', 'success');
        } else {
            console.log('✅ Sync automático concluído:', now);
        }
        
    } catch (error) {
        console.error('Erro ao sincronizar:', error);
        if (!silent) {
            showToast('Erro ao sincronizar. Verifique a URL.', 'error');
        }
    }
}

// ===== SINCRONIZAÇÃO COM GOOGLE SHEETS =====
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQgDXJvp_aEKKZaR_K6fvmR55vHb9qbM0R7tBw3GsbeUIR1sp31DbVVu0CYis5sSYK/exec';

async function syncWithGoogleSheets() {
    const syncBtn = document.getElementById('syncBtn');
    
    if (syncBtn) {
        syncBtn.classList.add('syncing');
        syncBtn.disabled = true;
    }
    
    try {
        // CHAVES CORRETAS DO APP
        const transactions = JSON.parse(localStorage.getItem('financas_transactions') || '[]');
        const categories = JSON.parse(localStorage.getItem('financas_categories') || '{}');
        
        const payload = {
            action: 'sync',
            transactions: transactions,
            categories: categories
        };
        
        // Usando GET para evitar CORS
        const urlComDados = GOOGLE_SCRIPT_URL + '?data=' + encodeURIComponent(JSON.stringify(payload));
        const response = await fetch(urlComDados);
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Sincronizado! ' + transactions.length + ' transações enviadas', 'success');
        } else {
            showNotification('❌ Erro: ' + result.error, 'error');
        }
        
    } catch (error) {
        showNotification('❌ Erro de conexão: ' + error.message, 'error');
    } finally {
        if (syncBtn) {
            syncBtn.classList.remove('syncing');
            syncBtn.disabled = false;
        }
    }
}

// Função de notificação (se não existir)
function showNotification(message, type = 'success') {
    // Remove notificação anterior se existir
    const existingNotification = document.querySelector('.sync-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `sync-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Event listener do botão
document.getElementById('syncBtn')?.addEventListener('click', syncWithGoogleSheets);


