const path = require('path');
const fs = require('fs');

const CurrentPlaylists = [];

const initializePlaylists = () => {
    const playlistDir = path.join(__dirname, '../Playlists');

    fs.readdir(playlistDir, (err, files) => {
        if (err) {
            console.error(err);
            return;
        }

        // console log contents of text files
        files.forEach(file => {
            const content = fs.readFileSync(path.join(playlistDir, file), 'utf8');

            // split by new line
            const tracks = content.split('\n');
            const fixedTracks = tracks.map(track => {
                // remove \r if it exists
                return track.replace('\r', '').trim();
            });

            const fixedFileName = file.replace('.txt', '');

            const playlist = {
                name: fixedFileName,
                tracks: fixedTracks,
            };

            CurrentPlaylists.push(playlist);
        });
    });
};

const printPlaylists = () => {
    const playlistNames = CurrentPlaylists.map(playlist => playlist.name);
    console.log('Current playlists:', playlistNames);
};

const getPlaylistByName = name => {
    return CurrentPlaylists.find(playlist => playlist.name.toLowerCase() === name.toLowerCase());
};

module.exports = {
    initializePlaylists,
    printPlaylists,
    getPlaylistByName,
    CurrentPlaylists,
};
