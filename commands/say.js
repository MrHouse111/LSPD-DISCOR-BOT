const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Pošalji poruku u kanal kao bot (Samo administratori)')
        .addStringOption(option => option.setName('message').setDescription('Poruka koju bot treba poslati').setRequired(true))
        .addChannelOption(option => option.setName('channel').setDescription('Kanal u koji će se poslati poruka (opciono)')),

    async execute(interaction) {
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) {
            return interaction.reply({ content: '❌ Samo administratori mogu koristiti ovu komandu.', ephemeral: true });
        }

        const message = interaction.options.getString('message');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await targetChannel.send({ content: message });
            return interaction.reply({ content: `✅ Poruka je poslata u ${targetChannel}.`, ephemeral: true });
        } catch (err) {
            console.error('[SAY ERROR]', err);
            return interaction.reply({ content: `❌ Greška pri slanju poruke: ${err.message}`, ephemeral: true });
        }
    },
};
