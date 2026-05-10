/**
 * Skripta za jednokratni unos historijskih podataka o dužnosti (3-8. maj 2026)
 * 
 * POKRETANJE: node scripts/import-historical-duty.js
 * 
 * Ova skripta dodaje sume sati iz ručno pisanih logova direktno u
 * nedeljni duty balans svakog korisnika u Firestore.
 * 
 * NAPOMENA: Korisnici su mapirani po Discord nadimcima.
 * Popuni Discord ID-jeve za svakog korisnika pre pokretanja!
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { db, admin } = require('../utils/firebase');

// ======================================================
// MAPA KORISNIKA: Discord nadimak → { id, minutesToAdd }
// Popuni Discord ID-jeve!
// minutesToAdd = ukupni sati iz ručnih logova u minutama
// ======================================================
const HISTORICAL_DATA = [
    // Format: { discordId: 'DISCORD_ID_OVDE', username: 'ime', minutes: UKUPNO_MINUTA }
    
    // Mane Blaze (CNS I) - 6h = 360 min (3. maj)
    { discordId: 'POPUNI_ID', username: 'Mane Blaze', minutes: 360 },

    // MIHA_BONANZ - 1h 2min = 62 min (3. maj)
    { discordId: 'POPUNI_ID', username: 'MIHA_BONANZ', minutes: 62 },

    // Amkoo - 3h + 1h + 4h + 2h + 1h + 3h21m + 3h30m + 6h27m + 1h10m + 7h + 3h42m + 4h20m = ukupno
    // 3. maj: 3h = 180
    // 4. maj: 1h+4h+2h+1h = 480 min
    // 5. maj: 3h21m+3h30m = 411 min
    // 6. maj: 6h27m+1h10m = 457 min
    // 7. maj: 7h = 420 min
    // 8. maj: 3h42m+4h20m = 222 min  → Total: 2170 min
    { discordId: 'POPUNI_ID', username: 'Amkoo', minutes: 2170 },

    // xxgoldxx - 20min + 4h + 1h24m + 1h11m = 20+240+84+71 = 415 min
    { discordId: 'POPUNI_ID', username: 'xxgoldxx', minutes: 415 },

    // Nella - 3h30m = 210 min
    { discordId: 'POPUNI_ID', username: 'Nella', minutes: 210 },

    // Andrejj - 1h50m + 1h30m + 2h13m + 1h40m + 0h15m (procena za unos bez ukupnog) + 1h50m + 1h35m = 
    // 110+90+133+100+15+110+95 = 653 min
    { discordId: 'POPUNI_ID', username: 'Andrejj', minutes: 653 },

    // petar - 1h49m + 1h10m + 52m + 1h17m + 3h30m + 2h5m + 54m = 
    // 109+70+52+77+210+125+54 = 697 min
    { discordId: 'POPUNI_ID', username: 'petar', minutes: 697 },

    // §†∆₪∑ (GLRP) - 1h50m + 20m = 110+20 = 130 min
    { discordId: 'POPUNI_ID', username: '§†∆₪∑', minutes: 130 },

    // Aki - 1h + 0 (nije upisao izlaz) = 60 min (uzimamo samo evidentirani sat)
    { discordId: 'POPUNI_ID', username: 'Aki', minutes: 60 },

    // Policajac Ivica - 1h53m + 55m = 113+55 = 168 min
    { discordId: 'POPUNI_ID', username: 'Policajac Ivica', minutes: 168 },

    // baki - 2h30m + 5h30m = 150+330 = 480 min
    { discordId: 'POPUNI_ID', username: 'baki', minutes: 480 },

    // Conka - 1h (procena) + 4h30m + 0 (nije upisao) = 60+270 = 330 min
    { discordId: 'POPUNI_ID', username: 'Conka', minutes: 330 },

    // KaleUbicca - 31min + 2h10m(=130m) + 1h39m(=99m) = 260 min
    { discordId: 'POPUNI_ID', username: 'KaleUbicca', minutes: 260 },

    // kecjaa - 2h10m + 1h10m + 2h8m = 130+70+128 = 328 min
    { discordId: 'POPUNI_ID', username: 'kecjaa', minutes: 328 },

    // Arma75 - 1h + 2h30m + 3h20m + 1h3m = 60+150+200+63 = 473 min
    { discordId: 'POPUNI_ID', username: 'Arma75', minutes: 473 },

    // Brene - 2h35m + 2h = 155+120 = 275 min
    { discordId: 'POPUNI_ID', username: 'Brene', minutes: 275 },

    // Professor - 7h + 2h + 2h40m = 420+120+160 = 700 min
    { discordId: 'POPUNI_ID', username: 'Professor', minutes: 700 },
];

async function importHistoricalDuty() {
    if (!db) {
        console.error('[IMPORT] Firebase nije inicijalizovan! Proveri .env fajl.');
        process.exit(1);
    }

    // Koristimo datum 2026-05-06 kao sredinu perioda za upis u stats
    const targetDate = '2026-05-06';
    
    console.log('[IMPORT] Početak unosa historijskih dužnosti...');
    console.log(`[IMPORT] Datum koji se koristi: ${targetDate}`);
    console.log('');

    let successCount = 0;
    let skipCount = 0;

    for (const entry of HISTORICAL_DATA) {
        if (!entry.discordId || entry.discordId === 'POPUNI_ID') {
            console.warn(`[SKIP] ${entry.username} — Discord ID nije unet, preskačemo!`);
            skipCount++;
            continue;
        }

        const durationMs = entry.minutes * 60 * 1000;
        
        try {
            const ref = db.collection('stats').doc(entry.discordId);
            await ref.set({
                username: entry.username,
                duty: {
                    [targetDate]: admin.firestore.FieldValue.increment(durationMs)
                }
            }, { merge: true });
            
            const h = Math.floor(entry.minutes / 60);
            const m = entry.minutes % 60;
            console.log(`[OK] ${entry.username} (${entry.discordId}) → +${h}h ${m}m`);
            successCount++;
        } catch (err) {
            console.error(`[ERROR] ${entry.username}: ${err.message}`);
        }
    }

    console.log('');
    console.log(`[IMPORT] Završeno! ${successCount} uneseno, ${skipCount} preskočeno.`);
    console.log('[IMPORT] Upisani podaci će se pojaviti u /izvestaj.');
    process.exit(0);
}

importHistoricalDuty();
