'use strict';

require('dotenv').load();

const path = require('path');
const express = require('express');
const events = require('events');
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

app.get('/clients', (req, res) => {
	res.set('Cache-Control', 'private, no-store');
	res.json(sse.listClients())
});

// Return a 404 if no routes match
app.use((req, res, next) => {
  res.set('Cache-Control', 'max-age=0; private');
  res.status(404).end('Not found');
});

app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});


function changeColor() {
	const newColor = [Math.round(Math.random()*255), Math.round(Math.random()*255), Math.round(Math.random()*255)];
  sse.publish({color:newColor, clientCount: sse.getSubscriberCount()}, 'colorChange');
	setTimeout(changeColor, Math.round(MIN_INTERVAL+((MAX_INTERVAL-MIN_INTERVAL)*Math.random())));
}
changeColor();
