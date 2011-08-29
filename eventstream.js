/**
 * The event stream constructor.
 *
 * @access  public
 * @param   object    an http(s) request object
 * @param   object    an http(s) response object
 */
module.exports.EventStream = function(req, res) {
	
	var isOpen = true;
	res.on('close', function() {
		isOpen = false;
	});
	res.on('end', function() {
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
		res.write(opts.field + ': ' + opts.value + '\n');
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
		value: data + '\n'
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
	
// ----------------------------------------------------------------------------
//  Helpers

/**
 * Escape a string for use in a regex
 *
 * @access  private
 * @param   string     the string to escape
 * @return  string
 */
var escapeRegex = (function() {
	var specialChars = [
		'/', '.', '*', '+', '?', '|', '(',
		')', '[', ']', '{', '}', '\\'
	];
	var escaper = new RegExp('(\\' + specialChars.join('|\\') + ')', 'g');
	return function(str) {
		str.replace(escaper, '\\$1');
	};
}());

/**
 * Replace all occurences of one a string
 *
 * @access  private
 * @param   string    the string to search in
 * @param   string    the string to replace
 * @param   string    the string to replace with
 * @return  string
 */
var stringReplace = (function() {
	var regexes = { };
	return function(text, str1, str2) {
		if (! regexes[str1]) {
			regexes[str1] = new RegExp(escapeRegex(str1), 'g');
		}
		return text.replace(regexes[str1], str2);
	};
}());

/**
 * Process a string for outputting as a message
 *
 * @access  private
 * @param   string    the field string
 * @param   string    the message string
 * @return  string
 */
var processMessage = function(field, msg) {
	msg = stringReplace(msg, '\r\n', '\n');
	msg = stringReplace(msg, '\r', '\n');
	msg = stringReplace(msg, '\n', '\n' + field + ': ');
	return msg + '\n';
};
	
/* End of file eventstream.js */
