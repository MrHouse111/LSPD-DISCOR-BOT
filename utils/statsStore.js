const db = require('./database');

function getTodayString() {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Belgrade' }); 
}

// Pomoćna funkcija koja učitava JSON, dodaje vrednost, i vraća JSON
function updateDailyStat(jsonStr, dateStr, incrementAmount) {
    let data = {};
    try {
        if (jsonStr) data = JSON.parse(jsonStr);
    } catch (e) {}
    
    data[dateStr] = (data[dateStr] || 0) + incrementAmount;
    return JSON.stringify(data);
}

module.exports = {
    addMessage: async (userId, username) => {
        try {
            db.prepare('INSERT OR IGNORE INTO stats (user_id, username) VALUES (?, ?)').run(userId, username);
            const row = db.prepare('SELECT messages FROM stats WHERE user_id = ?').get(userId);
            const newMessages = updateDailyStat(row.messages, getTodayString(), 1);
            db.prepare('UPDATE stats SET messages = ?, username = ? WHERE user_id = ?').run(newMessages, username, userId);
        } catch (e) {
            console.error('[SQLITE ERROR] addMessage:', e);
        }
    },

    addVoiceTime: async (userId, username, durationMs) => {
        try {
            db.prepare('INSERT OR IGNORE INTO stats (user_id, username) VALUES (?, ?)').run(userId, username);
            const row = db.prepare('SELECT voice FROM stats WHERE user_id = ?').get(userId);
            const newVoice = updateDailyStat(row.voice, getTodayString(), durationMs);
            db.prepare('UPDATE stats SET voice = ?, username = ? WHERE user_id = ?').run(newVoice, username, userId);
        } catch (e) {
            console.error('[SQLITE ERROR] addVoiceTime:', e);
        }
    },

    addDutyTime: async (userId, username, durationMs) => {
        try {
            db.prepare('INSERT OR IGNORE INTO stats (user_id, username) VALUES (?, ?)').run(userId, username);
            const row = db.prepare('SELECT duty FROM stats WHERE user_id = ?').get(userId);
            const newDuty = updateDailyStat(row.duty, getTodayString(), durationMs);
            db.prepare('UPDATE stats SET duty = ?, username = ? WHERE user_id = ?').run(newDuty, username, userId);
        } catch (e) {
            console.error('[SQLITE ERROR] addDutyTime:', e);
        }
    },

    addPlus: async (userId, username) => {
        try {
            db.prepare('INSERT OR IGNORE INTO stats (user_id, username) VALUES (?, ?)').run(userId, username);
            db.prepare('UPDATE stats SET pluses = pluses + 1, username = ? WHERE user_id = ?').run(username, userId);
        } catch (e) {
            console.error('[SQLITE ERROR] addPlus:', e);
        }
    },

    addMinus: async (userId, username) => {
        try {
            db.prepare('INSERT OR IGNORE INTO stats (user_id, username) VALUES (?, ?)').run(userId, username);
            db.prepare('UPDATE stats SET minuses = minuses + 1, username = ? WHERE user_id = ?').run(username, userId);
        } catch (e) {
            console.error('[SQLITE ERROR] addMinus:', e);
        }
    },

    addOtkaz: async (userId, username) => {
        try {
            db.prepare('INSERT OR IGNORE INTO stats (user_id, username) VALUES (?, ?)').run(userId, username);
            db.prepare('UPDATE stats SET otkazi = otkazi + 1, username = ? WHERE user_id = ?').run(username, userId);
        } catch (e) {
            console.error('[SQLITE ERROR] addOtkaz:', e);
        }
    },

    addDutyCancellation: async (userId, username) => {
        try {
            db.prepare('INSERT OR IGNORE INTO stats (user_id, username) VALUES (?, ?)').run(userId, username);
            db.prepare('UPDATE stats SET duty_cancellations = duty_cancellations + 1, username = ? WHERE user_id = ?').run(username, userId);
        } catch (e) {
            console.error('[SQLITE ERROR] addDutyCancellation:', e);
        }
    },

    getUserStats: async (userId) => {
        try {
            const row = db.prepare('SELECT * FROM stats WHERE user_id = ?').get(userId);
            if (!row) return null;
            return {
                username: row.username,
                messages: JSON.parse(row.messages || '{}'),
                voice: JSON.parse(row.voice || '{}'),
                duty: JSON.parse(row.duty || '{}'),
                pluses: row.pluses,
                minuses: row.minuses,
                otkazi: row.otkazi,
                duty_cancellations: row.duty_cancellations || 0
            };
        } catch (e) {
            console.error('[SQLITE ERROR] getUserStats:', e);
            return null;
        }
    },

    getAllStats: async () => {
        try {
            const rows = db.prepare('SELECT * FROM stats').all();
            const users = {};
            for (const row of rows) {
                users[row.user_id] = {
                    username: row.username,
                    messages: JSON.parse(row.messages || '{}'),
                    voice: JSON.parse(row.voice || '{}'),
                    duty: JSON.parse(row.duty || '{}'),
                    pluses: row.pluses,
                    minuses: row.minuses,
                    otkazi: row.otkazi,
                    duty_cancellations: row.duty_cancellations || 0
                };
            }
            return users;
        } catch (e) {
            console.error('[SQLITE ERROR] getAllStats:', e);
            return {};
        }
    },
    
    cleanOldData: async () => {
        try {
            const rows = db.prepare('SELECT user_id, messages, voice, duty FROM stats').all();
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            
            const updateStmt = db.prepare('UPDATE stats SET messages = ?, voice = ?, duty = ? WHERE user_id = ?');
            
            db.transaction(() => {
                for (const row of rows) {
                    let changed = false;
                    const msgs = JSON.parse(row.messages || '{}');
                    const voice = JSON.parse(row.voice || '{}');
                    const duty = JSON.parse(row.duty || '{}');

                    for (const date in msgs) {
                        if (new Date(date) < sevenDaysAgo) { delete msgs[date]; changed = true; }
                    }
                    for (const date in voice) {
                        if (new Date(date) < sevenDaysAgo) { delete voice[date]; changed = true; }
                    }
                    for (const date in duty) {
                        if (new Date(date) < sevenDaysAgo) { delete duty[date]; changed = true; }
                    }

                    if (changed) {
                        updateStmt.run(JSON.stringify(msgs), JSON.stringify(voice), JSON.stringify(duty), row.user_id);
                    }
                }
            })();
        } catch (e) {
            console.error('[SQLITE ERROR] cleanOldData:', e);
        }
    }
};
