var Service, Characteristic;
var request = require("request");
var xpath = require("xpath");
var dom = require("xmldom").DOMParser;
var pollingtoevent = require('polling-to-event');

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-http-accessory", "HttpAccessory", HttpAccessory);
};

/**
 * Mapper class that can be used as a dictionary for mapping one value to another
 *
 * @param {Object} parameters The parameters of the mapper
 * @constructor
 */
function StaticMapper(parameters) {
	var self = this;
	self.mapping = parameters.mapping;

	self.map = function(value) {
		return self.mapping[value] || value;
	};
}

/**
 * Mapper class that can extract a part of the string using a regex
 *
 * @param {Object} parameters The parameters of the mapper
 * @constructor
 */
function RegexMapper(parameters) {
	var self = this;
	self.regexp = new RegExp(parameters.regexp);
	self.capture = parameters.capture || "1";

	self.map = function(value) {
		var matches = self.regexp.exec(value);

		if (matches !== null && self.capture in matches) {
			return matches[self.capture];
		}

		return value;
	};
}

/**
 * Mapper class that uses XPath to select the text of a node or the value of an attribute
 *
 * @param {Object} parameters The parameters of the mapper
 * @constructor
 */
function XPathMapper(parameters) {
	var self = this;
	self.xpath = parameters.xpath;
	self.index = parameters.index || 0;

	self.map = function(value) {
		var document = new dom().parseFromString(value);
		var result  = xpath.select(this.xpath, document);

		if (typeof result == "string") {
			return result;
		} else if (result instanceof Array && result.length > self.index) {
			return result[self.index].data;
		}

		return value;
	};
}

function HttpAccessory(log, config) {
	this.log = log;
	this.name = config.name;
	this.service = config.service;
	this.apiBaseUrl = config.apiBaseUrl;
	this.apiSuffixUrl = config.apiSuffixUrl || "";
	this.optionCharacteristic = config.optionCharacteristic || [];
	this.forceRefreshDelay = config.forceRefreshDelay || 0;
	this.log(this.name, this.apiroute);
	this.enableSet = true;
	//this.emitterActionNames = [];
	this.statusEmitters = [];
	// process the mappers
	var self = this;
	self.debug = config.debug;
	self.mappers = [];
	if (config.mappers) {
		config.mappers.forEach(function(matches) {
			switch (matches.type) {
				case "regex":
					self.mappers.push(new RegexMapper(matches.parameters));
					break;
				case "static":
					self.mappers.push(new StaticMapper(matches.parameters));
					break;
				case "xpath":
					self.mappers.push(new XPathMapper(matches.parameters));
					break;
			}
		});
	}
	if(config.urls)
		self.urls = config.urls;
	self.httpMethod = config["http_method"] || "GET";
	self.auth = {
		username: config.username || "",
		password: config.password || "",
		immediately: true
	};

	if ("immediately" in config) {
		self.auth.immediately = config.immediately;
	}


}



