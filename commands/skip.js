const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Preskače trenutnu pesmu i pušta sledeću sa liste'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Trenutno se ne pušta nikakva muzika!', ephemeral: true });
        }
        
        const currentTrack = queue.currentTrack;
        queue.node.skip();
        return interaction.reply(`⏭️ Pesma **${currentTrack.title}** je preskočena!`);
    }
};
