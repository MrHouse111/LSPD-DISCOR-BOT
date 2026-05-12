const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { updateLeaderboard } = require('../utils/badgeLeaderboard');

const badgesFile = path.join(__dirname, '../badges.json');

function loadBadges() {
    if (!fs.existsSync(badgesFile)) {
        fs.writeFileSync(badgesFile, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(badgesFile));
}

function saveBadges(data) {
    fs.writeFileSync(badgesFile, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('izmeni-znacku')
        .setDescription('Ručno postavlja određeni broj značke službeniku')
        .addUserOption(option => option.setName('sluzbenik').setDescription('Službenik kome se menja značka').setRequired(true))
        .addIntegerOption(option => option.setName('broj').setDescription('Novi broj značke').setRequired(true)),
    async execute(interaction) {
        const hasRole = interaction.member.roles.cache.some(role => ['director', 'zamenik nacelnika', 'načelnik', 'nacelnik'].includes(role.name.toLowerCase()));
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Samo Načelnici mogu upravljati značkama!', ephemeral: true });
        }

        const badges = loadBadges();
        const targetUser = interaction.options.getUser('sluzbenik');
        const newBadge = interaction.options.getInteger('broj');

        // Check if newBadge is already taken
        if (badges[newBadge.toString()]) {
            const owner = badges[newBadge.toString()];
            const ownerDisplay = owner.id ? `<@${owner.id}>` : owner.name;
            if (owner.id === targetUser.id) {
                return interaction.reply({ content: `❌ <@${targetUser.id}> već poseduje značku broj **${newBadge}**!`, ephemeral: true });
            }
            return interaction.reply({ content: `❌ Značka broj **${newBadge}** je već dodeljena službeniku ${ownerDisplay}!`, ephemeral: true });
        }

        // Remove old badge if they had one
        let oldBadge = null;
        for (const [badgeNum, data] of Object.entries(badges)) {
            if (data.id === targetUser.id) {
                oldBadge = badgeNum;
                delete badges[badgeNum];
                break;
            }
        }

        // Assign new badge
        badges[newBadge.toString()] = {
            id: targetUser.id,
            name: targetUser.username
        };
        saveBadges(badges);
        
        // Ažuriraj leaderboard
        updateLeaderboard(interaction.client);

        // Slanje DM-a korisniku
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👮 LSPD — Značka Ažurirana')
                .setDescription(`Dodeljen vam je novi broj značke i ormarića!\n\n🪪 **Vaš novi broj značke:** \`#${newBadge}\`\n🗄️ **Vaš novi ormarić:** \`${newBadge}\`\n\n*Molimo vas da uvek koristite ovaj broj na dužnosti.*`)
                .setTimestamp();
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (e) {
            console.warn(`[ZNACKA] Ne može se poslati DM korisniku ${targetUser.id}`);
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Značka Izmenjena')
            .setDescription(`Službeniku <@${targetUser.id}> je uspešno promenjen broj značke!`)
            .addFields(
                { name: 'Novi broj', value: `**${newBadge}**`, inline: true },
                { name: 'Stari broj', value: oldBadge ? `${oldBadge}` : 'Nije imao', inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
