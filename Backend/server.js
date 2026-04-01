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

app.post("/api/connect-db", async (req, res) => {
    const { host, user, password, database } = req.body;

    try {
        /*
        connection = await mysql.createConnection({ host, user, password, database });
        await connection.end();
        */
        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});




// 3. Close the connection
//connection.end();