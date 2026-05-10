const { db } = require('./firebase');

// In-memory map: userId -> { startTime, guildId, channelId }
const activeTimers = new Map();

const AUTO_LOGOUT_MS = 4 * 60 * 60 * 1000; // 4 hours

module.exports = {
    checkIn: async (userId, guildId, channelId) => {
        if (!db) return;
        await db.collection('duty_status').doc(userId).set({
            isOnDuty: true,
            startTime: Date.now(),
            guildId: guildId || null,
            channelId: channelId || null
        }, { merge: true });

        // Store in-memory for auto-logout tracking
        activeTimers.set(userId, { startTime: Date.now(), guildId, channelId });
    },

    checkOut: async (userId) => {
        if (!db) return null;
        const doc = await db.collection('duty_status').doc(userId).get();
        if (doc.exists && doc.data().isOnDuty) {
            const startTime = doc.data().startTime;
            const duration = Date.now() - startTime;

            await db.collection('duty_status').doc(userId).update({
                isOnDuty: false,
                startTime: null,
                guildId: null,
                channelId: null
            });

            // Remove from in-memory tracker
            activeTimers.delete(userId);

            return duration;
        }
        return null;
    },

    isOnDuty: async (userId) => {
        if (!db) return false;
        const doc = await db.collection('duty_status').doc(userId).get();
        return doc.exists ? doc.data().isOnDuty : false;
    },

    // Returns all users currently on duty from Firestore (used on bot restart)
    getActiveDuty: async () => {
        if (!db) return [];
        const snapshot = await db.collection('duty_status').where('isOnDuty', '==', true).get();
        const results = [];
        snapshot.forEach(doc => {
            results.push({ userId: doc.id, ...doc.data() });
        });
        return results;
    },

    activeTimers
};
