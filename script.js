document.addEventListener('DOMContentLoaded', function () {

    // --- Element Selections ---
    const fab = document.getElementById('fab');
    const actionSheet = document.getElementById('action-sheet');

    // --- Data Storage Helper ---
    const db = {
        // Helper to get data from localStorage
        get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
        // Helper to save data to localStorage
        set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    };
    
    // --- Screen Navigation Logic ---
    let currentScreen = 'dashboard-screen';
    const showScreen = (screenId) => {
        const nextScreen = document.getElementById(screenId);
        const activeScreen = document.querySelector('.screen.active');

        if (activeScreen) {
            activeScreen.classList.add('exit-left');
        }

        nextScreen.classList.remove('exit-left');
        nextScreen.classList.add('active');
        currentScreen = screenId;
        
        // Remove classes after transition ends
        setTimeout(() => {
            if(activeScreen && activeScreen !== nextScreen) {
                activeScreen.classList.remove('active', 'exit-left');
            }
        }, 350); // Match transition duration in CSS
    };
    
    const goBack = (event) => {
        const targetScreenId = event.currentTarget.dataset.target;
        showScreen(targetScreenId);
    };
    document.querySelectorAll('.back-button').forEach(btn => btn.addEventListener('click', goBack));


    // --- FAB & Action Sheet Logic ---
    fab.addEventListener('click', () => actionSheet.classList.add('show'));
    document.getElementById('cancel-action').addEventListener('click', () => actionSheet.classList.remove('show'));
    actionSheet.addEventListener('click', (e) => (e.target === actionSheet) && actionSheet.classList.remove('show'));

    actionSheet.addEventListener('click', (event) => {
        const action = event.target.dataset.action;
        if (!action) return;

        actionSheet.classList.remove('show');
        if (action === 'new-invoice') {
            document.getElementById('invoice-form').reset();
            document.getElementById('line-items').innerHTML = '';
            calculateTotal();
            addLineItem();
            document.getElementById('invoice-date').valueAsDate = new Date();
        }
        showScreen(action.replace('new-', '') + '-screen');
    });

    // --- Invoice Creation Logic ---
    const invoiceForm = document.getElementById('invoice-form');
    const lineItemsContainer = document.getElementById('line-items');
    const invoiceTotalEl = document.getElementById('invoice-total');
    
    const addLineItem = () => {
        const newItem = document.createElement('div');
        newItem.classList.add('line-item');
        newItem.innerHTML = `
            <input type="text" placeholder="Item name" class="line-item-name">
            <input type="number" placeholder="Qty" class="line-item-qty" value="1" min="1">
            <input type="number" placeholder="Price" class="line-item-price" step="0.01" min="0">
            <button type="button" class="line-item-delete">×</button>
        `;
        lineItemsContainer.appendChild(newItem);
    };

    document.getElementById('add-item-btn').addEventListener('click', addLineItem);
    lineItemsContainer.addEventListener('click', (e) => e.target.classList.contains('line-item-delete') && e.target.parentElement.remove());
    lineItemsContainer.addEventListener('input', () => calculateTotal());

    const calculateTotal = () => {
        let total = 0;
        lineItemsContainer.querySelectorAll('.line-item').forEach(item => {
            const qty = parseFloat(item.querySelector('.line-item-qty').value) || 0;
            const price = parseFloat(item.querySelector('.line-item-price').value) || 0;
            total += qty * price;
        });
        invoiceTotalEl.textContent = `₹${total.toFixed(2)}`;
    };
    
    invoiceForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const invoices = db.get('invoices');
        const invoiceId = `INV-${Date.now().toString().slice(-4)}`;
        const newInvoice = {
            id: invoiceId,
            customer: document.getElementById('customer').value,
            date: document.getElementById('invoice-date').value,
            total: parseFloat(invoiceTotalEl.textContent.replace('₹', '')),
            status: 'Pending' // Default status
        };
        db.set('invoices', [newInvoice, ...invoices]);
        showToast(`✅ Invoice ${invoiceId} saved!`);
        updateDashboard();
        showScreen('dashboard-screen');
    });

    // --- Render Invoice Lists ---
    const renderInvoiceList = (containerId, invoiceList) => {
        const container = document.getElementById(containerId);
        container.innerHTML = ''; // Clear previous list
        if (invoiceList.length === 0) {
            container.innerHTML = `<p>No invoices found.</p>`;
            return;
        }
        invoiceList.forEach(inv => {
            const item = document.createElement('li');
            item.className = 'activity-list-item'; // Use a different class if needed
            item.innerHTML = `
                <span>${inv.id} - ${inv.customer}</span>
                <span class="status ${inv.status.toLowerCase()}">${inv.total.toFixed(2)}</span>`;
            container.appendChild(item);
        });
    };
    
    const renderAllInvoices = () => {
        const container = document.getElementById('all-invoices-container');
        container.querySelector('.skeleton-wrapper').style.display = 'block'; // Show skeleton
        
        setTimeout(() => { // Simulate network delay
            container.querySelector('.skeleton-wrapper').style.display = 'none'; // Hide skeleton
            const allInvoices = db.get('invoices');
            allInvoices.forEach(inv => {
                const item = document.createElement('div');
                item.className = 'invoice-list-item';
                item.innerHTML = `
                    <div>
                        <strong>${inv.id}</strong><br>
                        <small>${inv.customer}</small>
                    </div>
                    <div class="status ${inv.status.toLowerCase()}">₹${inv.total.toFixed(2)}</div>`;
                container.appendChild(item);
            });
        }, 500);
    };

    document.getElementById('view-all-invoices').addEventListener('click', () => {
        showScreen('invoices-list-screen');
        renderAllInvoices();
    });

    // --- Dashboard Logic ---
    const updateDashboard = () => {
        const recentInvoices = db.get('invoices').slice(0, 3);
        renderInvoiceList('recent-invoices-list', recentInvoices);
    };

    // --- Expense & Customer Forms ---
    document.getElementById('expense-form').addEventListener('submit', e => {
        e.preventDefault();
        const expenses = db.get('expenses');
        const newExpense = {
            category: document.getElementById('expense-category').value,
            amount: document.getElementById('expense-amount').value,
        };
        db.set('expenses', [newExpense, ...expenses]);
        showToast('💸 Expense saved!');
        showScreen('dashboard-screen');
    });

    document.getElementById('customer-form').addEventListener('submit', e => {
        e.preventDefault();
        const customers = db.get('customers');
        const newCustomer = {
            name: document.getElementById('customer-name').value,
            email: document.getElementById('customer-email').value,
        };
        db.set('customers', [newCustomer, ...customers]);
        showToast('🧑‍🤝‍🧑 New customer saved!');
        showScreen('dashboard-screen');
    });

    // --- Toast Notification ---
    const showToast = (message) => {
        const toast = document.getElementById('toast');
        toast.querySelector('#toast-message').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    // --- Initial Load ---
    updateDashboard();
});
