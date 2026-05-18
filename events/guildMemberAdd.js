const { Events } = require('discord.js');

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(member) {
        try {
            // Traži kanal cekaonica
            const cekaonicaChannel = member.guild.channels.cache.find(c => c.name === 'cekaonica');
            
            if (cekaonicaChannel) {
                // ID-jevi kanala za pravila i tikete
                const pravilaId = '1467408003232956538';
                const tiketiId = '1505706784289984603';
                
                await cekaonicaChannel.send(
                    `Dobrodošao/la <@${member.id}> na LSPD server!\n` +
                    `Molimo te obavezno pročitaj <#${pravilaId}>. Ukoliko želiš da započneš proces testiranja za ulazak u LSPD ili imaš pitanja, otvori tiket u <#${tiketiId}>.`
                );
            }
        } catch (error) {
            console.error('Došlo je do greške prilikom dočekivanja novog člana:', error);
        }
	},
};
