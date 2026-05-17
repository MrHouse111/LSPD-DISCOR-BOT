const Database = require('better-sqlite3');
const path = require('node:path');

// Kreira database.sqlite fajl u glavnom direktorijumu bota
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

// Inicijalizacija tabela ako ne postoje
function initDB() {
    // Tabela za značke (broj značke i ID korisnika koji je nosi)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS badges (
            badge_number INTEGER PRIMARY KEY,
            discord_id TEXT NOT NULL
        )
    `).run();

    // Tabela za konfiguracije (npr. gde je leaderboard poruka)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `).run();

    // Tabela za praćenje trenutno aktivnih dužnosti
    db.prepare(`
        CREATE TABLE IF NOT EXISTS duty_logs (
            user_id TEXT PRIMARY KEY,
            channel_id TEXT,
            start_time INTEGER NOT NULL
        )
    `).run();

    // Tabela za statistiku (uključujući poruke, voice, duty po danima kao JSON i countere)
    db.prepare(`
        CREATE TABLE IF NOT EXISTS stats (
            user_id TEXT PRIMARY KEY,
            username TEXT,
            messages TEXT DEFAULT '{}',
            voice TEXT DEFAULT '{}',
            duty TEXT DEFAULT '{}',
            pluses INTEGER DEFAULT 0,
            minuses INTEGER DEFAULT 0,
            otkazi INTEGER DEFAULT 0
        )
    `).run();

    try {
        db.prepare('ALTER TABLE stats ADD COLUMN duty_cancellations INTEGER DEFAULT 0').run();
    } catch (e) {
        // Ignoriši grešku ako kolona već postoji
    }
}

initDB();

module.exports = db;
