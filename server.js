// server.js - Simple Express server for Spotify validation
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Spotify API helper
async function getSpotifyToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
        },
        body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
}

// Validate playlist endpoint
app.post('/api/validate-playlist', async (req, res) => {
    try {
        const { playlistUrl } = req.body;
        
        // Extract playlist ID
        const playlistId = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/)?.[1];
        if (!playlistId) {
            return res.status(400).json({ 
                valid: false, 
                error: 'Invalid Spotify playlist URL format' 
            });
        }

        // Get Spotify token
        const token = await getSpotifyToken();
        
        // Fetch playlist data
        const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return res.json({ 
                    valid: false, 
                    error: 'Playlist not found or is private' 
                });
            }
            return res.json({ 
                valid: false, 
                error: 'Unable to access playlist' 
            });
        }

        const playlist = await response.json();
        
        res.json({
            valid: true,
            name: playlist.name,
            description: playlist.description || '',
            tracks: playlist.tracks.total,
            owner: playlist.owner.display_name,
            image: playlist.images[0]?.url || null,
            external_url: playlist.external_urls.spotify,
            playlistId: playlistId
        });
        
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ 
            valid: false, 
            error: 'Server error during validation' 
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Spotify validation service running' });
});

app.listen(PORT, () => {
    console.log(`Validation server running on port ${PORT}`);
});

// package.json content for this backend:
/*
{
  "name": "spotify-validation-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "node-fetch": "^3.3.2"
  }
}
*/
