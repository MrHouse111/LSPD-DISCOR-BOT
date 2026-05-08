const { db } = require('./firebase');

module.exports = {
    checkIn: async (userId) => {
        if (!db) return;
        await db.collection('duty_status').doc(userId).set({
            isOnDuty: true,
            startTime: Date.now()
        }, { merge: true });
    },
    checkOut: async (userId) => {
        if (!db) return null;
        const doc = await db.collection('duty_status').doc(userId).get();
        if (doc.exists && doc.data().isOnDuty) {
            const startTime = doc.data().startTime;
            const duration = Date.now() - startTime;
            
            await db.collection('duty_status').doc(userId).update({
                isOnDuty: false,
                startTime: null
            });
            
            return duration;
        }
        return null;
    },
    isOnDuty: async (userId) => {
        if (!db) return false;
        const doc = await db.collection('duty_status').doc(userId).get();
        return doc.exists ? doc.data().isOnDuty : false;
    }
};
