const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-pravila')
        .setDescription('Postavlja panel sa pravilima LSPD-a u trenutni kanal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#1a5276') 
            .setTitle('LSPD - Zvanični Pravilnik i Propisi')
            .setDescription('Svi službenici Los Santos Police Department-a su u obavezi da se strogo pridržavaju sledećih pravila. Nepoštovanje istih rezultiraće disciplinskim merama, suspenzijama ili trajnim udaljavanjem iz službe (Blacklist).')
            .addFields(
                { 
                    name: '1. Aktivnost i Dužnost', 
                    value: '• **Neaktivnost:** Odsustvo duže od 48 sati bez prethodne zvanične najave rezultira otkazom.\n• **Evidencija:** Obavezna je prijava/odjava sa dužnosti pre i nakon smene. Rad na crno znači otkaz.\n• **Sastanci:** Prisustvo na zakazanim sastancima je obavezno. Neopravdan izostanak rezultira otkazom.' 
                },
                { 
                    name: '2. Lanac Komande i Ponašanje', 
                    value: '• **Hijerarhija:** Strogo poštovanje viših činova (High Command). Nepoštovanje donosi disciplinski minus.\n• **Kolegijalnost:** Vređanje ili neprofesionalno ponašanje prema kolegama kažnjava se momentalnim otkazom.\n• **Intervencije:** Zahteva se maksimalan profesionalizam i fokus na visoko-rizičnim akcijama (npr. Zlatara).' 
                },
                { 
                    name: '3. Radio Veza i Komunikacija', 
                    value: '• **Identifikacija:** Na radiju je strogo zabranjeno oslovljavanje po imenu, isključivo po broju značke.\n• **Prisutnost:** Tokom boravka u gradu (In-Game), službenik mora biti na radiju ili u zvaničnom voice kanalu. Ignorisanje ovog pravila znači otkaz i Blacklist.\n• **Oslovljavanje:** Obavezno je korišćenje zvaničnih prefiksa ("šef-"). Nepoštovanje donosi Blacklist.' 
                },
                { 
                    name: '4. Operacije i Rešavanje Konflikata', 
                    value: '• **Racije:** Nepripremljenost do trenutka početka racije donosi zabranu učešća u istoj i disciplinski minus.\n• **Konflikti:** Svaki nesporazum sa drugom policijskom upravom ili organizacijom rešava se isključivo otvaranjem Tiketa na Discordu ili pozivanjem administracije (Report).' 
                }
            )
            .setTimestamp()
            .setFooter({ text: 'LSPD High Command | Odeljenje za Unutrašnju Kontrolu' });

        await interaction.channel.send({ embeds: [embed] });
        await interaction.reply({ content: 'Panel je uspešno postavljen. NAPOMENA: Ova komanda se koristi isključivo jednokratno prilikom postavljanja panela.', ephemeral: true });
    },
};
