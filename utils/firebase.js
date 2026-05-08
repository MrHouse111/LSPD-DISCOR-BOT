const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;

try {
    let serviceAccount;

    // Prvo pokušavamo da očitamo iz ENV varijable (za Render/Railway deployment)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        // Ako nema ENV, tražimo fajl (za lokalno pokretanje/testiranje)
        const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
        if (!fs.existsSync(serviceAccountPath)) {
            throw new Error("serviceAccountKey.json nije pronađen niti je podešena FIREBASE_SERVICE_ACCOUNT env varijabla.");
        }
        serviceAccount = require(serviceAccountPath);
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log("✅ [FIREBASE] Uspešno povezan sa Firestore bazom!");
} catch (e) {
    console.error("⚠️ [FIREBASE ERROR] Došlo je do greške pri inicijalizaciji:", e.message);
    console.error("⚠️ Podaci se neće ispravno čuvati. Bot mora imati ove podatke za pristup bazi.");
}

module.exports = { admin, db };
