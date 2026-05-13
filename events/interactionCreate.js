const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ZAMENICI_CHANNEL_ID = '1467412666497634487';
const ODSUSTVO_CHANNEL_ID = '1467410304999624714';
const OTKAZ_CHANNEL_ID = '1467415847562772550';
const dutyStore = require('../utils/dutyStore');
const statsStore = require('../utils/statsStore');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
        // Handle Button Clicks
        if (interaction.isButton()) {
            const { customId, user } = interaction;
            const now = new Date();
            const timeString = now.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Belgrade' });

            // Duty System
            if (customId === 'duty_on' || customId === 'duty_off') {
                try {
                    await interaction.deferUpdate();
                    const isDutyOn = customId === 'duty_on';
                    const onDuty = await dutyStore.isOnDuty(user.id);

                    if (isDutyOn && onDuty) {
                        return interaction.followUp({ content: 'Već ste na dužnosti!', ephemeral: true });
                    }
                    if (!isDutyOn && !onDuty) {
                        return interaction.followUp({ content: 'Niste prijavljeni na dužnost!', ephemeral: true });
                    }

                    let embed;
                    if (isDutyOn) {
                        await dutyStore.checkIn(user.id, interaction.guildId, interaction.channelId);
                        embed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setDescription(`🟢 **${interaction.member.displayName}** je stupio/la na dužnost u **${timeString}**.`);
                    } else {
                        const durationMs = await dutyStore.checkOut(user.id);
                        const safeDuration = durationMs || 0;
                        
                        // NOVO: Sačuvaj duty vreme u stats bazu
                        if (safeDuration > 0) {
                            await statsStore.addDutyTime(user.id, user.username, safeDuration);
                        }

                        const durationMinutes = Math.floor(safeDuration / 60000);
                        const hours = Math.floor(durationMinutes / 60);
                        const minutes = durationMinutes % 60;

                        embed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setDescription(`🔴 **${interaction.member.displayName}** je odjavio/la dužnost u **${timeString}**.\n\n⏱️ Vreme provedeno na dužnosti: **${hours}h ${minutes}m**.`);
                    }

                    // Brisanje stare poruke (gde se nalazilo dugme)
                    try {
                        await interaction.message.delete();
                    } catch (e) {
                        // Ignoriši ako je poruka već obrisana
                    }

                    // Generisanje i slanje novog panela
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

                    // 1. Prvo saljemo panel da bi bio PREDZADNJA poruka
                    await interaction.channel.send({ embeds: [panelEmbed], components: [row] });

                    // 2. Onda saljemo log embed da bi bio ZADNJA poruka
                    await interaction.followUp({ embeds: [embed] });
                } catch (error) {
                    console.error('[DUTY ERROR]', error);
                    try {
                        if (interaction.deferred || interaction.replied) {
                            await interaction.followUp({ content: '⚠️ Došlo je do greške sa sistemom dužnosti. Pokušajte ponovo.', ephemeral: true });
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

            // Odsustvo - Odobravanje / Odbijanje
            else if (customId.startsWith('odsustvo_odobri_') || customId.startsWith('odsustvo_odbij_')) {
                const isApproved = customId.startsWith('odsustvo_odobri_');
                const targetUserId = customId.replace('odsustvo_odobri_', '').replace('odsustvo_odbij_', '');

                // Disable buttons on the message
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('odobri_done').setLabel('✅ Odobreno').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('odbij_done').setLabel('❌ Odbijeno').setStyle(ButtonStyle.Danger).setDisabled(true),
                );

                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(isApproved ? '#00ff00' : '#ff0000')
                    .setFooter({ text: `${isApproved ? '✅ Odobrio' : '❌ Odbio'}: ${interaction.user.displayName} | ${new Date().toLocaleString('sr-RS', { timeZone: 'Europe/Belgrade' })}` });

                await interaction.update({ embeds: [updatedEmbed], components: [disabledRow] });

                // Slanje DM-a podnosiocu
                try {
                    const targetUser = await interaction.client.users.fetch(targetUserId);
                    const dmEmbed = new EmbedBuilder()
                        .setColor(isApproved ? '#00ff00' : '#ff0000')
                        .setTitle(isApproved ? '✅ Odsustvo Odobreno' : '❌ Odsustvo Odbijeno')
                        .setDescription(
                            isApproved
                                ? `Vaša prijava odsustva je **odobrena** od strane načelnika **${interaction.user.displayName}**.`
                                : `Vaša prijava odsustva je **odbijena** od strane načelnika **${interaction.user.displayName}**.\n\nUkoliko imate pitanja, obratite se High Commandu.`
                        )
                        .setTimestamp();
                    await targetUser.send({ embeds: [dmEmbed] });
                } catch (dmErr) {
                    console.warn(`[ODSUSTVO] Ne može se poslati DM korisniku ${targetUserId}`);
                }

                return;
            }

            // Otkaz - Potvrda
            else if (customId.startsWith('otkaz_potvrdi_')) {
                const parts = customId.replace('otkaz_potvrdi_', '').split('_');
                const targetUserId = parts[0];
                const razlog = parts.slice(1).join('_').replace(/-/g, ' ');

                try {
                    const targetMember = await interaction.guild.members.fetch(targetUserId);
                    const targetUsername = targetMember.user.username;
                    const targetDisplayName = targetMember.displayName;

                    // Brisanje znacke iz Firebase-a
                    try {
                        const { loadBadges, saveBadges, updateLeaderboard } = require('../utils/badgeLeaderboard');
                        const badges = await loadBadges();
                        let updated = false;
                        for (const [num, data] of Object.entries(badges)) {
                            if (data.id === targetUserId) {
                                delete badges[num];
                                updated = true;
                                break;
                            }
                        }
                        if (updated) {
                            await saveBadges(badges);
                            
                            // Ažuriraj leaderboard
                            await updateLeaderboard(interaction.client);
                        }
                    } catch (badgeErr) {
                        console.warn('[OTKAZ] Greška pri brisanju značke:', badgeErr.message);
                    }

                    // Pokušaj slanja DM-a pre kicka
                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('🛑 LSPD — Raskid Ugovora')
                            .setDescription(`Vaš ugovor sa LSPD-om je raskinut.\n\n**Razlog:** ${razlog}\n\n*Odluka načelnika je konačna.*`)
                            .setTimestamp();
                        await targetMember.send({ embeds: [dmEmbed] });
                    } catch (e) { /* ignore DM fail */ }

                    // Kick korisnika
                    await targetMember.kick(`Otkaz — ${razlog}`);

                    // Javni embed u kanal za otkaze
                    try {
                        const otkazChannel = await interaction.client.channels.fetch(OTKAZ_CHANNEL_ID);
                        if (otkazChannel) {
                            const publicEmbed = new EmbedBuilder()
                                .setColor('#8B0000')
                                .setTitle('🛑 LSPD | Raskid Ugovora')
                                .addFields(
                                    { name: 'Službenik', value: `<@${targetUserId}> (${targetUsername})`, inline: true },
                                    { name: 'Odluku doneo', value: `<@${interaction.user.id}>`, inline: true },
                                    { name: 'Razlog', value: razlog, inline: false }
                                )
                                .setTimestamp()
                                .setFooter({ text: 'Odluka Načelnika je konačna.' });
                            await otkazChannel.send({ embeds: [publicEmbed] });
                        }
                    } catch (chErr) {
                        console.warn('[OTKAZ] Ne može se poslati u kanal za otkaze:', chErr.message);
                    }

                    // Ažuriranje ephemeral poruke potvrde
                    const confirmEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('✅ Otkaz izvršen')
                        .setDescription(`Korisnik **${targetDisplayName}** je izbačen sa servera.\n**Razlog:** ${razlog}\n\nObaveštenje je objavljeno u kanalu za otkaze.`)
                        .setTimestamp();

                    await interaction.update({ embeds: [confirmEmbed], components: [] });
                } catch (err) {
                    console.error('[OTKAZ ERROR]', err);
                    const isPermError = err.code === 50013 || err.message?.includes('Missing Permissions');
                    const errMsg = isPermError
                        ? '❌ **Nedostaju dozvole!**\n\nBot ne može da kickuje ovog korisnika jer njegova uloga na serveru nije ispod uloge bota u hijerarhiji.\n\n**Rešenje:** U Discord podešavanjima servera → Roles, pomeri ulogu bota iznad uloga koje korisnici imaju.'
                        : `❌ Greška: ${err.message}`;
                    try {
                        await interaction.reply({ content: errMsg, ephemeral: true });
                    } catch(e) {
                        await interaction.update({ content: errMsg, components: [] });
                    }
                }
                return;
            }

            else if (customId.startsWith('otkaz_otkazi_')) {
                await interaction.update({ content: '❌ Otkaz je otkazan.', embeds: [], components: [] });
                return;
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
                let policajacRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'policajac');
                
                if (!policajacRole) {
                    try {
                        policajacRole = await interaction.guild.roles.create({
                            name: 'Policajac',
                            color: '#3498db',
                            reason: 'Automatski kreirana rola za nove LSPD clanove'
                        });
                    } catch (err) {
                        console.error('[LK] Ne mogu da kreiram rolu Policajac:', err.message);
                    }
                }

                let roleWarning = '';
                if (policajacRole) {
                    try {
                        await interaction.member.roles.add(policajacRole);
                    } catch (err) {
                        console.error('[LK] Ne mogu dodeliti rolu Policajac:', err.message);
                        roleWarning = '\n⚠️ *Napomena: Bot nije uspeo da vam dodeli ulogu Policajac jer je njegova uloga niža od nje u hijerarhiji servera.*';
                    }
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

                // Obaveštenje Zamenicima o novoj LK
                try {
                    const zameniciChannel = await interaction.client.channels.fetch(ZAMENICI_CHANNEL_ID);
                    if (zameniciChannel) {
                        const notifEmbed = new EmbedBuilder()
                            .setColor('#FFD700')
                            .setTitle('🪪 Nova Lična Karta — Potrebna Dodela Značke')
                            .setDescription(`Korisnik <@${interaction.user.id}> je upravo kreirao/la Ličnu Kartu.\n\n📋 **Ime:** ${ime}\n🆔 **UUID:** ${uuid}\n\n➡️ Potrebno je dodeliti broj značke/ormarića putem komande \`/znacka dodeli\`.`)
                            .setThumbnail(interaction.user.displayAvatarURL())
                            .setTimestamp();
                        await zameniciChannel.send({ embeds: [notifEmbed] });
                    }
                } catch (e) {
                    console.warn('[LK] Nije moguće poslati obaveštenje u Zamenici kanal:', e.message);
                }

                return interaction.reply({ content: `Uspešno ste registrovani i Lična Karta je poslata u kanal!${roleWarning}`, ephemeral: true });
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
                    .setTimestamp()
                    .setFooter({ text: 'Na čekanju — čeka se odluka načelnika' });

                const approveRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`odsustvo_odobri_${interaction.user.id}`)
                        .setLabel('✅ Odobri')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`odsustvo_odbij_${interaction.user.id}`)
                        .setLabel('❌ Odbij')
                        .setStyle(ButtonStyle.Danger),
                );

                await interaction.reply({ content: '✅ Vaša prijava za odsustvo je uspešno zabeležena. Načelnik će je pregledati.', ephemeral: true });

                // Slanje u kanal za odsustva (za načelnike)
                try {
                    const odsustvoChannel = await interaction.client.channels.fetch(ODSUSTVO_CHANNEL_ID);
                    if (odsustvoChannel) {
                        await odsustvoChannel.send({ embeds: [odsustvoEmbed], components: [approveRow] });
                    }
                } catch (e) {
                    console.warn('[ODSUSTVO] Nije moguće poslati u odsustvo kanal:', e.message);
                }

                return;
            }
        }

        // Handle Slash Commands
		if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'help') {
                return interaction.reply({ content: '⚠️ Komanda `/help` je preimenovana! Molimo koristite **`/komande`** iz menija ili samo ukucajte **`!komande`** (ili `/komande`) kao običnu poruku.', ephemeral: true });
            }

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
