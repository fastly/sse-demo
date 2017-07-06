'use strict';

require('dotenv').load();

const path = require('path');
const express = require('express');

const SSEChannel = require('./sse');
const airport = require('./airport-departures');
const colors = require('./colors');

const PORT = process.env.PORT || 3101;

const app = express();
const sseFlights = SSEChannel();
const sseColors = SSEChannel();

// Serve the static part of the demo
app.use(express.static('public'));

// Flights
app.get('/flights/getData', (req, res) => res.json(airport.getFlights()));
app.get('/flights/stream', (req, res) => sseFlights.subscribe(req, res));
airport.on('createFlight', f => sseFlights.publish(f, 'createFlight'));
airport.on('statusChange', f => sseFlights.publish(f, 'statusChange'));
airport.on('deleteFlight', f => sseFlights.publish(f, 'deleteFlight'));

// Colors
app.get('/colors/stream', (req, res) => sseColors.subscribe(req, res));
colors.on('colorChange', c => sseColors.publish(Object.assign({clientCount: sseColors.getSubscriberCount()}, c), 'colorChange'));

// Debug utilities
app.get('/clients', (req, res) => {
	res.set('Cache-Control', 'private, no-store');
	res.json(sse.listClients())
});

// Return a 404 if no routes match
app.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  res.status(404).end('Not found');
});

app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
	airport.startSimulation();
});
