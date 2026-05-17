const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require('fs');
require('dotenv').config();

async function generateMeetingReport(audioFiles) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY nije konfigurisan.");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

    try {
        const uploadedFiles = [];
        console.log(`[Gemini] Uploadovanje ${audioFiles.length} audio fajlova...`);
        for (const file of audioFiles) {
            // Provera velicine fajla, ako je prazan preskocimo
            const stats = fs.statSync(file);
            if (stats.size < 1000) { // manje od 1KB je verovatno prazno
                console.log(`[Gemini] Preskacem fajl ${file} jer je prazan ili premali.`);
                continue;
            }

            const uploadResult = await fileManager.uploadFile(file, {
                mimeType: "audio/ogg",
                displayName: "Sastanak Audio"
            });
            uploadedFiles.push(uploadResult.file);
        }

        if (uploadedFiles.length === 0) {
            return "Nema dovoljno audio materijala za analizu sastanka (svi snimci su prazni ili prekratki).";
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Preslušaj ove audio zapise sa sastanka i napravi detaljan zapisnik/izveštaj na srpskom jeziku. 
Zapisnik treba da sadrži:
1. Glavne teme o kojima se diskutovalo.
2. Najvažnije zaključke i odluke.
3. Eventualna zaduženja za članove.
Ako je sastanak bio prekratak ili nema korisnih informacija, navedi to. 
Odgovori u lepom Markdown formatu prilagođenom za Discord (koristi bold tekst i liste). Naslov neka bude **ZAPISNIK SA SASTANKA** uz neki lep emodži.`;

        const requestContent = [
            prompt,
            ...uploadedFiles.map(file => ({
                fileData: {
                    mimeType: file.mimeType,
                    fileUri: file.uri
                }
            }))
        ];

        console.log(`[Gemini] Pokretanje generisanja izvestaja...`);
        const result = await model.generateContent(requestContent);
        const response = result.response.text();

        // Cleanup fajlova sa servera Gemini-ja
        for (const file of uploadedFiles) {
            try {
                await fileManager.deleteFile(file.name);
            } catch (e) {
                console.error("[Gemini] Greska pri brisanju fajla sa gemini-ja:", e);
            }
        }

        // Brisanje lokalnih fajlova
        for (const file of audioFiles) {
            try {
                fs.unlinkSync(file);
            } catch (e) {
                console.error("[Gemini] Greska pri brisanju lokalnog fajla:", e);
            }
        }

        return response;

    } catch (error) {
        console.error("[Gemini] Greska pri generisanju izveštaja:", error);
        throw error;
    }
}

module.exports = { generateMeetingReport };
