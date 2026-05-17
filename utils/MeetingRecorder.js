const { joinVoiceChannel, EndBehaviorType, VoiceConnectionStatus } = require('@discordjs/voice');
const prism = require('prism-media');
const { pipeline } = require('stream');
const fs = require('fs');
const path = require('path');

const activeMeetings = new Map();

class MeetingRecorder {
    constructor(interaction, guildId, channelId) {
        this.interaction = interaction;
        this.guildId = guildId;
        this.channelId = channelId;
        this.connection = null;
        this.userStreams = new Map(); // userId -> write stream
        this.startTime = Date.now();
        this.recordingsDir = path.join(process.cwd(), 'recordings', guildId);
        
        if (!fs.existsSync(this.recordingsDir)) {
            fs.mkdirSync(this.recordingsDir, { recursive: true });
        }
    }

    start() {
        this.connection = joinVoiceChannel({
            channelId: this.channelId,
            guildId: this.guildId,
            adapterCreator: this.interaction.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true
        });

        this.connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`Pocelo snimanje u kanalu ${this.channelId}`);
            
            this.connection.receiver.speaking.on('start', (userId) => {
                this.recordUser(userId);
            });
        });
    }

    recordUser(userId) {
        // Ako vec snimamo ovog korisnika, ignorisemo
        if (this.userStreams.has(userId)) return;

        console.log(`Zapoceto snimanje za korisnika ${userId}`);
        const stream = this.connection.receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.Manual,
            },
        });

        const filename = path.join(this.recordingsDir, `${userId}-${this.startTime}.ogg`);
        const out = fs.createWriteStream(filename);

        const oggStream = new prism.opus.OggLogicalBitstream({
            opusHead: new prism.opus.OpusHead({
                channelCount: 2,
                sampleRate: 48000,
            }),
            pageSizeControl: {
                maxPackets: 10,
            },
        });

        pipeline(stream, oggStream, out, (err) => {
            if (err) {
                console.error(`Greska pri snimanju za ${userId}:`, err);
            }
        });

        this.userStreams.set(userId, { out, filename });
    }

    stop() {
        if (this.connection) {
            this.connection.destroy();
        }

        const files = [];
        for (const [userId, data] of this.userStreams.entries()) {
            data.out.end();
            files.push(data.filename);
        }
        
        this.userStreams.clear();
        return files;
    }
}

module.exports = {
    startMeeting: (interaction) => {
        const member = interaction.member;
        if (!member.voice.channel) {
            return { error: 'Morate biti u Voice kanalu da biste započeli sastanak.' };
        }

        const guildId = interaction.guildId;
        if (activeMeetings.has(guildId)) {
            return { error: 'Sastanak je već u toku na ovom serveru.' };
        }

        const recorder = new MeetingRecorder(interaction, guildId, member.voice.channel.id);
        recorder.start();
        activeMeetings.set(guildId, recorder);

        return { success: true };
    },
    
    stopMeeting: (guildId) => {
        if (!activeMeetings.has(guildId)) {
            return { error: 'Nema aktivnog sastanka na ovom serveru.' };
        }

        const recorder = activeMeetings.get(guildId);
        const files = recorder.stop();
        activeMeetings.delete(guildId);

        return { success: true, files };
    }
};
