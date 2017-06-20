module.exports = function SSEChannel(options) {

	options = Object.assign({}, options, {
		pingInterval: 3000,
		maxStreamDuration: 30000,
		clientRetryInterval: 5000
	});

	let msgID = 0;
	const clients = new Set();

	function publish(data, eventName) {
		const thisID = msgID++;
		if (typeof data === "object") data = JSON.stringify(data);
		data = data ? data.split(/[\r\n]+/).map(str => 'data: '+str).join('\n') : '';

		clients.forEach(res => {
			if (data) res.write("id: " + thisID + "\n");
			if (eventName) res.write("event: " + eventName + "\n");
			res.write(data+'\n\n');
		});
	}

	function subscribe(req, res) {
		req.socket.setNoDelay(true);
		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "max-age=0; no-cache",
			"Connection": "keep-alive"
		});
		res.write("retry: " + options.clientRetryInterval + '\n');
		clients.add(res);
		setTimeout(() => {
			if (!res.finished) {
				unsubscribe(res);
			}
		}, options.maxStreamDuration);
		res.on('close', () => unsubscribe(res));
	}

	function unsubscribe(res) {
		console.log("Unsubscribed");
		clients.delete(res);
		res.end();
	}

	if (options.pingInterval) {
		setInterval(publish, options.pingInterval);
	}

	return {
		publish:publish,
		subscribe: subscribe,
		getSubscriberCount: () => clients.size
	};
};
