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

        // --- STICKY LEADERBOARD LOGIKA ---
        try {
            const { loadLeaderboardConfig, updateLeaderboard } = require('../utils/badgeLeaderboard');
            const config = loadLeaderboardConfig();
            if (config && config.channelId === message.channel.id) {
                // Ako neko pise u leaderboard kanalu, pomeri leaderboard na dno
                updateLeaderboard(message.client);
            }
        } catch (error) {
            console.error('Greška pri sticky leaderboardu:', error);
        }

        // --- 0. POMOĆ I KOMANDE (Prikaz Uputstva) ---
        const contentLower = message.content.toLowerCase().trim();
        if (contentLower === '/komande' || contentLower === '/help' || contentLower === '!komande' || contentLower === '!help') {
            const embeds = [];

            // --- EMBED 1: Uvod + Setup komande ---
            const embed1 = new EmbedBuilder()
                .setColor('#1a5276')
                .setTitle('📘 LSPD Support System — User Manual')
                .setDescription('Kompletno uputstvo za korišćenje LSPD Discord Bota.\\nBot radi **24/7** na cloud serveru. Svi podaci se čuvaju u lokalnoj bazi.')
                .addFields(
                    {
                        name: '⚙️ Setup Komande (Samo za Admine — koriste se JEDNOM)',
                        value: [
                            '`/setup-pravila` — Postavlja embed sa pravilnikom u kanal.',
                            '`/setup-duznost` — Postavlja panel za prijavu/odjavu dužnosti.',
                            '`/setup-licne-karte` — Postavlja panel za kreiranje ličnih karata.',
                            '`/setup-tiketi` — Postavlja panel za otvaranje tiketa (podrška).',
                            '`/setup-odsustvo` — Postavlja panel za prijavu odsustva.',
                        ].join('\\n')
                    },
                )
                .setFooter({ text: 'Stranica 1/4 — Setup komande' });

            // --- EMBED 2: Dužnost + Lične Karte ---
            const embed2 = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('👮 Sistem Dužnosti & 🪪 Lične Karte')
                .addFields(
                    {
                        name: '👮 Sistem Dužnosti',
                        value: [
                            '🟢 **Prijava na dužnost** — Klikni dugme, bot beleži vreme.',
                            '🔴 **Odjava sa dužnosti** — Klikni dugme, bot prikazuje koliko si bio na dužnosti.',
                            '',
                            'Panel se automatski premešta na dno kanala.',
                        ].join('\\n')
                    },
                    {
                        name: '🪪 Kreiranje Lične Karte',
                        value: [
                            '1. Klikni dugme **🪪 Kreiraj Ličnu Kartu**.',
                            '2. Popuni formu: Ime i Prezime, UUID, Steam ime.',
                            '3. Bot kreira embed ličnu kartu i dodeljuje ti rolu **Policajac**.',
                            '',
                            'Panel se automatski premešta na dno kanala.',
                        ].join('\\n')
                    }
                )
                .setFooter({ text: 'Stranica 2/4 — Dužnost & Lične Karte' });

            // --- EMBED 3: Značke + Plus/Minus/Otkaz ---
            const embed3 = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🏅 Značke & ✅ Plus / ⚠️ Minus / 🛑 Otkaz')
                .addFields(
                    {
                        name: '🏅 Značke (Samo Načelnici)',
                        value: [
                            '`/znacka @korisnik` — Dodeljuje sledeći slobodan broj značke.',
                            '`/izmeni-znacku @korisnik [broj]` — Ručno menja broj značke.',
                        ].join('\\n')
                    },
                    {
                        name: '✅⚠️🛑 Disciplinski Sistem (Samo Načelnici)',
                        value: [
                            '`/plus @korisnik [razlog]` — Pohvala službeniku.',
                            '`/minus @korisnik [razlog]` — Opomena službeniku.',
                            '`/otkaz @korisnik [razlog]` — Raskid ugovora.',
                            '',
                            'Sve se beleži u bazu i prikazuje u izveštaju!',
                        ].join('\\n')
                    },
                )
                .setFooter({ text: 'Stranica 3/4 — Značke & Disciplina' });

            // --- EMBED 4: Izveštaj + Voice + Tiketi + Odsustvo ---
            const embed4 = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('📊 Izveštaj & 🎫 Tiketi & 📄 Odsustvo')
                .addFields(
                    {
                        name: '📊 Nedeljni Izveštaj (Samo Načelnici)',
                        value: [
                            '`/izvestaj` — Generiše pregled aktivnosti cele ekipe za 7 dana.',
                            '🏆 Najaktivniji | ⚠️ Najmanje aktivni | 👻 Neaktivni',
                            'Prikazuje: poruke, voice vreme, pluseve i minuse.',
                        ].join('\\n')
                    },
                    {
                        name: '🎙️ Voice Praćenje',
                        value: 'Bot **automatski** prati vreme provedeno u glasovnim kanalima. Nije potrebna nikakva komanda.'
                    },
                    {
                        name: '🎫 Tiketi',
                        value: 'Klikni **📩 Otvori Tiket** — Bot kreira privatni kanal za komunikaciju sa Načelnicima.'
                    },
                    {
                        name: '📄 Odsustvo',
                        value: 'Klikni dugme za odsustvo — Popuni formu sa činom, periodom i razlogom.'
                    },
                    {
                        name: '🔐 Ko šta može',
                        value: [
                            '**Svi službenici:** Dužnost, Lična karta, Tiketi, Odsustvo',
                            '**Načelnici (Director/Zamenik):** Značke, Plus/Minus/Otkaz, Izveštaj',
                            '**Administratori:** Setup komande + sve ostalo',
                        ].join('\\n')
                    }
                )
                .setFooter({ text: 'Stranica 4/4 — LSPD Support System v2.0' })
                .setTimestamp();

            embeds.push(embed1, embed2, embed3, embed4);

            try {
                await message.reply({ embeds: embeds });
            } catch (error) {
                console.error('Greška pri slanju komandi u DM/chat:', error);
            }
            return;
        }

        // --- PRAĆENJE PORUKA U BAZI ---
        statsStore.addMessage(message.author.id, message.author.username);

        // --- MODERACIJA UGAŠENA (čeka odobrenje načelnika) ---
        /*
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

                await message.channel.send(`**Cenzurisano | ${message.author.username}:** ${censoredContent}`);

                let warnings = warningsMap.get(message.author.id) || { count: 0, lastWarning: 0 };
                const now = Date.now();
                
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
                        warningsMap.delete(message.author.id);
                    } catch (err) {
                        console.log('Greska pri mutiranju (verovatno nedostatak permisija):', err);
                        await message.channel.send(`⚠️ <@${message.author.id}> je dostigao 3 upozorenja, ali bot nema dozvolu za mutiranje (Timeout).`);
                        warnings.count = 0;
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
            return;
        }

        // --- 2. ANTI-SPAM SISTEM ---
        const now = Date.now();
        const userTimestamps = spamMap.get(message.author.id) || [];
        
        const recentTimestamps = userTimestamps.filter(timestamp => now - timestamp < SPAM_TIME);
        recentTimestamps.push(now);

        spamMap.set(message.author.id, recentTimestamps);

        if (recentTimestamps.length >= SPAM_LIMIT) {
            try {
                await message.delete();
                
                const warningMsg = await message.channel.send(`🛑 <@${message.author.id}>, prekinite sa spamovanjem kanala!`);
                
                spamMap.delete(message.author.id);

                setTimeout(() => {
                    warningMsg.delete().catch(() => {});
                }, 5000);
            } catch (error) {
                console.log('Greška pri brisanju spam poruke:', error);
            }
        }
        */

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
