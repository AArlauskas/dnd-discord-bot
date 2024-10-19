const {ApplicationCommandOptionType} = require('discord.js');
const {useMainPlayer} = require('discord-player');
const {isInVoiceChannel} = require('../utils/voicechannel');
const {getPlaylistByName} = require('../utils/playlist');

module.exports = {
    name: 'playlist',
    description: 'Play a playlist!',
    options: [
        {
            name: 'query',
            type: ApplicationCommandOptionType.String,
            description: 'Playlist name',
            required: true,
        },
    ],
    async execute(interaction) {
        const {default: Conf} = await import('conf');
        try {
            const inVoiceChannel = isInVoiceChannel(interaction);
            if (!inVoiceChannel) {
                return;
            }

            // check if interaction is deferred
            if (!interaction.deferred) {
                await interaction.deferReply();
            }

            const player = useMainPlayer();
            const query = interaction.options.getString('query');
            const playlist = getPlaylistByName(query);
            if (!playlist) return void interaction.followUp({content: 'No playlists were found!'});
            const tracks = playlist.tracks;

            try {
                const config = new Conf({projectName: 'volume'});

                for (const track of tracks) {
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
                            volume: config.get('volume') || 10,
                            //defaultFFmpegFilters: ['lofi', 'bassboost', 'normalizer']
                        },
                    });
                }

                await interaction.followUp({
                    content: `⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...`,
                });
            } catch (error) {
                await interaction.editReply({
                    content: 'An error has occurred!',
                });
                return console.log(error);
            }
        } catch (error) {
            await interaction.reply({
                content: 'There was an error trying to execute that command: ' + error.message,
            });
        }
    },
};
