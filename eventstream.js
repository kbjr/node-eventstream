/**
 * The event stream constructor.
 *
 * @access  public
 * @param   object    an http(s) request object
 * @param   object    an http(s) response object
 */
module.exports.EventStream = function(req, res) {
	
	var isOpen = true;
	req.on('close', function() {
		isOpen = false;
	});
	
	/**
	 * Last-Event-ID header value
	 */
	this.lastEventId = null;
	
	/**
	 * Initialize the stream
	 *
	 * @access  public
	 * @return  void
	 */
	this.init = function() {
		this.lastEventId = req.headers['last-event-id'] || null;
		res.writeHead(200, {
			'Content-Type': 'text/event-stream; charset=utf-8'
		});
	};
	
	/**
	 * Is the connection open?
	 */
	this.isOpen = function() {
		return isOpen;
	};
	
	/**
	 * Send a message to the client
	 *
	 * @access  public
	 * @param   object    the options object
	 * @return  void
	 */
	this.send = function(opts) {
		opts = opts || { };
		opts.value = opts.value || '';
		opts.field = (typeof opts.field === 'string')
			? opts.field
			: 'data';
		opts.value = (typeof opts.encode === 'function')
			? opts.encode(opts.value)
			: this.encode(opts.value);
		opts.value.split("\n").forEach(function(line) {
			res.write(opts.field + ': ' + line + '\n');
		});
		if(opts.field == 'data') {
			res.write('\n');
		}
	};
	
	/**
	 * Close the stream
	 *
	 * @access  public
	 * @return  void
	 */
	this.close = function() {
		isOpen = false;
		res.end();
	};
	
	/**
	 * Send a keep-alive message
	 */
	this.keepAlive = function() {
		this.sendComment('Keep-Alive');
	};
	
};

/**
 * The data encoding method. This can be overriden to allow easy sending
 * of serialized data (eg. JSON).
 *
 * @access  public
 * @param   string    
 */
module.exports.EventStream.prototype.encode = function(value) {
	return String(value);
};
	
/**
 * Send a comment to the client
 *
 * @access  public
 * @param   string    the comment
 * @return  void
 */
module.exports.EventStream.prototype.sendComment = function(text) {
	return this.send({
		field: '',
		value: text,
		encode: String
	});
};

/**
 * Send an "event" message to the client
 *
 * @access  public
 * @param   string    the value to send
 * @return  void
 */
module.exports.EventStream.prototype.sendEvent = function(event) {
	return this.send({
		field: 'event',
		value: event,
		encode: String
	});
};

/**
 * Send a "data" message to the client
 *
 * @access  public
 * @param   mixed     the value to send
 * @return  void
 */
module.exports.EventStream.prototype.sendData = function(data) {
	return this.send({
		field: 'data',
		value: data
	});
};

/**
 * Send an "id" message to the client
 *
 * @access  public
 * @param   string    the value to send
 * @return  void
 */
module.exports.EventStream.prototype.sendId = function(id) {
	this.lastEventId = String(id);
	return this.send({
		field: 'id',
		value: id,
		encode: String
	});
};

/**
 * Send a "retry" message to the client
 *
 * @access  public
 * @param   number    the number of milliseconds to wait until retrying the connection
 * @return  void
 */
module.exports.EventStream.prototype.sendRetry = function(millisecs) {
	millisecs = parseInt(millisecs);
	if (isNaN(millisecs)) {
		throw new TypeError();
	}
	return this.send({
		field: 'retry',
		value: millisecs,
		encode: String
	});
};

/**
 * Send a message, with other optional params
 *
 * @access  public
 * @param   object    the options object
 * @return  void
 */
module.exports.EventStream.prototype.sendMessage = function(opts) {
	if (opts.event) {
		this.sendEvent(opts.event);
	}
	if (opts.id) {
		this.sendId(opts.id);
	}
	if (opts.retry) {
		this.sendRetry(opts.retry);
	}
	this.sendData(opts.data);
};
	
/* End of file eventstream.js */
