'use strict';

require('dotenv').load();

const path = require('path');
const express = require('express');
const events = require('events');
const moods = require('../data/moods.json');
const SSEChannel = require('./sse.js');

const PORT = process.env.PORT || 3101;
const MIN_INTERVAL = 300;
const MAX_INTERVAL = 3000;

const app = express();
const sse = SSEChannel();

// Serve the static part of the demo
app.use(express.static('public'));

// Process SSE subscribers
app.get('/stream', (req, res) => sse.subscribe(req, res));

// Return a 404 if no routes match
app.use((req, res, next) => {
  res.set('Cache-Control', 'max-age=0; private');
  res.status(404).end('Not found');
});

app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});


function changeMood() {
	const newMood = moods[Math.floor(Math.random() * moods.length)];
  sse.publish({newMood:newMood, clientCount: sse.getSubscriberCount()}, 'moodChange');
	setTimeout(changeMood, Math.round(MIN_INTERVAL+((MAX_INTERVAL-MIN_INTERVAL)*Math.random())));
}
changeMood();
