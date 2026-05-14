/**
 * JEDNOKRATNA SKRIPTA ZA MIGRACIJU PODATAKA SA FIREBASE NA SQLITE
 * 
 * Ova skripta:
 * 1. Čita sve podatke iz Firebase Firestore baze (badges_system, stats, duty_status)
 * 2. Ubacuje ih u lokalnu database.sqlite bazu
 * 3. Ispisuje detaljan izveštaj o prebačenim podacima
 * 
 * UPOTREBA:
 *   1. Stavite serviceAccountKey.json u root folder bota
 *   2. Pokrenite: node scripts/migrate-firebase.js
 *   3. Nakon uspešne migracije, možete obrisati serviceAccountKey.json
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// ============================================================
// 1. POVEZIVANJE NA FIREBASE
// ============================================================

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ GREŠKA: serviceAccountKey.json nije pronađen!');
    console.error('');
    console.error('Da biste pokrenuli migraciju, potrebno je da:');
    console.error('1. Idite na https://console.firebase.google.com/');
    console.error('2. Otvorite projekat "lspd-balkan-glory-portal"');
    console.error('3. Settings (⚙️) → Project settings → Service accounts');
    console.error('4. Kliknite "Generate new private key"');
    console.error('5. Sačuvajte fajl kao: serviceAccountKey.json');
    console.error(`6. Stavite ga u: ${path.join(__dirname, '..')}`);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

// ============================================================
// 2. POVEZIVANJE NA SQLITE
// ============================================================

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

// Osiguraj da tabele postoje
db.prepare(`
    CREATE TABLE IF NOT EXISTS badges (
        badge_number INTEGER PRIMARY KEY,
        discord_id TEXT NOT NULL
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS duty_logs (
        user_id TEXT PRIMARY KEY,
        channel_id TEXT,
        start_time INTEGER NOT NULL
    )
`).run();

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

// ============================================================
// 3. MIGRACIJA
// ============================================================

async function migrate() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   FIREBASE → SQLITE MIGRACIJA PODATAKA         ║');
    console.log('║   LSPD Discord Bot                              ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    let totalMigrated = 0;

    // --------------------------------------------------------
    // 3a. ZNAČKE (badges_system/data)
    // --------------------------------------------------------
    console.log('📛 Migriram značke...');
    try {
        const badgesDoc = await firestore.collection('badges_system').doc('data').get();
        if (badgesDoc.exists) {
            const badges = badgesDoc.data();
            const badgeEntries = Object.entries(badges);

            if (badgeEntries.length > 0) {
                const insertBadge = db.prepare('INSERT OR REPLACE INTO badges (badge_number, discord_id) VALUES (?, ?)');

                const transaction = db.transaction(() => {
                    for (const [badgeNum, data] of badgeEntries) {
                        const num = parseInt(badgeNum);
                        const discordId = typeof data === 'object' ? (data.id || data.discordId || '') : data;
                        if (num && discordId) {
                            insertBadge.run(num, discordId);
                        }
                    }
                });
                transaction();

                console.log(`   ✅ Prebačeno ${badgeEntries.length} znački`);
                totalMigrated += badgeEntries.length;
            } else {
                console.log('   ⚠️  Dokument postoji ali je prazan (nema znački)');
            }
        } else {
            console.log('   ⚠️  Dokument badges_system/data ne postoji na Firebase-u');
        }
    } catch (e) {
        console.error('   ❌ Greška pri migraciji znački:', e.message);
    }

    // --------------------------------------------------------
    // 3b. LEADERBOARD CONFIG (badges_system/config)
    // --------------------------------------------------------
    console.log('⚙️  Migriram leaderboard konfiguraciju...');
    try {
        const configDoc = await firestore.collection('badges_system').doc('config').get();
        if (configDoc.exists) {
            const config = configDoc.data();
            const insertConfig = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');

            db.transaction(() => {
                if (config.channelId) {
                    insertConfig.run('leaderboard_channel_id', config.channelId);
                    console.log(`   ✅ Leaderboard kanal: ${config.channelId}`);
                }
                if (config.messageId) {
                    insertConfig.run('leaderboard_message_id', config.messageId);
                    console.log(`   ✅ Leaderboard poruka: ${config.messageId}`);
                }
            })();

            totalMigrated += 1;
        } else {
            console.log('   ⚠️  Dokument badges_system/config ne postoji');
        }
    } catch (e) {
        console.error('   ❌ Greška pri migraciji configa:', e.message);
    }

    // --------------------------------------------------------
    // 3c. STATISTIKA (stats kolekcija)
    // --------------------------------------------------------
    console.log('📊 Migriram statistiku korisnika...');
    try {
        const statsSnapshot = await firestore.collection('stats').get();
        
        if (!statsSnapshot.empty) {
            const insertStats = db.prepare(`
                INSERT OR REPLACE INTO stats (user_id, username, messages, voice, duty, pluses, minuses, otkazi)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            let statsCount = 0;

            const transaction = db.transaction(() => {
                statsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const userId = doc.id;

                    // Firebase čuva messages/voice/duty kao nested objekte: { "2026-05-10": 15, "2026-05-11": 8 }
                    const messages = data.messages || {};
                    const voice = data.voice || {};
                    const duty = data.duty || {};

                    insertStats.run(
                        userId,
                        data.username || null,
                        JSON.stringify(messages),
                        JSON.stringify(voice),
                        JSON.stringify(duty),
                        data.pluses || 0,
                        data.minuses || 0,
                        data.otkazi || 0
                    );
                    statsCount++;
                });
            });
            transaction();

            console.log(`   ✅ Prebačeno ${statsCount} korisničkih statistika`);
            totalMigrated += statsCount;

            // Ispis detaljnog rezimea po korisniku
            statsSnapshot.forEach(doc => {
                const data = doc.data();
                const msgDays = Object.keys(data.messages || {}).length;
                const voiceDays = Object.keys(data.voice || {}).length;
                const dutyDays = Object.keys(data.duty || {}).length;
                console.log(`      👤 ${data.username || doc.id}: ${msgDays} dana poruka, ${voiceDays} dana voice-a, ${dutyDays} dana dužnosti, +${data.pluses || 0}/-${data.minuses || 0}`);
            });
        } else {
            console.log('   ⚠️  Kolekcija stats je prazna');
        }
    } catch (e) {
        console.error('   ❌ Greška pri migraciji statistike:', e.message);
    }

    // --------------------------------------------------------
    // 3d. AKTIVNE DUŽNOSTI (duty_status kolekcija)
    // --------------------------------------------------------
    console.log('👮 Migriram aktivne dužnosti...');
    try {
        const dutySnapshot = await firestore.collection('duty_status').get();

        if (!dutySnapshot.empty) {
            const insertDuty = db.prepare('INSERT OR REPLACE INTO duty_logs (user_id, channel_id, start_time) VALUES (?, ?, ?)');
            let dutyCount = 0;

            const transaction = db.transaction(() => {
                dutySnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.isOnDuty) {
                        insertDuty.run(
                            doc.id,
                            data.channelId || null,
                            data.startTime || Date.now()
                        );
                        dutyCount++;
                        console.log(`      👮 ${doc.id}: na dužnosti od ${new Date(data.startTime).toLocaleString('sr-RS')}`);
                    }
                });
            });
            transaction();

            console.log(`   ✅ Prebačeno ${dutyCount} aktivnih dužnosti`);
            totalMigrated += dutyCount;
        } else {
            console.log('   ⚠️  Kolekcija duty_status je prazna (niko nije na dužnosti)');
        }
    } catch (e) {
        console.error('   ❌ Greška pri migraciji dužnosti:', e.message);
    }

    // ============================================================
    // 4. REZIME
    // ============================================================
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║                    REZIME                       ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Ukupno prebačeno zapisa: ${String(totalMigrated).padEnd(23)}║`);
    console.log(`║  Baza sačuvana u: database.sqlite                ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    if (totalMigrated > 0) {
        console.log('🎉 MIGRACIJA USPEŠNA!');
        console.log('');
        console.log('Sledeći koraci:');
        console.log('1. Pokrenite bota (node index.js) i proverite da li sve radi');
        console.log('2. Obišite serviceAccountKey.json (više vam ne treba)');
        console.log('3. Push na GitHub: git add . && git commit -m "data migration complete" && git push');
    } else {
        console.log('⚠️  Nije prebačen nijedan zapis. Proverite da li Firebase ima podatke.');
    }

    // Zatvori konekcije
    db.close();
    process.exit(0);
}

// Pokretanje
migrate().catch(err => {
    console.error('💥 Fatalna greška:', err);
    process.exit(1);
});
