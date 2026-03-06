const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'db.json');
let data = { users: [] };

try {
    if (fs.existsSync(dbPath)) {
        data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } else {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    }
} catch (e) {
    console.error('Error reading db.json:', e);
}

const save = () => {
    try { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('Error saving db.json:', e); }
};

const db = {
    run: function (sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        callback = callback || function () { };

        sql = sql.trim();
        if (sql.startsWith('INSERT INTO users')) {
            const [username, password_hash, referral_code, referred_by] = params;
            if (data.users.find(u => u.username === username)) {
                return callback(new Error('UNIQUE constraint failed: users.username'));
            }
            const nextId = (data.users.length > 0) ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
            data.users.push({
                id: nextId, username, password_hash, referral_code,
                referred_by: referred_by || null, balance: 0, total_ads_viewed: 0,
                created_at: new Date().toISOString()
            });
            save();
            callback.call({ lastID: nextId, changes: 1 }, null);
        } else if (sql.startsWith('UPDATE users SET total_ads_viewed')) {
            const [total, balInc, id] = params;
            const user = data.users.find(u => u.id === id);
            if (user) {
                user.total_ads_viewed = total;
                user.balance += balInc;
                save();
            }
            callback(null);
        } else if (sql.startsWith('UPDATE users SET balance')) {
            const [balInc, refCode] = params;
            const user = data.users.find(u => u.referral_code === refCode);
            if (user) {
                user.balance += balInc;
                save();
            }
            callback(null);
        } else if (sql.startsWith('CREATE TABLE')) {
            callback(null);
        } else {
            callback(null);
        }
    },
    get: function (sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        callback = callback || function () { };

        sql = sql.trim();
        if (sql.startsWith('SELECT * FROM users WHERE username')) {
            callback(null, data.users.find(u => u.username === params[0]));
        } else if (sql.startsWith('SELECT username, referral_code')) {
            callback(null, data.users.find(u => u.id === params[0]));
        } else if (sql.startsWith('SELECT total_ads_viewed, balance')) {
            callback(null, data.users.find(u => u.id === params[0]));
        } else {
            callback(null, null);
        }
    }
};

console.log('Connected to the JSON mock database.');
module.exports = db;
