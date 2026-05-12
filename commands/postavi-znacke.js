const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setupLeaderboard } = require('../utils/badgeLeaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('postavi-znacke')
        .setDescription('Postavlja leaderboard znački u trenutni kanal (Samo za Načelnike)'),

    async execute(interaction) {
        const hasRole = interaction.member.roles.cache.some(role =>
            ['director', 'zamenik nacelnika'].includes(role.name.toLowerCase())
        );
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Samo Načelnici mogu koristiti ovu komandu!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await setupLeaderboard(interaction.channel, interaction.client);
            return interaction.editReply({ content: '✅ Leaderboard znački je uspešno postavljen u ovaj kanal!\n\nOd sada će se automatski ažurirati pri svakoj dodeli, izmeni ili uklanjanju značke.' });
        } catch (err) {
            console.error('[POSTAVI-ZNACKE ERROR]', err);
            return interaction.editReply({ content: `❌ Greška: ${err.message}` });
        }
    },
};
