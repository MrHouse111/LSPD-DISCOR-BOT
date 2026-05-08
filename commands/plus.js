const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const statsStore = require('../utils/statsStore');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('plus')
		.setDescription('Dodeljuje plus (+) službeniku (Samo za Načelnike)')
        .addUserOption(option => 
            option.setName('sluzbenik')
                .setDescription('Službenik kom se dodeljuje plus')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('razlog')
                .setDescription('Razlog dodeljivanja plusa')
                .setRequired(true)),
	async execute(interaction) {
        const hasRole = interaction.member.roles.cache.some(role => ['director', 'zamenik nacelnika'].includes(role.name.toLowerCase()));
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Nemate dozvolu! Ovu komandu mogu koristiti samo načelnici.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('sluzbenik');
        const razlog = interaction.options.getString('razlog');

        statsStore.addPlus(targetUser.id, targetUser.username);

		const embed = new EmbedBuilder()
			.setColor('#00ff00')
			.setTitle('✅ LSPD | Novi Plus')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Službenik:', value: `<@${targetUser.id}>`, inline: true },
                { name: 'Dodelio:', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Razlog:', value: razlog, inline: false }
            )
            .setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};
