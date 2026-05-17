const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const dutyStore = require('../utils/dutyStore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('onduty')
        .setDescription('Prikazuje listu trenutno aktivnih dužnosti (Samo za Načelnike)'),
    async execute(interaction) {
        if (!interaction.member) return interaction.reply({ content: '❌ Ova komanda se može koristiti isključivo na serveru!', ephemeral: true });

        // Dozvola samo za Načelnike i Administratore
        const hasRole = interaction.member.roles.cache.some(role => role.name === '👮NACELNIK👮' || role.name.toLowerCase() === 'director' || role.name.toLowerCase() === 'zamenik nacelnika');
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Nemate dozvolu! Samo Načelnici mogu koristiti ovu komandu.', ephemeral: true });
        }

        const activeDuties = await dutyStore.getActiveDuty();

        if (!activeDuties || activeDuties.length === 0) {
            return interaction.reply({ content: 'Trenutno niko nije na dužnosti.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('👮 Trenutno na dužnosti')
            .setTimestamp();

        let description = '';
        const now = Date.now();

        for (const duty of activeDuties) {
            const durationMs = now - duty.startTime;
            const hours = Math.floor(durationMs / 3600000);
            const minutes = Math.floor((durationMs % 3600000) / 60000);
            
            description += `• <@${duty.userId}> — **${hours}h ${minutes}m**\n`;
        }

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed] });
    },
};
