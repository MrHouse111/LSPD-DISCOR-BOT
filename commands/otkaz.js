const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const statsStore = require('../utils/statsStore');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('otkaz')
		.setDescription('Daje otkaz službeniku iz organizacije (Samo za Načelnike)')
        .addUserOption(option => 
            option.setName('sluzbenik')
                .setDescription('Službenik koji dobija otkaz')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('razlog')
                .setDescription('Razlog otkaza')
                .setRequired(true)),
	async execute(interaction) {
        const hasRole = interaction.member.roles.cache.some(role => ['director', 'zamenik nacelnika'].includes(role.name.toLowerCase()));
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Nemate dozvolu! Ovu komandu mogu koristiti samo načelnici.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('sluzbenik');
        const razlog = interaction.options.getString('razlog');

        statsStore.addOtkaz(targetUser.id, targetUser.username);

		const embed = new EmbedBuilder()
			.setColor('#ff0000') // Red for termination
			.setTitle('🛑 LSPD | Raskid Ugovora (Otkaz)')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: 'Službenik:', value: `<@${targetUser.id}>`, inline: true },
                { name: 'Otpustio:', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Razlog:', value: razlog, inline: false }
            )
            .setFooter({ text: 'Odluka Načelnika je konačna.' })
            .setTimestamp();

        // Target user role removal logic could go here if configured
        
		await interaction.reply({ embeds: [embed] });
	},
};
