'use strict';

require('dotenv').load();

const path = require('path');
const express = require('express');
const SSE = require('sse-node');
const events = require('events');
const moods = require('../data/moods.json');

const PORT = process.env.PORT || 3101;
const MIN_INTERVAL = 300;
const MAX_INTERVAL = 3000;

const app = express();
const eventEmitter = new events.EventEmitter();
let clientsConnected = 0;

// Serve the static part of the demo
app.use(express.static('public'));

// Process SSE requests
app.get('/stream', (req, res) => {
  const client = SSE(req, res, {ping: 5000})
	clientsConnected++;
  eventEmitter.on('moodChange', newMood => {
		client.send("Telling "+clientsConnected+" "+((clientsConnected===1)?"person":"people")+" that I am now feeling "+newMood.toLowerCase(), "moodChange");
  });
	client.onClose(() => {
		clientsConnected--;
	});
});

// Return a 404 if no routes match
app.use((req, res, next) => {
  res.set('Cache-Control', 'max-age=0; private');
  res.status(404).render("not-found");
});

app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});


function changeMood() {
	eventEmitter.emit('moodChange',  moods[Math.floor(Math.random() * moods.length)]);
	setTimeout(changeMood, Math.round(MIN_INTERVAL+((MAX_INTERVAL-MIN_INTERVAL)*Math.random())));
}
changeMood();