HttpAccessory.prototype = {
	/**
 * Logs a message to the HomeBridge log
 *
 * Only logs the message if the debug flag is on.
 */
	debugLog : function () {
		if (this.debug) {
			this.log.apply(this, arguments);
		}
	},
/**
 * Method that performs a HTTP request
 *
 * @param url The URL to hit
 * @param body The body of the request
 * @param callback Callback method to call with the result or error (error, response, body)
 */
	httpRequest : function(url, body, callback) {
		request({
			url: url,
			body: body,
			method: this.httpMethod,
			auth: {
				user: this.auth.username,
				pass: this.auth.password,
				sendImmediately: this.auth.immediately
			},
			headers: {
				Authorization: "Basic " + new Buffer(this.auth.username + ":" + this.auth.password).toString("base64")
			}
		},
		function(error, response, body) {
			callback(error, response, body)
		});
	},

/**
 * Applies the mappers to the state string received
 *
 * @param {string} string The string to apply the mappers to
 * @returns {string} The modified string after all mappers have been applied
 */
	applyMappers : function(string) {
		var self = this;

		if (self.mappers.length > 0) {
			self.debugLog("Applying mappers on " + string);
			self.mappers.forEach(function (mapper, index) {
				var newString = mapper.map(string);
				self.debugLog("Mapper " + index + " mapped " + string + " to " + newString);
				string = newString;
			});

			self.debugLog("Mapping result is " + string);
		}

		return string;
	},

	//Start
	identify: function (callback) {
		this.log("Identify requested!");
		callback(null);
	},
	getName: function (callback) {
		this.log("getName :", this.name);
		var error = null;
		callback(error, this.name);
	},
	
	getServices: function () {
		var getDispatch = function (callback, characteristic) {
			var actionName = "get" + characteristic.displayName.replace(/\s/g, '');
			var self = this;
			var url = self.urls[actionName];
			this.log("getDispatch:actionName:url", actionName, url); 
			if (!url) {
				callback(null);
			}

			this.httpRequest(url, "", function(error, response, responseBody) {
				if (error) {
					this.log("GetState function failed: %s", error.message);
					callback(error);
				} else {
					var state = responseBody;
					state = this.applyMappers(state);
					callback(null, parseInt(state));
				}
			}.bind(this));

		}.bind(this);

		var setDispatch = function (value, callback, characteristic) {
			if (this.enableSet == false) { callback() }
			else {
				var actionName = "set" + characteristic.displayName.replace(/\s/g, '')
				this.log("setDispatch:actionName:value: ", actionName, value); 
				request.get({ url: this.apiBaseUrl + "/" + actionName + this.apiSuffixUrl + "/" + value }, function (err, response, body) 
				{
					if (!err && response.statusCode == 200) 
					{ 
					this.log("setDispatch:returnedvalue: ", JSON.parse(body).value);
					callback(null, JSON.parse(body).value);
					}
					else { this.log("Error getting state: %s", actionName, err); callback(err); }
				}.bind(this));
			}
		}.bind(this);

		// you can OPTIONALLY create an information service if you wish to override / the default values for things like serial number, model, etc.
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, "Custom Manufacturer")
			.setCharacteristic(Characteristic.Model, "HTTP Accessory Model")
			.setCharacteristic(Characteristic.SerialNumber, "HTTP Accessory Serial Number");

		var newService = null
		switch (this.service) {
			case "AccessoryInformation": newService = new Service.AccessoryInformation(this.name); break;
			case "AirQualitySensor": newService = new Service.AirQualitySensor(this.name); break;
			case "BatteryService": newService = new Service.BatteryService(this.name); break;
			case "BridgeConfiguration": newService = new Service.BridgeConfiguration(this.name); break;
			case "BridgingState": newService = new Service.BridgingState(this.name); break;
			case "CameraControl": newService = new Service.CameraControl(this.name); break;
			case "CameraRTPStreamManagement": newService = new Service.CameraRTPStreamManagement(this.name); break;
			case "CarbonDioxideSensor": newService = new Service.CarbonDioxideSensor(this.name); break;
			case "CarbonMonoxideSensor": newService = new Service.CarbonMonoxideSensor(this.name); break;
			case "ContactSensor": newService = new Service.ContactSensor(this.name); break;
			case "Door": newService = new Service.Door(this.name); break;
			case "Doorbell": newService = new Service.Doorbell(this.name); break;
			case "Fan": newService = new Service.Fan(this.name); break;
			case "GarageDoorOpener": newService = new Service.GarageDoorOpener(this.name); break;
			case "HumiditySensor": newService = new Service.HumiditySensor(this.name); break;
			case "LeakSensor": newService = new Service.LeakSensor(this.name); break;
			case "LightSensor": newService = new Service.LightSensor(this.name); break;
			case "Lightbulb": newService = new Service.Lightbulb(this.name); break;
			case "LockManagement": newService = new Service.LockManagement(this.name); break;
			case "LockMechanism": newService = new Service.LockMechanism(this.name); break;
			case "Microphone": newService = new Service.LockMechanism(this.name); break;
			case "MotionSensor": newService = new Service.MotionSensor(this.name); break;
			case "OccupancySensor": newService = new Service.OccupancySensor(this.name); break;
			case "Outlet": newService = new Service.Outlet(this.name); break;
			case "Pairing": newService = new Service.Pairing(this.name); break;
			case "ProtocolInformation": newService = new Service.ProtocolInformation(this.name); break;
			case "Relay": newService = new Service.Relay(this.name); break;
			case "SecuritySystem": newService = new Service.SecuritySystem(this.name); break;
			case "SmokeSensor": newService = new Service.SmokeSensor(this.name); break;
			case "Speaker": newService = new Service.Speaker(this.name); break;
			case "StatefulProgrammableSwitch": newService = new Service.StatefulProgrammableSwitch(this.name); break;
			case "StatelessProgrammableSwitch": newService = new Service.StatelessProgrammableSwitch(this.name); break;
			case "Switch": newService = new Service.Switch(this.name); break;
			case "TemperatureSensor": newService = new Service.TemperatureSensor(this.name); break;
			case "Thermostat": newService = new Service.Thermostat(this.name); break;
			case "TimeInformation": newService = new Service.TimeInformation(this.name); break;
			case "TunneledBTLEAccessoryService": newService = new Service.TunneledBTLEAccessoryService(this.name); break;
			case "Window": newService = new Service.Window(this.name); break;
			case "WindowCovering": newService = new Service.WindowCovering(this.name); break;
			default: newService = null
		}

		var counters = [];
		var optionCounters = [];


		for (var characteristicIndex in newService.characteristics) 
		{
			var characteristic = newService.characteristics[characteristicIndex];
			var compactName = characteristic.displayName.replace(/\s/g, '');
			counters[characteristicIndex] = makeHelper(characteristic);
			characteristic.on('get', counters[characteristicIndex].getter.bind(this))
			characteristic.on('set', counters[characteristicIndex].setter.bind(this));
		}

		for (var characteristicIndex in newService.optionalCharacteristics) 
		{
			var characteristic = newService.optionalCharacteristics[characteristicIndex];
			var compactName = characteristic.displayName.replace(/\s/g, '');
		
			if(this.optionCharacteristic.indexOf(compactName) == -1)
			{
				continue;
			}

			optionCounters[characteristicIndex] = makeHelper(characteristic);
			characteristic.on('get', optionCounters[characteristicIndex].getter.bind(this))
			characteristic.on('set', optionCounters[characteristicIndex].setter.bind(this));

			newService.addCharacteristic(characteristic);
		}
	
		function makeHelper(characteristic) {
			return {
				getter: function (callback) {
					var actionName = "get" + characteristic.displayName.replace(/\s/g, '')
				//	console.log("1this.emitterActionNames[actionName]", this.emitterActionNames[actionName])
					if (this.forceRefreshDelay == 0 /*|| typeof this.emitterActionNames[actionName] != "undefined"*/) { getDispatch(callback, characteristic); }
					else 
					{
						var state = [];
						var url = this.apiBaseUrl + "/" + actionName + this.apiSuffixUrl;
					//	console.log("this.statusEmitters[actionName]", this.statusEmitters[actionName])
						if (typeof this.statusEmitters[actionName] != "undefined") 
						{
							//this.statusEmitters[actionName].pause();
							this.statusEmitters[actionName].interval.clear();
						}
						var self = this;
						this.statusEmitters[actionName] = pollingtoevent(function (done) {
							var url = self.urls[actionName];
							if (!url) {
								callback(null);
							}

							this.httpRequest(url, "", function(error, response, responseBody) {
								if (error) {
									this.log("GetState function failed: %s", error.message);
									done(error);
								} else {
									var state = responseBody;
									state = this.applyMappers(state);
									done(null, parseInt(state));
								}
							}.bind(this));

						}.bind(this), { longpolling: true, interval: this.forceRefreshDelay*1000, longpollEventName: actionName });

						this.statusEmitters[actionName].on(actionName, function (data) 
						{
						//	if (typeof this.emitterActionNames[actionName] == "undefined")
						//	{

						//	console.log("2statusemitter.on(actionName, function (data) ", this.emitterActionNames[actionName]);
							this.enableSet = false;
							state[actionName] = data;
						//	this.emitterActionNames[actionName] = data;
							characteristic.setValue(data);
							this.enableSet = true;
						//	}
						}.bind(this));

						callback(null, state[actionName]);
					//	callback(null, this.emitterActionNames[actionName]);
					}
				},
				setter: function (value, callback) { setDispatch(value, callback, characteristic) }
			};
		}
		return [informationService, newService];
	}
};
