const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
        .setName('znacka')
        .setDescription('Dodeljuje sledeći slobodan broj značke službeniku')
        .addUserOption(option => option.setName('sluzbenik').setDescription('Službenik kome se dodeljuje značka').setRequired(true)),
    async execute(interaction) {
        const hasRole = interaction.member.roles.cache.some(role => ['director', 'zamenik nacelnika'].includes(role.name.toLowerCase()));
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Samo Načelnici mogu dodeljivati značke!', ephemeral: true });
        }

        const badges = loadBadges();
        const targetUser = interaction.options.getUser('sluzbenik');
        
        // Check if user already has a badge
        let existingBadge = null;
        for (const [badgeNum, data] of Object.entries(badges)) {
            if (data.id === targetUser.id) {
                existingBadge = badgeNum;
                break;
            }
        }

        if (existingBadge) {
            return interaction.reply({ content: `❌ <@${targetUser.id}> već poseduje značku broj **${existingBadge}**! Ako želiš da promeniš broj, koristi komandu \`/izmeni-znacku\`.`, ephemeral: true });
        }

        // Find next available badge number
        let nextBadge = 1;
        while (badges[nextBadge.toString()]) {
            nextBadge++;
        }

        // Assign badge
        badges[nextBadge.toString()] = {
            id: targetUser.id,
            name: targetUser.username
        };
        saveBadges(badges);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👮 LSPD Značka')
            .setDescription(`Zaposlen je novi službenik!`)
            .addFields(
                { name: 'Službenik', value: `<@${targetUser.id}>`, inline: true },
                { name: 'Broj značke', value: `**${nextBadge}**`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
