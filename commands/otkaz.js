const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadBadges } = require('../utils/badgeLeaderboard');

function findUserBadge(badges, userId) {
    for (const [num, data] of Object.entries(badges)) {
        if (data.id === userId) return num;
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otkaz')
        .setDescription('Daje otkaz i izbacuje policajca sa servera (Samo za Načelnike)')
        .addUserOption(o => o.setName('sluzbenik').setDescription('Policajac koji dobija otkaz').setRequired(true))
        .addStringOption(o => o.setName('razlog').setDescription('Razlog otkaza').setRequired(true)),

    async execute(interaction) {
        const hasRole = interaction.member.roles.cache.some(role =>
            ['director', '👮nacelnik👮'].includes(role.name.toLowerCase())
        );
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Nemate dozvolu! Ovu komandu mogu koristiti samo načelnici.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('sluzbenik');
        const razlog = interaction.options.getString('razlog');

        const badges = await loadBadges();
        const badgeNum = findUserBadge(badges, targetUser.id);

        const confirmEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('⚠️ POTVRDA OTKAZA')
            .setDescription(
                `Da li ste sigurni da želite dati otkaz korisniku <@${targetUser.id}>?\n\n` +
                `**Razlog:** ${razlog}\n` +
                (badgeNum ? `**Značka #${badgeNum}** će biti oslobođena.\n` : '') +
                `\n⛔ Korisnik će biti **izbačen sa servera**!`
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        // Encode razlog u customId (skratiti ako je predugačak)
        const safeRazlog = razlog.replace(/_/g, '-').substring(0, 80);
        const confirmId = `otkaz_potvrdi_${targetUser.id}_${safeRazlog}`;
        const cancelId = `otkaz_otkazi_${targetUser.id}`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(confirmId).setLabel('✅ Potvrdi Otkaz').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(cancelId).setLabel('❌ Otkaži').setStyle(ButtonStyle.Secondary),
        );

        return interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
    }
};
