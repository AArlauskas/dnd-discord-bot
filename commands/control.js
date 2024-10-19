// command that list all of playlists as buttons

const {UserSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType} = require('discord.js');
const {useQueue, useMainPlayer} = require('discord-player');
const {isInVoiceChannel} = require('../utils/voicechannel');
const {CurrentPlaylists, getPlaylistByName} = require('../utils/playlist');
const {execute: playlistExecute} = require('./playlist');

module.exports = {
    name: 'control',
    description: 'List all of playlists as buttons.',
    async execute(interaction) {
        const inVoiceChannel = isInVoiceChannel(interaction);
        if (!inVoiceChannel) {
            return;
        }

        // row can have up to 5 buttons
        const rows = [];

        await interaction.deferReply();

        for (let i = 0; i < CurrentPlaylists.length; i += 5) {
            const row = new ActionRowBuilder();
            const buttons = [];
            for (let j = i; j < i + 5; j++) {
                if (j >= CurrentPlaylists.length) break;
                const playlist = CurrentPlaylists[j];
                const button = new ButtonBuilder()
                    .setCustomId(`${playlist.name}`)
                    .setLabel(playlist.name)
                    .setStyle(ButtonStyle.Primary);

                buttons.push(button);
            }
            row.addComponents(buttons);
            rows.push(row);
        }

        const rowsBy5 = [];
        for (let i = 0; i < rows.length; i += 5) {
            const row = rows.slice(i, i + 5);
            rowsBy5.push(row);
        }

        const responses = [];
        for (const row of rowsBy5) {
            const response = await interaction.followUp({
                content: 'Select a playlist!',
                components: row,
            });

            responses.push(response);
        }

        for (const response of responses) {
            const collector = response.createMessageComponentCollector({
                ComponentType: ComponentType.Button,
            });

            collector.on('collect', async interaction => {
                console.log('interaction', interaction.customId);

                interaction.reply({
                    content: `You selected ${interaction.customId}`,
                });

                const player = useMainPlayer();

                // stop current queue
                const queue = useQueue(interaction.guild.id);
                if (queue) {
                    queue.node.stop();
                }

                const query = interaction.customId;
                const playlist = getPlaylistByName(query);
                if (!playlist) return void interaction.followUp({content: 'No playlists were found!'});
                const tracks = playlist.tracks;

                for (const track of tracks) {
                    if (!track.includes('https://')) {
                        continue;
                    }
                    const searchResult = await player.search(track);
                    if (!searchResult.hasTracks()) {
                        console.log('No results were found!');
                        continue;
                    }

                    await player.play(interaction.member.voice.channel.id, searchResult, {
                        nodeOptions: {
                            metadata: {
                                channel: interaction.channel,
                                client: interaction.guild?.members.me,
                                requestedBy: interaction.user.username,
                            },
                            leaveOnEmptyCooldown: 300000,
                            leaveOnEmpty: true,
                            leaveOnEnd: false,
                            bufferingTimeout: 0,
                            volume: 10,
                        },
                    });

                    const createdQueue = useQueue(interaction.guild.id);
                    createdQueue.tracks.shuffle();
                }
            });
        }

        // add control buttons: stop, shuffle, skip, pause, resume
        const controlRow = new ActionRowBuilder();
        const stopButton = new ButtonBuilder().setCustomId('stop').setLabel('Stop').setStyle(ButtonStyle.Danger);

        const shuffleButton = new ButtonBuilder()
            .setCustomId('shuffle')
            .setLabel('Shuffle')
            .setStyle(ButtonStyle.Secondary);

        const skipButton = new ButtonBuilder().setCustomId('skip').setLabel('Skip').setStyle(ButtonStyle.Secondary);

        const pauseButton = new ButtonBuilder().setCustomId('pause').setLabel('Pause').setStyle(ButtonStyle.Secondary);

        const resumeButton = new ButtonBuilder().setCustomId('resume').setLabel('Resume').setStyle(ButtonStyle.Success);

        controlRow.addComponents([stopButton, shuffleButton, skipButton, pauseButton, resumeButton]);

        await interaction.followUp({
            content: 'Control buttons',
            components: [controlRow],
        });

        const controlCollector = interaction.channel.createMessageComponentCollector({
            ComponentType: ComponentType.Button,
        });

        controlCollector.on('collect', async interaction => {
            console.log('interaction', interaction.customId);

            // filter out control buttons
            if (!['stop', 'shuffle', 'skip', 'pause', 'resume'].includes(interaction.customId) || !interaction.guild) {
                return;
            }

            const queue = useQueue(interaction.guild.id);

            switch (interaction.customId) {
                case 'stop':
                    if (!queue || !queue.currentTrack) {
                        return void interaction.reply({
                            content: '❌ | No music is being played!',
                        });
                    }
                    queue.node.stop();
                    return void interaction.reply({
                        content: '🛑 | Stopped the player!',
                    });
                case 'shuffle':
                    if (!queue || !queue.currentTrack) {
                        return void interaction.reply({
                            content: '❌ | No music is being played!',
                        });
                    }
                    queue.tracks.shuffle();
                    return void interaction.reply({
                        content: '🔀 | Shuffled the queue!',
                    });
                case 'skip':
                    if (!queue || !queue.currentTrack) {
                        return void interaction.reply({
                            content: '❌ | No music is being played!',
                        });
                    }
                    queue.node.skip();
                    return void interaction.reply({
                        content: '⏭ | Skipped the song!',
                    });
                case 'pause':
                    if (!queue || !queue.currentTrack) {
                        return void interaction.reply({
                            content: '❌ | No music is being played!',
                        });
                    }
                    queue.node.pause();
                    return void interaction.reply({
                        content: '⏸ | Paused the player!',
                    });
                case 'resume':
                    if (!queue || !queue.currentTrack) {
                        return void interaction.reply({
                            content: '❌ | No music is being played!',
                        });
                    }
                    queue.node.resume();
                    return void interaction.reply({
                        content: '▶ | Resumed the player!',
                    });
                default:
                    return void interaction.reply({
                        content: '❌ | Something went wrong!',
                    });
            }
        });
    },
};
