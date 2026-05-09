const { db, admin } = require('./firebase');

function getTodayString() {
    const now = new Date();
    // Koristi Europe/Belgrade timezone da datum bude tačan za Srbiju
    return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Belgrade' }); // Vraća YYYY-MM-DD format
}

module.exports = {
    addMessage: async (userId, username) => {
        if (!db) {
            console.warn('[STATS] Firebase db je null - poruke se NE beleže!');
            return;
        }
        try {
            const ref = db.collection('stats').doc(userId);
            const today = getTodayString();
            
            await ref.set({
                username: username,
                messages: {
                    [today]: admin.firestore.FieldValue.increment(1)
                }
            }, { merge: true });
        } catch (error) {
            console.error('[STATS ERROR] Greška pri beleženju poruke:', error.message);
        }
    },

    addVoiceTime: async (userId, username, durationMs) => {
        if (!db) {
            console.warn('[STATS] Firebase db je null - voice vreme se NE beleži!');
            return;
        }
        try {
            const ref = db.collection('stats').doc(userId);
            const today = getTodayString();
            
            await ref.set({
                username: username,
                voice: {
                    [today]: admin.firestore.FieldValue.increment(durationMs)
                }
            }, { merge: true });
        } catch (error) {
            console.error('[STATS ERROR] Greška pri beleženju voice vremena:', error.message);
        }
    },

    addPlus: async (userId, username) => {
        if (!db) return;
        const ref = db.collection('stats').doc(userId);
        await ref.set({
            username: username,
            pluses: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
    },

    addMinus: async (userId, username) => {
        if (!db) return;
        const ref = db.collection('stats').doc(userId);
        await ref.set({
            username: username,
            minuses: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
    },

    addOtkaz: async (userId, username) => {
        if (!db) return;
        const ref = db.collection('stats').doc(userId);
        await ref.set({
            username: username,
            otkazi: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
    },

    getUserStats: async (userId) => {
        if (!db) return null;
        const doc = await db.collection('stats').doc(userId).get();
        return doc.exists ? doc.data() : null;
    },

    getAllStats: async () => {
        if (!db) return {};
        const snapshot = await db.collection('stats').get();
        const users = {};
        snapshot.forEach(doc => {
            users[doc.id] = doc.data();
        });
        return users;
    },
    
    cleanOldData: async () => {
        if (!db) return;
        const snapshot = await db.collection('stats').get();
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        
        const batch = db.batch();
        let operationsCount = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            let updates = {};
            let needsUpdate = false;

            if (data.messages) {
                for (const date in data.messages) {
                    if (new Date(date) < sevenDaysAgo) {
                        updates[`messages.${date}`] = admin.firestore.FieldValue.delete();
                        needsUpdate = true;
                    }
                }
            }
            if (data.voice) {
                for (const date in data.voice) {
                    if (new Date(date) < sevenDaysAgo) {
                        updates[`voice.${date}`] = admin.firestore.FieldValue.delete();
                        needsUpdate = true;
                    }
                }
            }
            if (needsUpdate) {
                batch.update(db.collection('stats').doc(doc.id), updates);
                operationsCount++;
            }
        });

        if (operationsCount > 0) {
            await batch.commit();
        }
    }
};
