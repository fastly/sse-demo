/* Flight status data simulator
 *
 * Scheduled - starting status
 * Go to gate - advance here at T-40m, 30m, 0.8
 * Boarding - advance at +10m, 5m, 0.2
 *	- % boarded - update every 1.5s, 1.2s, 0.7.  Slow down as approch capacity
 * Final call - if numBoarded < passengerCount and boarding+10m.
 * Departed - fully boarded or final call + 5m
 *
 */

const evt = new (require('events')).EventEmitter();

const destinations = [
	'New York City',
	'Barcelona',
	'Atlanta',
	'Oslo',
	'Moscow',
	'Berlin',
	'Bangkok',
	'Tokyo',
	'Helsinki',
	'Los Angeles',
	'Washington DC',
	'Dubai',
	'Rome',
	'Dublin',
	'Singapore',
	'St Petersburg',
	'Marrakesh',
	'Boston',
	'Chicago',
	'San Francisco',
	'Denver',
	'Stockholm',
	'Istanbul',
	'Vienna'
];
const airlines = ['BA', 'UA', 'AF', 'VS', 'SQ', 'DL', 'AA'];
const numflights = 10;
const passengersMean = 200;
const passengersRange = 150;

const flights = new Set();
let lastDepTime;

function nowSec() {
	return Math.round(Date.now() / 1000);
}

function randomFromDist(mode, lowdelta, highdelta, split) {
	var low = mode-lowdelta;
	var high = mode+highdelta;
	if (high === low && low === mode) return mode;
    if (split && Math.random() < split) {
      high = mode;
    } else if (split) {
      low = mode;
    }
	var c = (mode-low) / (high-low);
    var u = Math.random();
    return (u <= c) ? (low + ((high - low) * Math.sqrt(u * c))) : (high - (high - low) * Math.sqrt((1 - u) * (1 - c)));
}
function randomTimer(mode, lowdelta, highdelta, split) {
	const dur = randomFromDist(mode*1000, lowdelta*1000, highdelta*1000, split);
	return new Promise(r => setTimeout(r, dur || 10));
}

function updateFlight(flight, newdata) {
	Object.assign(flight, newdata);
	flight.lastStatusChangeTime = nowSec();
	evt.emit('statusChange', flight);
	return run(flight);
}

function run(flight) {
	const timeRemaining = Math.max(flight.departureTime - nowSec(), 0);
	if (flight.status === 'Scheduled') {

		// Go to gate 40 mins before departure
		const GTGTime = timeRemaining - (40*60);
		return (GTGTime > 0 ? randomTimer(GTGTime, (10*60), (30*60)) : randomTimer(1, 0, 0)).then(() => {
			return updateFlight(flight, {status: 'Go to gate'});
		});
	} else if (flight.status === 'Go to gate') {

		// Open for boarding 10 mins after gate opens unless < 20 mins until departure
		return (timeRemaining > (20*60) ? randomTimer(10*60, 5*60, 5*60) : randomTimer(1, 0, 0)).then(() => {
			return updateFlight(flight, {status: 'Boarding'});
		});
	} else if (flight.status === 'Boarding' || flight.status === 'Final Call') {
		const pctBoarded = flight.passengerBoardedCount / flight.passengerCount;
		const remaining = flight.passengerCount - flight.passengerBoardedCount;
		const boardRate = (timeRemaining > 600) ? [5,5,10] : (pctBoarded < 0.1) ? [1,1,5,0.3] : (pctBoarded < 0.6) ? [1,1,2,0.7] : (pctBoarded < 0.8) ? [1,1,10,0.7] : (remaining > 5) ? [2,2,10,0.7] : [15,15,20,0.5];
		return randomTimer(...boardRate).then(() => {
			flight.passengerBoardedCount++;
			if (flight.passengerBoardedCount === flight.passengerCount || (timeRemaining === 0 && Math.random() < 0.01)) {
				return updateFlight(flight, {status: 'Closed'});
			} else if (flight.status === 'Boarding' && flight.lastStatusChangeTime < (nowSec() - 300) && timeRemaining < (10*60) && pctBoarded > .8) {
				return updateFlight(flight, {status: 'Final Call'});
			}
			evt.emit('statusChange', flight);
			return run(flight);
		});
	} else if (flight.status === 'Closed') {

		// Flight can depart up to a minute early and no more than 2 mins late
		return randomTimer(timeRemaining, 60, (2*60)).then(() => {
			return updateFlight(flight, {status: 'Departed'});
		});
	} else if (flight.status === 'Departed') {
		return randomTimer(5, 0, 0).then(() => {
			flights.delete(flight);
			evt.emit('deleteFlight', flight);
			createFlight();
		});
	}
}

function createFlight() {
	const f = {
		id: airlines[Math.floor(Math.random() * airlines.length)] + Math.floor(Math.random() * 1000),
		destination: destinations[Math.floor(Math.random() * destinations.length)],
		departureTime: lastDepTime + randomFromDist(400, 400, 0.1),
		createdTime: nowSec(),
		lastStatusChangeTime: nowSec(),
		passengerCount: Math.round(randomFromDist(passengersMean, passengersRange, passengersRange)),
		passengerBoardedCount: 0,
		status: 'Scheduled'
	}
	lastDepTime = f.departureTime;
	flights.add(f);
	evt.emit('createFlight', f);
	run(f);
}

function start() {
	lastDepTime = nowSec();
	for (let i=0; i<numflights; i++) {
		createFlight();
	}
}

module.exports = {
	getFlights: () => Array.from(flights).sort((f1, f2) => (f1.departureTime > f2.departureTime) ? 1 : -1),
	on: evt.on.bind(evt),
	startSimulation: start
};
