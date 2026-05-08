const { Events, EmbedBuilder } = require('discord.js');
const statsStore = require('../utils/statsStore');

// Jednostavna crna lista (ovo se može proširiti po potrebi)
const forbiddenWords = ['jebem', 'kurac', 'sranje', 'pizda', 'picka', 'govno'];

// Mapa za praćenje spama: ključ je ID korisnika, vrednost je niz vremenskih oznaka (timestamps)
const spamMap = new Map();
const SPAM_LIMIT = 5; // broj poruka
const SPAM_TIME = 5000; // vremenski prozor u milisekundama (5 sekundi)

const warningsMap = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignoriši poruke od botova (štiti od beskonačnih petlji)
        if (message.author.bot) return;

        // --- PRAĆENJE PORUKA U BAZI ---
        statsStore.addMessage(message.author.id, message.author.username);

        const content = message.content.toLowerCase();

        // --- 1. FILTER PSOVKI ---
        const containsForbidden = forbiddenWords.some(word => content.includes(word));
        if (containsForbidden) {
            try {
                await message.delete();
                
                let censoredContent = message.content;
                forbiddenWords.forEach(word => {
                    const regex = new RegExp(word, 'gi');
                    censoredContent = censoredContent.replace(regex, '*'.repeat(word.length));
                });

                // Cenzurisana poruka
                await message.channel.send(`**Cenzurisano | ${message.author.username}:** ${censoredContent}`);

                // Upozorenja i mutiranje
                let warnings = warningsMap.get(message.author.id) || { count: 0, lastWarning: 0 };
                const now = Date.now();
                
                // Resetovanje ako je proslo 1h (3600000 ms)
                if (now - warnings.lastWarning > 3600000) {
                    warnings.count = 0;
                }

                warnings.count += 1;
                warnings.lastWarning = now;
                warningsMap.set(message.author.id, warnings);

                if (warnings.count >= 3) {
                    try {
                        await message.member.timeout(15 * 60 * 1000, "3 upozorenja zbog psovki");
                        await message.channel.send(`🛑 <@${message.author.id}> je mutiran na 15 minuta zbog ponavljanja psovki (3 upozorenja).`);
                        warningsMap.delete(message.author.id); // Reset upozorenja posle mutiranja
                    } catch (err) {
                        console.log('Greska pri mutiranju (verovatno nedostatak permisija):', err);
                        await message.channel.send(`⚠️ <@${message.author.id}> je dostigao 3 upozorenja, ali bot nema dozvolu za mutiranje (Timeout).`);
                        warnings.count = 0; // Reset da bi se ponovo racunalo
                        warningsMap.set(message.author.id, warnings);
                    }
                } else {
                    const warningMsg = await message.channel.send(`⚠️ <@${message.author.id}>, pazite na rečnik! Imate ${warnings.count}/3 upozorenja.`);
                    setTimeout(() => {
                        warningMsg.delete().catch(() => {});
                    }, 5000);
                }
            } catch (error) {
                console.log('Greška pri obradi psovki:', error);
            }
            return; // Prekidamo dalje procesiranje za ovu poruku
        }

        // --- 2. ANTI-SPAM SISTEM ---
        const now = Date.now();
        const userTimestamps = spamMap.get(message.author.id) || [];
        
        // Zadrži samo poruke poslate unutar vremenskog prozora (zadnjih 5 sekundi)
        const recentTimestamps = userTimestamps.filter(timestamp => now - timestamp < SPAM_TIME);
        recentTimestamps.push(now);

        spamMap.set(message.author.id, recentTimestamps);

        if (recentTimestamps.length >= SPAM_LIMIT) {
            try {
                // Obriši poslednju poruku iz spama
                await message.delete();
                
                const warningMsg = await message.channel.send(`🛑 <@${message.author.id}>, prekinite sa spamovanjem kanala!`);
                
                // Resetujemo brojač za ovog korisnika da ne bi spamovao upozorenja
                spamMap.delete(message.author.id);

                // Obriši upozorenje nakon 5 sekundi
                setTimeout(() => {
                    warningMsg.delete().catch(() => {});
                }, 5000);
            } catch (error) {
                console.log('Greška pri brisanju spam poruke:', error);
            }
        }

        // --- 3. AI DISPEČER (Privremeno ugašeno) ---
        /*
        if (message.mentions.has(message.client.user)) {
            const aiPrompt = message.content.replace(`<@${message.client.user.id}>`, '').trim();
            if (aiPrompt.length > 0) {
                try {
                    await message.channel.sendTyping();
                    const { GoogleGenerativeAI } = require('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const model = genAI.getGenerativeModel({ 
                        model: "gemini-1.5-flash",
                        systemInstruction: "Ti si profesionalni LSPD dispečer na roleplay serveru. Tvoje ime je LSPD Bot. Odgovaraj kratko, jasno, uvek profesionalno i u duhu policijskog roleplay-a. Pomaži građanima i kolegama policajcima dajući savete i kratke odgovore. Zadrži roleplay karakter u svakom trenutku. Koristi policijske kodove kada je prikladno (npr. 10-4 za potvrdu)."
                    });
                    
                    const result = await model.generateContent(aiPrompt);
                    let responseText = result.response.text();
                    
                    // Discord ima limit od 2000 karaktera po poruci
                    if (responseText.length > 2000) {
                        responseText = responseText.substring(0, 1997) + '...';
                    }
                    
                    await message.reply(responseText);
                } catch (error) {
                    console.error("Gemini API Error:", error);
                    await message.reply("Trenutno imam smetnje na vezi. Molim pokušajte ponovo kasnije.");
                }
            }
        }
        */
        // --- 4. AUTO-LICNE KARTE SISTEM ---
        // Ako poruka sadrži format lične karte, prebaci u Embed i daj rolu
        const cleanMessage = message.content.replace(/\*\*/g, '');
        const matchLicna = cleanMessage.match(/Ime na li[cč]noj:\s*([^\n]+)/i);
        const matchSteam = cleanMessage.match(/Ime na steam(?:-u|u)?:\s*([^\n]+)/i);
        const matchUuid = cleanMessage.match(/UUID:\s*([^\n]+)/i);

        if (matchLicna && matchSteam && matchUuid) {
            try {
                const imeNaLicnoj = matchLicna[1].trim();
                const imeNaSteam = matchSteam[1].trim();
                const uuid = matchUuid[1].trim();

                const idEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('👮 LSPD Lična Karta')
                    .setThumbnail(message.author.displayAvatarURL())
                    .addFields(
                        { name: 'Službenik', value: `<@${message.author.id}>`, inline: false },
                        { name: 'Ime na ličnoj', value: imeNaLicnoj, inline: true },
                        { name: 'Ime na Steam-u', value: imeNaSteam, inline: true },
                        { name: 'UUID', value: uuid, inline: true }
                    )
                    .setFooter({ text: 'Automatski kreirana evidencija' })
                    .setTimestamp();

                // Dodavanje role 'Policajac'
                const policajacRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'policajac');
                if (policajacRole) {
                    await message.member.roles.add(policajacRole).catch(console.error);
                }

                // Posalji novu poruku i obrisi staru
                await message.channel.send({ content: `<@${message.author.id}>`, embeds: [idEmbed] });
                await message.delete().catch(console.error);
                
                return; // Kraj obrade za ovu poruku
            } catch (error) {
                console.error('Greška pri auto-konverziji lične karte:', error);
            }
        }
    },
};
