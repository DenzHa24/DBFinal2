const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql2');
app.use(express.json());
const cors = require("cors");

app.use(cors());

//Open the server
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});


/*
//Open SQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'test_db'
});





// 2. Execute a query
connection.query(
    'SELECT * FROM users WHERE id = ?', [1],
    function (err, results, fields) {
        if (err) throw err;
        console.log(results); // results contains rows
    }
);
\*/
app.post("/api/addNewSupplier", async (req, res) => {
    const { table, values } = req.body;

    try {

        // Build SQL dynamically but safely
        const columns = Object.keys(values);
        const placeholders = columns.map(() => "?").join(", ");
        const sql = `INSERT INTO \`${table}\` (${columns.join(", ")}) VALUES (${placeholders})`;

        Connection.query(sql, Object.values(values), (err, result) => {
            if (err) throw err;

            res.json({
                status: "success",
                insertedId: result.insertId
            });
        });

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});


app.post("/api/getTable", async (req, res) => {
    const { table } = req.body;

    try {
        const sql = `SELECT * FROM \`${table}\``;

        Connection.query(sql, function (err, results, fields) {
            if (err) throw err;

            const rowCount = results.length;      // number of rows
            const colCount = fields.length;       // number of columns
            const colNames = fields.map(f => f.name);

            res.json({
                status: "success",
                rows: rowCount,
                columns: colCount,
                columnNames: colNames,
                data: results
            });
        });

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post("/api/connect-db", async (req, res) => {
    const { host, user, password, database } = req.body;

    try {
        // connect then close connection
        connection = await mysql.createConnection({ host, user, password, database });
        await connection.end();

        res.json({ status: "success", message: "Connected to MySQL!" });

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});




// 3. Close the connection
//connection.end();