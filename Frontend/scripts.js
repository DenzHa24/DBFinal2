function createTable(data) {
    const table = document.createElement('table');

    if (!Array.isArray(data) || data.length === 0) {
        return table;
    }

    const columns = Object.keys(data[0]);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach((column) => {
        const th = document.createElement('th');
        th.textContent = column;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach((row) => {
        const tr = document.createElement('tr');
        columns.forEach((column) => {
            const td = document.createElement('td');
            td.textContent = row[column];
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
}

function showMessage(elementId, message, isError = false) {
    const target = document.getElementById(elementId);
    if (!target) {
        return;
    }

    target.textContent = message;
    target.style.color = isError ? 'darkred' : 'darkgreen';
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Request failed.');
    }

    return data;
}

function initDbModal() {
    const modal = document.getElementById('dbModal');
    const form = document.getElementById('dbForm');

    if (!modal || !form) {
        return;
    }

    if (sessionStorage.getItem('credentialsReceived') === 'true') {
        modal.style.display = 'none';
        return;
    }

    modal.style.display = 'flex';

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const credentials = Object.fromEntries(new FormData(form));

        try {
            await postJson('/api/connect-db', credentials);
            modal.style.display = 'none';
            sessionStorage.setItem('credentialsReceived', 'true');
        } catch (error) {
            alert(`DB connection failed: ${error.message}`);
        }
    });
}

function initTableDisplay() {
    const form = document.getElementById('table-display');
    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = Object.fromEntries(new FormData(form));

        try {
            const data = await postJson('/api/getTable', formData);
            const container = document.getElementById('table');
            container.innerHTML = '';
            container.appendChild(createTable(data.data));
            showMessage('tableMessage', `Loaded ${data.rows} rows from ${formData.tableName}.`);
        } catch (error) {
            showMessage('tableMessage', error.message, true);
        }
    });
}

function addPhone() {
    const container = document.getElementById('extraPhones');
    if (!container) {
        return;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'phoneNumbers';
    input.placeholder = 'Additional phone';
    container.appendChild(input);
}

function initSupplierForm() {
    const form = document.getElementById('supplier-form');
    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fd = new FormData(form);
        const payload = {
            supplierName: fd.get('supplierName'),
            email: fd.get('email'),
            phoneNumbers: fd.getAll('phoneNumbers')
        };

        try {
            const data = await postJson('/api/addSupplier', payload);
            showMessage('supplierMessage', `${data.message} (ID ${data.supplierId})`);
            form.reset();
            document.getElementById('extraPhones').innerHTML = '';
        } catch (error) {
            showMessage('supplierMessage', error.message, true);
        }
    });
}

function initAnnualExpensesForm() {
    const form = document.getElementById('annual-expenses-form');
    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(form));

        try {
            const data = await postJson('/api/annualExpenses', payload);
            const container = document.getElementById('annualExpensesResult');
            container.innerHTML = '';
            container.appendChild(createTable(data.data));
            showMessage('annualExpensesMessage', 'Annual expenses calculated successfully.');
        } catch (error) {
            showMessage('annualExpensesMessage', error.message, true);
        }
    });
}

function initBudgetProjectionForm() {
    const form = document.getElementById('budget-projection-form');
    if (!form) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(form));

        try {
            const data = await postJson('/api/budgetProjection', payload);
            const container = document.getElementById('budgetProjectionResult');
            container.innerHTML = '';
            container.appendChild(createTable(data.data));
            showMessage(
                'budgetProjectionMessage',
                `Using ${data.baselineYear} baseline expense of $${data.baselineExpense}.`
            );
        } catch (error) {
            showMessage('budgetProjectionMessage', error.message, true);
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    initDbModal();
    initTableDisplay();
    initSupplierForm();
    initAnnualExpensesForm();
    initBudgetProjectionForm();
});
