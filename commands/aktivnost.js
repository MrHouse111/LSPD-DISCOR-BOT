const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const statsStore = require('../utils/statsStore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aktivnost')
        .setDescription('Prikazuje vašu aktivnost u LSPD u poslednjih 7 dana'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userStats = await statsStore.getUserStats(interaction.user.id);
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        let messageCount = 0;
        let voiceMs = 0;
        let dutyMs = 0;

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
        
        const pluses = userStats ? (userStats.pluses || 0) : 0;
        const minuses = userStats ? (userStats.minuses || 0) : 0;
        const points = pluses - minuses;
        const pointsStr = points > 0 ? `+${points}` : `${points}`;

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📊 Vaša LSPD Aktivnost (Poslednjih 7 dana)')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: 'Službenik', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Ocena', value: `\`${pointsStr}\``, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '⏱️ Vreme na dužnosti', value: `\`${dutyH}h ${dutyM}m\``, inline: true },
                { name: '🎙️ Vreme u Voice-u', value: `\`${voiceH}h ${voiceM}m\``, inline: true },
                { name: '💬 Poslate poruke', value: `\`${messageCount}\``, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
