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

    // Zaštitni sistem: Automatsko obnavljanje 33 početne značke ukoliko je baza prazna (nakon restarta/brisanja fajla)
    const badgeCount = db.prepare('SELECT COUNT(*) as count FROM badges').get().count;
    if (badgeCount === 0) {
        const defaultBadges = [
            "706638651899248691", "1214015596811780137", "759857240214863952", "1349823084403621980", 
            "1153631574210912356", "796079568784064562", "1294308142946979885", "1340094745111957526", 
            "447660960228835330", "1413806980467916893", "1309920013838192681", "1340419848986951742", 
            "1270529269411610676", "1493959146909859992", "1372999484237287524", "1233046667842945076", 
            "1322243456717815814", "1164872816890495087", "713009414231031888", "566263172722327572", 
            "764510136999870494", "1474500772413837362", "915212693156290560", "919284383721091173", 
            "1039641018338902036", "1479110612905758863", "919528800813973604", "1045081148134539395", 
            "417406507475402770", "1198300083276496962", "702263553301807206", "1273606049949028393", 
            "1246858089521483807"
        ];
        const insertStmt = db.prepare('INSERT INTO badges (badge_number, discord_id) VALUES (?, ?)');
        const transaction = db.transaction(() => {
            defaultBadges.forEach((id, index) => {
                insertStmt.run(index + 1, id);
            });
        });
        transaction();
        console.log('[ZAŠTITNI SISTEM] Baza znački je bila prazna. Uspešno upisane 33 stare značke u memoriju.');
    }
}

initDB();

module.exports = db;
