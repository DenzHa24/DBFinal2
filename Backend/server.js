const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/Frontend', express.static(path.join(__dirname, '../Frontend')));
app.use('/Resources', express.static(path.join(__dirname, '../Resources')));
app.use('/', express.static(path.join(__dirname, '../Frontend')));

let dbPool = null;

const ALLOWED_TABLES = new Set([
    'SUPPLIERS',
    'PHONE_NUMBERS',
    'PARTS',
    'ORDERS',
    'ORDER_PARTS',
    'PART_SUPPLIERS'
]);

function normalizeTableName(tableName = '') {
    return String(tableName).trim().toUpperCase();
}

function requireDbConnection(res) {
    if (!dbPool) {
        res.status(400).json({
            status: 'error',
            message: 'Database is not connected. Please connect from the home page first.'
        });
        return false;
    }

    return true;
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/connect-db', async (req, res) => {
    const { host, user, password, database } = req.body;

    if (!host || !user || !database) {
        return res.status(400).json({ status: 'error', message: 'Host, user, and database are required.' });
    }

    try {
        const candidatePool = mysql.createPool({
            host,
            user,
            password,
            database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        await candidatePool.query('SELECT 1');

        if (dbPool) {
            await dbPool.end();
        }

        dbPool = candidatePool;

        return res.json({ status: 'success', message: 'Connected to MySQL.' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

app.post('/api/getTable', async (req, res) => {
    if (!requireDbConnection(res)) {
        return;
    }

    const requestedName = req.body.table || req.body.tableName;
    const tableName = normalizeTableName(requestedName);

    if (!ALLOWED_TABLES.has(tableName)) {
        return res.status(400).json({
            status: 'error',
            message: `Table '${requestedName}' is not allowed.`
        });
    }

    try {
        const [rows, fields] = await dbPool.query(`SELECT * FROM \`${tableName}\``);
        return res.json({
            status: 'success',
            rows: rows.length,
            columns: fields.length,
            columnNames: fields.map((f) => f.name),
            data: rows
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

app.post('/api/addSupplier', async (req, res) => {
    if (!requireDbConnection(res)) {
        return;
    }

    const supplierName = String(req.body.supplierName || '').trim();
    const email = String(req.body.email || '').trim();

    let phoneNumbers = req.body.phoneNumbers || [];
    if (!Array.isArray(phoneNumbers)) {
        phoneNumbers = [phoneNumbers];
    }

    phoneNumbers = phoneNumbers
        .map((phone) => String(phone || '').trim())
        .filter((phone) => phone.length > 0);

    if (!supplierName || !email || phoneNumbers.length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Supplier name, email, and at least one phone number are required.'
        });
    }

    const uniquePhones = [...new Set(phoneNumbers)];
    if (uniquePhones.length !== phoneNumbers.length) {
        return res.status(400).json({ status: 'error', message: 'Duplicate phone numbers were provided.' });
    }

    const connection = await dbPool.getConnection();

    try {
        await connection.beginTransaction();

        const [supplierResult] = await connection.query(
            'INSERT INTO SUPPLIERS (Name, Email) VALUES (?, ?)',
            [supplierName, email]
        );

        const supplierId = supplierResult.insertId;
        const phoneValues = uniquePhones.map((phone) => [phone, supplierId]);

        await connection.query(
            'INSERT INTO PHONE_NUMBERS (PhoneNumber, SupplierID) VALUES ?',
            [phoneValues]
        );

        await connection.commit();

        return res.json({
            status: 'success',
            message: 'Supplier added successfully.',
            supplierId,
            phoneCount: uniquePhones.length
        });
    } catch (err) {
        await connection.rollback();

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ status: 'error', message: 'Duplicate value prevented insert.' });
        }

        return res.status(500).json({ status: 'error', message: err.message });
    } finally {
        connection.release();
    }
});

app.post('/api/annualExpenses', async (req, res) => {
    if (!requireDbConnection(res)) {
        return;
    }

    const startYear = Number.parseInt(req.body.startYear, 10);
    const endYear = Number.parseInt(req.body.endYear, 10);

    if (Number.isNaN(startYear) || Number.isNaN(endYear) || startYear > endYear) {
        return res.status(400).json({ status: 'error', message: 'Provide a valid year range.' });
    }

    try {
        const [rows] = await dbPool.query(
            `SELECT
                YEAR(o.OrderDate) AS year,
                ROUND(SUM(op.Quantity * p.Price), 2) AS totalExpense
            FROM ORDERS o
            JOIN ORDER_PARTS op ON o.OrderID = op.OrderID
            JOIN PARTS p ON op.PartID = p.PartID
            WHERE YEAR(o.OrderDate) BETWEEN ? AND ?
            GROUP BY YEAR(o.OrderDate)
            ORDER BY YEAR(o.OrderDate)`,
            [startYear, endYear]
        );

        return res.json({ status: 'success', data: rows });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

app.post('/api/budgetProjection', async (req, res) => {
    if (!requireDbConnection(res)) {
        return;
    }

    const numYears = Number.parseInt(req.body.numYears, 10);
    const inflationRatePercent = Number.parseFloat(req.body.inflationRate);

    if (Number.isNaN(numYears) || numYears < 1 || Number.isNaN(inflationRatePercent) || inflationRatePercent < 0) {
        return res.status(400).json({ status: 'error', message: 'Provide valid years and inflation rate.' });
    }

    try {
        const [baselineRows] = await dbPool.query(
            `SELECT
                YEAR(o.OrderDate) AS year,
                SUM(op.Quantity * p.Price) AS totalExpense
            FROM ORDERS o
            JOIN ORDER_PARTS op ON o.OrderID = op.OrderID
            JOIN PARTS p ON op.PartID = p.PartID
            GROUP BY YEAR(o.OrderDate)
            ORDER BY YEAR(o.OrderDate) DESC
            LIMIT 1`
        );

        if (baselineRows.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No order history available.' });
        }

        const baselineYear = baselineRows[0].year;
        const baselineExpense = Number(baselineRows[0].totalExpense);
        const inflationRate = inflationRatePercent / 100;

        const projections = [];
        for (let i = 1; i <= numYears; i += 1) {
            projections.push({
                year: baselineYear + i,
                projectedExpense: Number((baselineExpense * ((1 + inflationRate) ** i)).toFixed(2))
            });
        }

        return res.json({
            status: 'success',
            baselineYear,
            baselineExpense: Number(baselineExpense.toFixed(2)),
            inflationRatePercent,
            data: projections
        });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
