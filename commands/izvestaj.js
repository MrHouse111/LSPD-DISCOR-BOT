const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const statsStore = require('../utils/statsStore');

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

        statsStore.cleanOldData();

        const allStats = statsStore.getAllStats();
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
            const userStats = allStats[member.user.id];
            
            if (userStats && userStats.messages) {
                for (const [dateStr, count] of Object.entries(userStats.messages)) {
                    const msgDate = new Date(dateStr);
                    if (msgDate >= sevenDaysAgo) {
                        messageCount += count;
                    }
                }
            }

            let voiceMs = 0;
            if (userStats && userStats.voice) {
                for (const [dateStr, durationMs] of Object.entries(userStats.voice)) {
                    const msgDate = new Date(dateStr);
                    if (msgDate >= sevenDaysAgo) {
                        voiceMs += durationMs;
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

        userActivity.sort((a, b) => b.messageCount - a.messageCount); // Možemo sortirati i po aktivnosti, ali ostaćemo na porukama

        const topActive = userActivity.slice(0, 10);
        const leastActive = userActivity.filter(u => u.messageCount > 0 || u.voiceMs > 0).reverse().slice(0, 10);
        const inactive = userActivity.filter(u => u.messageCount === 0 && u.voiceMs === 0);

        let topText = topActive.map((u, i) => `${i + 1}. <@${u.id}> - ${u.messageCount} poruka | 🎙️ ${u.voiceString} (Plus: ${u.pluses}, Minus: ${u.minuses})`).join('\n') || 'Nema podataka';
        let leastText = leastActive.map((u, i) => `${i + 1}. <@${u.id}> - ${u.messageCount} poruka | 🎙️ ${u.voiceString}`).join('\n') || 'Nema podataka';
        
        let inactiveText = inactive.map(u => `<@${u.id}>`).join(', ');
        if (!inactiveText) inactiveText = 'Nema neaktivnih članova.';
        else if (inactiveText.length > 1024) inactiveText = inactiveText.substring(0, 1020) + '...';

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📊 LSPD Nedeljni Izveštaj Aktivnosti (Poslednjih 7 dana)')
            .addFields(
                { name: '🏆 Najaktivniji', value: topText, inline: false },
                { name: '⚠️ Najmanje aktivni (a da su pisali)', value: leastText, inline: false },
                { name: '👻 Potpuno neaktivni (0 poruka)', value: inactiveText, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Izveštaj generisan za Načelnika' });

        await interaction.editReply({ embeds: [embed] });
    },
};
