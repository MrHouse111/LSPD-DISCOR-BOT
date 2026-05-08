const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const dutyStore = require('../utils/dutyStore');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
        // Handle Button Clicks
        if (interaction.isButton()) {
            const { customId, user } = interaction;
            const now = new Date();
            const timeString = now.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });

            // Duty System
            if (customId === 'duty_on' || customId === 'duty_off') {
                try {
                    await interaction.deferReply();
                    const isDutyOn = customId === 'duty_on';
                    const onDuty = await dutyStore.isOnDuty(user.id);

                    if (isDutyOn && onDuty) {
                        return interaction.editReply({ content: 'Već ste na dužnosti!' });
                    }
                    if (!isDutyOn && !onDuty) {
                        return interaction.editReply({ content: 'Niste prijavljeni na dužnost!' });
                    }

                    let embed;
                    if (isDutyOn) {
                        await dutyStore.checkIn(user.id);
                        embed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setDescription(`🟢 **${interaction.member.displayName}** je stupio/la na dužnost u **${timeString}**.`);
                    } else {
                        const durationMs = await dutyStore.checkOut(user.id);
                        const safeDuration = durationMs || 0;
                        const durationMinutes = Math.floor(safeDuration / 60000);
                        const hours = Math.floor(durationMinutes / 60);
                        const minutes = durationMinutes % 60;

                        embed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription(`🔴 **${interaction.member.displayName}** je odjavio/la dužnost u **${timeString}**.\n\n⏱️ Vreme provedeno na dužnosti: **${hours}h ${minutes}m**.`);
                    }

                    // Pošalji log embed na kanal
                    await interaction.editReply({ embeds: [embed] });

                    // Brisanje stare poruke (gde se nalazilo dugme)
                    try {
                        await interaction.message.delete();
                    } catch (e) {
                        // Ignoriši ako je poruka već obrisana
                    }

                    // Generisanje i slanje novog panela na dno kanala
                    const { ButtonBuilder, ButtonStyle } = require('discord.js');
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('duty_on')
                                .setLabel('🟢 Prijava na dužnost')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId('duty_off')
                                .setLabel('🔴 Odjava sa dužnosti')
                                .setStyle(ButtonStyle.Danger),
                        );

                    const panelEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('👮 LSPD - Evidencija Dužnosti')
                        .setDescription('Kliknite na dugme ispod da biste se prijavili ili odjavili sa dužnosti.\n\nSistem automatski beleži vaše vreme i aktivnost.')
                        .setTimestamp();

                    await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
                } catch (error) {
                    console.error('[DUTY ERROR]', error);
                    try {
                        if (interaction.deferred) {
                            await interaction.editReply({ content: '⚠️ Došlo je do greške sa sistemom dužnosti. Pokušajte ponovo.' });
                        } else {
                            await interaction.reply({ content: '⚠️ Došlo je do greške sa sistemom dužnosti. Pokušajte ponovo.', ephemeral: true });
                        }
                    } catch (e) { /* ignore */ }
                }
                return;
            }

            // Registration System - Open Modal
            else if (customId === 'btn_licna_karta') {
                const modal = new ModalBuilder()
                    .setCustomId('register_modal')
                    .setTitle('LSPD Lična Karta');

                const imeInput = new TextInputBuilder()
                    .setCustomId('ime_input')
                    .setLabel('Ime i Prezime vašeg karaktera')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Npr. John Doe');

                const uuidInput = new TextInputBuilder()
                    .setCustomId('uuid_input')
                    .setLabel('Vaš In-Game UUID (ID)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Npr. 12345');

                const steamInput = new TextInputBuilder()
                    .setCustomId('steam_input')
                    .setLabel('Vaše Steam Ime')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Npr. Kiler123');

                const firstActionRow = new ActionRowBuilder().addComponents(imeInput);
                const secondActionRow = new ActionRowBuilder().addComponents(uuidInput);
                const thirdActionRow = new ActionRowBuilder().addComponents(steamInput);

                modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

                return interaction.showModal(modal);
            }

            // Ticket System - Open Ticket
            else if (customId === 'open_ticket') {
                const channelName = `tiket-${user.username}`;
                
                // Check if user already has a ticket open
                const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName.toLowerCase());
                if (existingChannel) {
                    return interaction.reply({ content: `Već imate otvoren tiket: <#${existingChannel.id}>`, ephemeral: true });
                }

                try {
                    const { ChannelType, PermissionsBitField } = require('discord.js');
                    
                    const ticketChannel = await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id, // @everyone role
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                            {
                                id: user.id, // The user who opened it
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                            },
                            {
                                id: interaction.client.user.id, // The bot
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                            }
                        ],
                    });

                    const ticketEmbed = new EmbedBuilder()
                        .setColor('#e67e22')
                        .setTitle('🎫 Novi Tiket')
                        .setDescription(`Dobrodošli <@${user.id}>! Opišite svoj problem i High Command će vam odgovoriti u najkraćem roku.\n\n**Napomena:** Ovaj tiket je vidljiv isključivo Načelnicima i vama.\n\nDa zatvorite tiket, kliknite na dugme ispod.`)
                        .setTimestamp();

                    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    const closeRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_ticket')
                            .setLabel('🔒 Zatvori Tiket')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await ticketChannel.send({ content: `<@${user.id}>`, embeds: [ticketEmbed], components: [closeRow] });
                    return interaction.reply({ content: `Vaš tiket je uspešno kreiran: <#${ticketChannel.id}>`, ephemeral: true });
                } catch (error) {
                    console.error('Greška pri kreiranju tiketa:', error);
                    return interaction.reply({ content: 'Došlo je do greške prilikom kreiranja tiketa. Obavestite administraciju.', ephemeral: true });
                }
            }

            // Ticket System - Close Ticket
            else if (customId === 'close_ticket') {
                await interaction.reply({ content: 'Tiket će biti zatvoren za 5 sekundi...' });
                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 5000);
                return;
            }

            // Odsustvo System - Open Modal
            else if (customId === 'odsustvo_btn') {
                const modal = new ModalBuilder()
                    .setCustomId('odsustvo_modal')
                    .setTitle('Prijava Odsustva');

                const imeInput = new TextInputBuilder()
                    .setCustomId('ime_input')
                    .setLabel('Ime i Prezime')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const cinInput = new TextInputBuilder()
                    .setCustomId('cin_input')
                    .setLabel('Vaš Čin')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const odInput = new TextInputBuilder()
                    .setCustomId('od_input')
                    .setLabel('Od (Datum):')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const doInput = new TextInputBuilder()
                    .setCustomId('do_input')
                    .setLabel('Do (Datum):')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const razlogInput = new TextInputBuilder()
                    .setCustomId('razlog_input')
                    .setLabel('Razlog')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(imeInput),
                    new ActionRowBuilder().addComponents(cinInput),
                    new ActionRowBuilder().addComponents(odInput),
                    new ActionRowBuilder().addComponents(doInput),
                    new ActionRowBuilder().addComponents(razlogInput)
                );

                return interaction.showModal(modal);
            }
        }

        // Handle Modal Submissions
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'register_modal') {
                const ime = interaction.fields.getTextInputValue('ime_input');
                const uuid = interaction.fields.getTextInputValue('uuid_input');
                const steam = interaction.fields.getTextInputValue('steam_input');

                // Generate Embed
                const idEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('👮 LSPD Lična Karta')
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                        { name: 'Ime i Prezime', value: ime, inline: true },
                        { name: 'Discord', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'UUID', value: uuid, inline: true },
                        { name: 'Steam', value: steam, inline: true },
                    )
                    .setTimestamp();

                // Dodavanje role 'Policajac'
                const policajacRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'policajac');
                if (policajacRole) {
                    await interaction.member.roles.add(policajacRole).catch(console.error);
                }

                // Attempt to change nickname
                try {
                    // This can fail if the user is owner or has higher role than the bot
                    await interaction.member.setNickname(`${ime} (Policajac)`);
                } catch (err) {
                    console.log(`Failed to set nickname for ${interaction.user.tag}. Missing permissions.`);
                }

                // Slanje u kanal
                await interaction.channel.send({ embeds: [idEmbed] });

                // Obriši stari panel sa dugmetom i pošalji novi na dno kanala
                try {
                    const messages = await interaction.channel.messages.fetch({ limit: 50 });
                    const oldPanel = messages.find(m => m.author.id === interaction.client.user.id && m.components.length > 0 && m.embeds.length > 0 && m.embeds[0].title === '👮 LSPD Lične Karte');
                    if (oldPanel) await oldPanel.delete();
                } catch (e) { /* ignore */ }

                const { ButtonBuilder, ButtonStyle } = require('discord.js');
                const panelEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('👮 LSPD Lične Karte')
                    .setDescription('Dobrodošli u LSPD!\n\nKliknite na dugme ispod kako biste kreirali svoju službenu Ličnu Kartu.\nNakon kreiranja, automatski ćete dobiti ulogu **Policajac**.')
                    .setThumbnail(interaction.guild.iconURL());

                const panelRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('btn_licna_karta')
                            .setLabel('Kreiraj Ličnu Kartu')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🪪')
                    );

                await interaction.channel.send({ embeds: [panelEmbed], components: [panelRow] });

                return interaction.reply({ content: 'Uspešno ste registrovani i Lična Karta je poslata u kanal!', ephemeral: true });
            }

            if (interaction.customId === 'odsustvo_modal') {
                const ime = interaction.fields.getTextInputValue('ime_input');
                const cin = interaction.fields.getTextInputValue('cin_input');
                const datumOd = interaction.fields.getTextInputValue('od_input');
                const datumDo = interaction.fields.getTextInputValue('do_input');
                const razlog = interaction.fields.getTextInputValue('razlog_input');

                const odsustvoEmbed = new EmbedBuilder()
                    .setColor('#f1c40f')
                    .setTitle('📄 Nova Prijava Odsustva')
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .addFields(
                        { name: 'Ime i Prezime', value: ime, inline: true },
                        { name: 'Discord', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Čin', value: cin, inline: true },
                        { name: 'Period Od', value: datumOd, inline: true },
                        { name: 'Period Do', value: datumDo, inline: true },
                        { name: 'Razlog', value: razlog, inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ content: 'Vaša prijava za odsustvo je uspešno zabeležena.', ephemeral: true });
                return interaction.channel.send({ embeds: [odsustvoEmbed] });
            }
        }

        // Handle Slash Commands
		if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        }
	},
};
