const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const statsStore = require('../utils/statsStore');
const { db } = require('../utils/firebase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('izvestaj')
        .setDescription('Generiše nedeljni izveštaj aktivnosti cele LSPD ekipe (Samo za Načelnike)'),
    async execute(interaction) {
        const hasRole = interaction.member.roles.cache.some(role =>
            ['director', 'zamenik nacelnika'].includes(role.name.toLowerCase())
        );
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Nemate dozvolu! Ovu komandu mogu koristiti samo načelnici.', ephemeral: true });
        }

        // EPHEMERAL — vidi samo načelnik koji pokreće
        await interaction.deferReply({ ephemeral: true });

        await statsStore.cleanOldData();
        const allStats = await statsStore.getAllStats();
        const statsKeys = Object.keys(allStats);

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
            let dutyMs = 0;
            const userStats = allStats[member.user.id];

            if (userStats) {
                if (userStats.messages && typeof userStats.messages === 'object') {
                    for (const [dateStr, count] of Object.entries(userStats.messages)) {
                        if (new Date(dateStr) >= sevenDaysAgo) messageCount += count;
                    }
                }
                if (userStats.voice && typeof userStats.voice === 'object') {
                    for (const [dateStr, durationMs] of Object.entries(userStats.voice)) {
                        if (new Date(dateStr) >= sevenDaysAgo) voiceMs += durationMs;
                    }
                }
                if (userStats.duty && typeof userStats.duty === 'object') {
                    for (const [dateStr, durationMs] of Object.entries(userStats.duty)) {
                        if (new Date(dateStr) >= sevenDaysAgo) dutyMs += durationMs;
                    }
                }
                // Stari ključevi s tačkom
                for (const [key, value] of Object.entries(userStats)) {
                    if (key.startsWith('messages.')) {
                        if (new Date(key.substring(9)) >= sevenDaysAgo) messageCount += value;
                    } else if (key.startsWith('voice.')) {
                        if (new Date(key.substring(6)) >= sevenDaysAgo) voiceMs += value;
                    } else if (key.startsWith('duty.')) {
                        if (new Date(key.substring(5)) >= sevenDaysAgo) dutyMs += value;
                    }
                }
            }

            const dutyH = Math.floor(dutyMs / 3600000);
            const dutyM = Math.floor((dutyMs % 3600000) / 60000);
            const voiceH = Math.floor(voiceMs / 3600000);
            const voiceM = Math.floor((voiceMs % 3600000) / 60000);

            userActivity.push({
                id: member.user.id,
                username: member.user.username,
                displayName: member.displayName,
                messageCount,
                voiceMs,
                voiceString: `${voiceH}h ${voiceM}m`,
                dutyMs,
                dutyString: `${dutyH}h ${dutyM}m`,
                pluses: userStats ? (userStats.pluses || 0) : 0,
                minuses: userStats ? (userStats.minuses || 0) : 0,
                isPolicajac: member.roles.cache.some(r => r.name.toLowerCase() === 'policajac')
            });
        });

        // Sortiranje po dužnosti → oceni → porukama
        userActivity.sort((a, b) => {
            if (b.dutyMs !== a.dutyMs) return b.dutyMs - a.dutyMs;
            const aP = a.pluses - a.minuses;
            const bP = b.pluses - b.minuses;
            if (bP !== aP) return bP - aP;
            return b.messageCount - a.messageCount;
        });

        const withActivity = userActivity.filter(u => u.dutyMs > 0 || u.messageCount > 0 || u.voiceMs > 0);
        const inactive = userActivity.filter(u => u.dutyMs === 0 && u.messageCount === 0 && u.voiceMs === 0 && u.isPolicajac);

        const formatMember = (u, i) => {
            const points = u.pluses - u.minuses;
            const pointsStr = points > 0 ? `+${points}` : `${points}`;
            return `**${i + 1}.** <@${u.id}>\n⏱️ **Dužnost:** \`${u.dutyString}\` | ⚖️ **Ocena:** \`${pointsStr}\`\n💬 **Poruke:** \`${u.messageCount}\` | 🎙️ **Voice:** \`${u.voiceString}\``;
        };

        // Deli niz u stranice od po MAX_PER_MSG članova
        const MAX_PER_MSG = 5;
        const messages = [];

        // SEKCIJA 1: Aktivni (sa aktivnošću)
        if (withActivity.length === 0) {
            messages.push({
                embeds: [new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('📊 LSPD Izveštaj — Aktivni (poslednjih 7 dana)')
                    .setDescription('Nema aktivnih korisnika u poslednjih 7 dana.')
                    .setTimestamp()
                ]
            });
        } else {
            for (let i = 0; i < withActivity.length; i += MAX_PER_MSG) {
                const chunk = withActivity.slice(i, i + MAX_PER_MSG);
                const start = i + 1;
                const end = Math.min(i + MAX_PER_MSG, withActivity.length);
                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`🏆 LSPD Izveštaj — Aktivni (${start}–${end} od ${withActivity.length})`)
                    .setDescription(chunk.map((u, idx) => formatMember(u, i + idx)).join('\n\n'))
                    .setTimestamp();
                if (i === 0) embed.setFooter({ text: `Ukupno ${withActivity.length} aktivnih | ${inactive.length} neaktivnih policajaca` });
                messages.push({ embeds: [embed] });
            }
        }

        // SEKCIJA 2: Neaktivni policajci
        if (inactive.length > 0) {
            for (let i = 0; i < inactive.length; i += 20) {
                const chunk = inactive.slice(i, i + 20);
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle(`❌ Neaktivni Policajci (${i + 1}–${Math.min(i + 20, inactive.length)} od ${inactive.length})`)
                    .setDescription(chunk.map(u => `• <@${u.id}> — \`${u.displayName}\``).join('\n'))
                    .setTimestamp();
                messages.push({ embeds: [embed] });
            }
        } else {
            messages.push({
                embeds: [new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('✅ Neaktivni Policajci')
                    .setDescription('Svi policajci su imali aktivnost u poslednjih 7 dana! 👏')
                    .setTimestamp()
                ]
            });
        }

        // Slanje svih poruka uzastopno
        await interaction.editReply(messages[0]);
        for (let i = 1; i < messages.length; i++) {
            await interaction.followUp({ ...messages[i], ephemeral: true });
        }
    },
};
