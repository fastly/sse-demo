module.exports = function SSEChannel(options) {

	options = Object.assign({}, options, {
		pingInterval: 3000,
		maxStreamDuration: 30000,
		clientRetryInterval: 1000
	});

	let msgID = 0;
	const clients = new Set();

	function publish(data, eventName) {
		const thisID = msgID++;
		if (typeof data === "object") data = JSON.stringify(data);
		data = data ? data.split(/[\r\n]+/).map(str => 'data: '+str).join('\n') : '';

		clients.forEach(c => {
			if (data) c.res.write("id: " + thisID + "\n");
			if (eventName) c.res.write("event: " + eventName + "\n");
			c.res.write(data+'\n\n');
		});
	}

	function subscribe(c) {
		c.req.socket.setNoDelay(true);
		c.res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "max-age="+(Math.floor(options.maxStreamDuration/1000)-1),
			"Connection": "keep-alive"
		});
		c.res.write("retry: " + options.clientRetryInterval + '\n');
		clients.add(c);
		setTimeout(() => {
			if (!c.res.finished) {
				unsubscribe(c);
			}
		}, options.maxStreamDuration);
		c.res.on('close', () => unsubscribe(c));
	}

	function unsubscribe(c) {
		c.res.end();
		clients.delete(c);
	}

	function listClients() {
		const rollupByIP = {};
		clients.forEach(c => {
			const ip = c.req.connection.remoteAddress;
			if (!(ip in rollupByIP)) {
				rollupByIP[ip] = 0;
			}
			rollupByIP[ip]++;
		});
		return rollupByIP;
	}

	if (options.pingInterval) {
		setInterval(publish, options.pingInterval);
	}

	return {
		publish: (data, eventName) => publish(data, eventName),
		subscribe: (req, res) => subscribe({req,res}),
		getSubscriberCount: () => clients.size,
		listClients: () => listClients()
	};
};
