const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const statsStore = require('../utils/statsStore');
const { db } = require('../utils/firebase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('izvestaj')
        .setDescription('Generiše nedeljni izveštaj aktivnosti cele LSPD ekipe (Samo za Načelnike)'),
    async execute(interaction) {
        const hasRole = interaction.member.roles.cache.some(role => ['director', 'zamenik nacelnika'].includes(role.name.toLowerCase()));
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Nemate dozvolu! Ovu komandu mogu koristiti samo načelnici.', ephemeral: true });
        }

        await interaction.deferReply(); 

        // Dijagnostika - proveri Firebase konekciju
        const firebaseConnected = db !== null;
        console.log(`[IZVESTAJ] Firebase konekcija: ${firebaseConnected ? 'POVEZAN ✅' : 'NIJE POVEZAN ❌'}`);

        await statsStore.cleanOldData();

        const allStats = await statsStore.getAllStats();
        const statsKeys = Object.keys(allStats);
        console.log(`[IZVESTAJ] Broj korisnika u stats kolekciji: ${statsKeys.length}`);
        if (statsKeys.length > 0) {
            // Loguj primer prvog korisnika za dijagnostiku
            const firstKey = statsKeys[0];
            console.log(`[IZVESTAJ] Primer podataka (${firstKey}):`, JSON.stringify(allStats[firstKey]).substring(0, 200));
        }

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        let members;
        try {
            members = await interaction.guild.members.fetch();
        } catch (error) {
            console.error('Greška pri dohvatanju članova:', error);
            return interaction.editReply('❌ Došlo je do greške pri dohvatanju članova servera.');
        }

        const userActivity = [];

        members.forEach(member => {
            if (member.user.bot) return; 

            let messageCount = 0;
            let voiceMs = 0;
            const userStats = allStats[member.user.id];

            if (userStats) {
                // Novi način: userStats.messages je objekat
                if (userStats.messages && typeof userStats.messages === 'object') {
                    for (const [dateStr, count] of Object.entries(userStats.messages)) {
                        const msgDate = new Date(dateStr);
                        if (msgDate >= sevenDaysAgo) {
                            messageCount += count;
                        }
                    }
                }
                
                // Novi način: userStats.voice je objekat
                if (userStats.voice && typeof userStats.voice === 'object') {
                    for (const [dateStr, durationMs] of Object.entries(userStats.voice)) {
                        const msgDate = new Date(dateStr);
                        if (msgDate >= sevenDaysAgo) {
                            voiceMs += durationMs;
                        }
                    }
                }

                // Stari način: literalni ključevi "messages.YYYY-MM-DD" u root-u
                for (const [key, value] of Object.entries(userStats)) {
                    if (key.startsWith('messages.')) {
                        const dateStr = key.substring(9);
                        const msgDate = new Date(dateStr);
                        if (msgDate >= sevenDaysAgo) {
                            messageCount += value;
                        }
                    } else if (key.startsWith('voice.')) {
                        const dateStr = key.substring(6);
                        const msgDate = new Date(dateStr);
                        if (msgDate >= sevenDaysAgo) {
                            voiceMs += value;
                        }
                    }
                }
            }
            
            const voiceMinutes = Math.floor(voiceMs / 60000);
            const voiceHours = Math.floor(voiceMinutes / 60);
            const voiceMinsRemainder = voiceMinutes % 60;
            const voiceString = `${voiceHours}h ${voiceMinsRemainder}m`;

            userActivity.push({
                id: member.user.id,
                username: member.user.username,
                displayName: member.displayName,
                messageCount: messageCount,
                voiceMs: voiceMs,
                voiceString: voiceString,
                pluses: userStats ? (userStats.pluses || 0) : 0,
                minuses: userStats ? (userStats.minuses || 0) : 0
            });
        });

        userActivity.sort((a, b) => b.messageCount - a.messageCount);

        const topActive = userActivity.slice(0, 10);
        const leastActive = userActivity.filter(u => u.messageCount > 0 || u.voiceMs > 0).reverse().slice(0, 10);
        const inactive = userActivity.filter(u => u.messageCount === 0 && u.voiceMs === 0);

        let topText = topActive.map((u, i) => `${i + 1}. <@${u.id}> - ${u.messageCount} poruka | 🎙️ ${u.voiceString} (Plus: ${u.pluses}, Minus: ${u.minuses})`).join('\n') || 'Nema podataka';
        let leastText = leastActive.map((u, i) => `${i + 1}. <@${u.id}> - ${u.messageCount} poruka | 🎙️ ${u.voiceString}`).join('\n') || 'Nema podataka';

        // Dijagnostička informacija
        const diagText = `🔧 Firebase: ${firebaseConnected ? '✅ Povezan' : '❌ Nije povezan'} | Zapisi u bazi: **${statsKeys.length}** | Članova na serveru: **${userActivity.length}**`;

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📊 LSPD Nedeljni Izveštaj Aktivnosti (Poslednjih 7 dana)')
            .addFields(
                { name: '🏆 Najaktivniji', value: topText, inline: false },
                { name: '⚠️ Najmanje aktivni (a da su pisali)', value: leastText, inline: false },
                { name: `👻 Potpuno neaktivni (${inactive.length} članova)`, value: 'Za kompletnu listu neaktivnih koristite komandu `/neaktivni`', inline: false },
                { name: '🔧 Dijagnostika', value: diagText, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Izveštaj generisan za Načelnika' });

        await interaction.editReply({ embeds: [embed] });
    },
};
