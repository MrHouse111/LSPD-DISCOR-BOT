const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Prikazuje kompletno uputstvo za korišćenje LSPD Bota'),
    async execute(interaction) {
        const embeds = [];

        // --- EMBED 1: Uvod + Setup komande ---
        const embed1 = new EmbedBuilder()
            .setColor('#1a5276')
            .setTitle('📘 LSPD Support System — User Manual')
            .setDescription('Kompletno uputstvo za korišćenje LSPD Discord Bota.\nBot radi **24/7** na cloud serveru. Svi podaci se čuvaju u Firebase bazi.')
            .addFields(
                {
                    name: '⚙️ Setup Komande (Samo za Admine — koriste se JEDNOM)',
                    value: [
                        '`/setup-pravila` — Postavlja embed sa pravilnikom u kanal.',
                        '`/setup-duznost` — Postavlja panel za prijavu/odjavu dužnosti.',
                        '`/setup-licne-karte` — Postavlja panel za kreiranje ličnih karata.',
                        '`/setup-tiketi` — Postavlja panel za otvaranje tiketa (podrška).',
                        '`/setup-odsustvo` — Postavlja panel za prijavu odsustva.',
                    ].join('\n')
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
                    ].join('\n')
                },
                {
                    name: '🪪 Kreiranje Lične Karte',
                    value: [
                        '1. Klikni dugme **🪪 Kreiraj Ličnu Kartu**.',
                        '2. Popuni formu: Ime i Prezime, UUID, Steam ime.',
                        '3. Bot kreira embed ličnu kartu i dodeljuje ti rolu **Policajac**.',
                        '',
                        'Panel se automatski premešta na dno kanala.',
                    ].join('\n')
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
                    ].join('\n')
                },
                {
                    name: '✅⚠️🛑 Disciplinski Sistem (Samo Načelnici)',
                    value: [
                        '`/plus @korisnik [razlog]` — Pohvala službeniku.',
                        '`/minus @korisnik [razlog]` — Opomena službeniku.',
                        '`/otkaz @korisnik [razlog]` — Raskid ugovora.',
                        '',
                        'Sve se beleži u bazu i prikazuje u izveštaju!',
                    ].join('\n')
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
                    ].join('\n')
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
                    ].join('\n')
                }
            )
            .setFooter({ text: 'Stranica 4/4 — LSPD Support System v2.0' })
            .setTimestamp();

        embeds.push(embed1, embed2, embed3, embed4);

        await interaction.reply({ embeds: embeds, ephemeral: true });
    },
};
