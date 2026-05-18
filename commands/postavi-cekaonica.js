const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('postavi-cekaonica')
		.setDescription('Kreira tekstualni i glasovni kanal za čekaonicu.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const guild = interaction.guild;
            
            // Traži da li kanali već postoje
            let textChannel = guild.channels.cache.find(c => c.name === 'cekaonica' && c.type === ChannelType.GuildText);
            let voiceChannel = guild.channels.cache.find(c => c.name === 'Čekaonica' && c.type === ChannelType.GuildVoice);
            
            let createdChannels = [];
            
            // Pravljenje tekstualne čekaonice
            if (!textChannel) {
                textChannel = await guild.channels.create({
                    name: 'cekaonica',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.id, // Ovo menja @everyone permisije za ovaj kanal
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages],
                        }
                    ],
                });
                createdChannels.push(`<#${textChannel.id}>`);
            }
            
            // Pravljenje glasovne čekaonice
            if (!voiceChannel) {
                voiceChannel = await guild.channels.create({
                    name: 'Čekaonica',
                    type: ChannelType.GuildVoice,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
                        }
                    ],
                });
                createdChannels.push(`glasovni kanal **Čekaonica**`);
            }
            
            if (createdChannels.length > 0) {
                await interaction.editReply(`Uspešno kreirani kanali: ${createdChannels.join(', ')}`);
            } else {
                await interaction.editReply('Kanali za čekaonicu već postoje na serveru!');
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply('Došlo je do greške prilikom kreiranja kanala. Proverite da li bot ima administratorske permisije.');
        }
	},
};
