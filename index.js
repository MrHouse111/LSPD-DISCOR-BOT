require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { Client, Collection, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// DUMMY SERVER ZA RENDER.COM
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('LSPD Discord Bot is running!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[SERVER] Dummy server listening on port ${port}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntasdasdas dasentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
    ],
});

client.commands = new Collection();

// Dynamically load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Dynamically load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// ============================
// AUTO-LOGOUT INTERVAL (4 sata)
// ============================
const AUTO_LOGOUT_MS = 4 * 60 * 60 * 1000; // 4 sata u ms
const CHECK_INTERVAL_MS = 5 * 60 * 1000;    // Provera svakih 5 minuta

client.once('ready', () => {
    console.log(`[BOT] Ulogovan kao ${client.user.tag}`);
    
    // Pokretanje interval provere dužnosti
    setInterval(async () => {
        const dutyStore = require('./utils/dutyStore');
        const statsStore = require('./utils/statsStore');
        
        try {
            const activeDuties = await dutyStore.getActiveDuty();
            const now = Date.now();

            for (const duty of activeDuties) {
                const elapsed = now - duty.startTime;
                if (elapsed >= AUTO_LOGOUT_MS) {
                    console.log(`[AUTO-LOGOUT] Automatska odjava korisnika ${duty.userId} (${Math.round(elapsed / 3600000)}h na dužnosti)`);
                    
                    // Odjavljujemo korisnika
                    const durationMs = await dutyStore.checkOut(duty.userId);
                    if (durationMs && durationMs > 0) {
                        await statsStore.addDutyTime(duty.userId, duty.userId, durationMs);
                    }

                    const hours = Math.floor((durationMs || 0) / 3600000);
                    const minutes = Math.floor(((durationMs || 0) % 3600000) / 60000);

                    // Slanje DM-a korisniku
                    try {
                        const discordUser = await client.users.fetch(duty.userId);
                        const dmEmbed = new EmbedBuilder()
                            .setColor('#ff9900')
                            .setTitle('⏰ LSPD — Automatska Odjava sa Dužnosti')
                            .setDescription(
                                `Vaša dužnost je automatski odjavljena jer ste bili prijavljeni **${hours}h ${minutes}m** (limit: 4 sata).\n\n` +
                                `Ako ste i dalje na dužnosti, prijavite se ponovo u kanalu dužnosti.\n` +
                                `Ako ste zaboravili da se odjavite, nema problema — sistem je to uradio umjesto vas. 🚔`
                            )
                            .setTimestamp()
                            .setFooter({ text: 'LSPD Automatski Sistem' });
                        
                        await discordUser.send({ embeds: [dmEmbed] });
                    } catch (dmErr) {
                        console.warn(`[AUTO-LOGOUT] Nije moguće poslati DM korisniku ${duty.userId}: ${dmErr.message}`);
                    }

                    // Slanje obaveštenja u kanal dužnosti (ako postoji)
                    if (duty.channelId) {
                        try {
                            const channel = await client.channels.fetch(duty.channelId);
                            if (channel) {
                                // Panel dugmad
                                const row = new ActionRowBuilder()
                                    .addComponents(
                                        new ButtonBuilder().setCustomId('duty_on').setLabel('🟢 Prijava na dužnost').setStyle(ButtonStyle.Success),
                                        new ButtonBuilder().setCustomId('duty_off').setLabel('🔴 Odjava sa dužnosti').setStyle(ButtonStyle.Danger),
                                    );

                                const panelEmbed = new EmbedBuilder()
                                    .setColor('#0099ff')
                                    .setTitle('👮 LSPD - Evidencija Dužnosti')
                                    .setDescription('Kliknite na dugme ispod da biste se prijavili ili odjavili sa dužnosti.\n\nSistem automatski beleži vaše vreme i aktivnost.')
                                    .setTimestamp();

                                const logEmbed = new EmbedBuilder()
                                    .setColor('#ff9900')
                                    .setDescription(`⏰ **<@${duty.userId}>** je automatski odjavljen/a sa dužnosti nakon **${hours}h ${minutes}m** (4h limit).`);

                                await channel.send({ embeds: [panelEmbed], components: [row] });
                                await channel.send({ embeds: [logEmbed] });
                            }
                        } catch (chErr) {
                            console.warn(`[AUTO-LOGOUT] Nije moguće slanje u kanal ${duty.channelId}: ${chErr.message}`);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[AUTO-LOGOUT ERROR]', err);
        }
    }, CHECK_INTERVAL_MS);
});

client.login(process.env.DISCORD_TOKEN);

