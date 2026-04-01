const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql2');

//Open the server
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});



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

// 3. Close the connection
connection.end();