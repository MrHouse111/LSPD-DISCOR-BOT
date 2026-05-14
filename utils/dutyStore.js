const db = require('./database');

// In-memory map se više ne koristi za bazu, 
// ali se ostavlja zbog kompatibilnosti ako neki stari kod proverava ovo
const activeTimers = new Map();

module.exports = {
    checkIn: async (userId, guildId, channelId) => {
        try {
            const stmt = db.prepare('INSERT OR REPLACE INTO duty_logs (user_id, channel_id, start_time) VALUES (?, ?, ?)');
            stmt.run(userId, channelId || null, Date.now());
            
            // Kompatibilnost sa auto-logout proverama u index.js
            activeTimers.set(userId, { startTime: Date.now(), guildId, channelId });
        } catch (e) {
            console.error('[SQLITE ERROR] checkIn:', e);
        }
    },

    checkOut: async (userId) => {
        try {
            const row = db.prepare('SELECT start_time FROM duty_logs WHERE user_id = ?').get(userId);
            if (row) {
                const duration = Date.now() - row.start_time;
                db.prepare('DELETE FROM duty_logs WHERE user_id = ?').run(userId);
                activeTimers.delete(userId);
                return duration;
            }
            return null;
        } catch (e) {
            console.error('[SQLITE ERROR] checkOut:', e);
            return null;
        }
    },

    isOnDuty: async (userId) => {
        try {
            const row = db.prepare('SELECT user_id FROM duty_logs WHERE user_id = ?').get(userId);
            return !!row;
        } catch (e) {
            console.error('[SQLITE ERROR] isOnDuty:', e);
            return false;
        }
    },

    getActiveDuty: async () => {
        try {
            const rows = db.prepare('SELECT * FROM duty_logs').all();
            return rows.map(r => ({
                userId: r.user_id,
                channelId: r.channel_id,
                startTime: r.start_time,
                isOnDuty: true
            }));
        } catch (e) {
            console.error('[SQLITE ERROR] getActiveDuty:', e);
            return [];
        }
    },

    activeTimers
};
