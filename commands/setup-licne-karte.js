const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-licne-karte')
        .setDescription('Postavlja panel za kreiranje ličnih karata')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('👮 LSPD Lične Karte')
            .setDescription('Dobrodošli u LSPD!\n\nKliknite na dugme ispod kako biste kreirali svoju službenu Ličnu Kartu.\nNakon kreiranja, automatski ćete dobiti ulogu **Policajac**.')
            .setThumbnail(interaction.guild.iconURL());

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_licna_karta')
                    .setLabel('Kreiraj Ličnu Kartu')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🪪')
            );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Panel za lične karte je uspešno postavljen.', ephemeral: true });
    },
};
