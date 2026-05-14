const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Zaustavlja muziku i izbacuje bota iz glasovnog kanala'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Trenutno se ne pušta nikakva muzika!', ephemeral: true });
        }
        
        queue.delete(); // Ovo potpuno briše redosled i bot napušta kanal
        return interaction.reply('🛑 Muzika je zaustavljena i lista pesama je obrisana.');
    }
};
