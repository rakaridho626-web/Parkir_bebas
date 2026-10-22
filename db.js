const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_parkir',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function logActivity(username, aktivitas) {
    try {
        await pool.query('INSERT INTO log_aktivitas (username, aktivitas) VALUES (?, ?)', [username || 'system', aktivitas]);
    } catch (err) {
        console.error('Failed to log activity:', err);
    }
}

module.exports = { pool, logActivity };
