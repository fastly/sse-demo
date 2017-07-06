
const evt = new (require('events')).EventEmitter();

const MIN_INTERVAL = 200;
const MAX_INTERVAL = 1500;

function changeColor() {
	const newColor = [Math.round(Math.random()*255), Math.round(Math.random()*255), Math.round(Math.random()*255)];
	evt.emit('colorChange', {color:newColor});
	setTimeout(changeColor, Math.round(MIN_INTERVAL+((MAX_INTERVAL-MIN_INTERVAL)*Math.random())));
}

changeColor();

module.exports = {
	on: evt.on.bind(evt)
};
