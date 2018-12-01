var Service, Characteristic;
var request = require("request");
var xpath = require("xpath");
var dom = require("xmldom").DOMParser;
var JSONPath = require("JSONPath");
var pollingtoevent = require('polling-to-event');

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-http-advanced-accessory", "HttpAdvancedAccessory", HttpAdvancedAccessory);
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

/**
 * Mapper class that uses JSONPath to select the text of a node or the value of an attribute
 *
 * @param {Object} parameters The parameters of the mapper
 * @constructor
 */
function JPathMapper(parameters) {
	var self = this;
	self.jpath = parameters.jpath;
	self.index = parameters.index || 0;

	self.map = function(value) {
		var json = JSON.parse(value);
		var result  = JSONPath({path: self.jpath, json: json});

		if (result instanceof Array && result.length > self.index) {
			result = result[self.index];
		}
		
		if (result instanceof Object) {
			return JSON.stringify(result);
		}

		return result;
	};
}

function HttpAdvancedAccessory(log, config) {
	this.log = log;
	this.name = config.name;
	this.service = config.service;
	this.optionCharacteristic = config.optionCharacteristic || [];
	this.forceRefreshDelay = config.forceRefreshDelay || 0;
	this.enableSet = true;
	this.statusEmitters = [];
	this.state = {};
	// process the mappers
	var self = this;
	self.debug = config.debug;
	/**
	 * self.urls ={
	 *	getStatus : {
	 *		url:"http://",
	 *		httpMethod:"",
	 *		mappers : [],
	 *      inconclusive : {
	 * 			url:
	 * 			httpMethods:"",
	 * 			mappers[]
	 * 		}
	 *	},
	 *	getTemp : {
	 *		url:"http://",
	 *		httpMethod:"",
	 *		mappers : []
	 *	},
	 *  setTemp : {
	 * 		url:"http://{value}",
	 * 		httpMethod:"",
	 *      body:"{value}",
	 * 		mappers : []
	 * }
	 *}
	 */
	function createAction(action, actionDescription){
		action.url = actionDescription.url;
		action.httpMethod = actionDescription.httpMethod || "GET";
		action.body = actionDescription.body || "";
		
		/* Edited by Tamas Gal 2018.10.22. */
		action.floatValue = actionDescription.floatValue;
		
		if (actionDescription.mappers) {
			action.mappers = [];
			actionDescription.mappers.forEach(function(matches) {
				switch (matches.type) {
					case "regex":
						action.mappers.push(new RegexMapper(matches.parameters));
						break;
					case "static":
						action.mappers.push(new StaticMapper(matches.parameters));
						break;
					case "xpath":
						action.mappers.push(new XPathMapper(matches.parameters));
						break;
					case "jpath":
						action.mappers.push(new JPathMapper(matches.parameters));
						break;
				}
			});
		}
		if(actionDescription.inconclusive){
			action.inconclusive = {};
			createAction(action.inconclusive, actionDescription.inconclusive);
		}
	};
	self.urls ={};
	if(config.urls){
		for (var actionName in config.urls){
			if(!config.urls.hasOwnProperty(actionName)) continue;
			self.urls[actionName] = {};
			createAction(self.urls[actionName],config.urls[actionName]);
		}

	}
	self.auth = {
		username: config.username || "",
		password: config.password || "",
		immediately: true
	};

	if ("immediately" in config) {
		self.auth.immediately = config.immediately;
	}


}



HttpAdvancedAccessory.prototype = {
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
	httpRequest : function(url, body, httpMethod, callback) {
		request({
			url: url,
			body: body,
			method: httpMethod,
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
	applyMappers : function(mappers, string) {
		var self = this;

		if (mappers && mappers.length > 0) {
			self.debugLog("Applying mappers on " + string);
			mappers.forEach(function (mapper, index) {
				var newString = mapper.map(string);
				self.debugLog("Mapper " + index + " mapped " + string + " to " + newString);
				string = newString;
			});

			self.debugLog("Mapping result is " + string);
		}

		return string;
	},

	stringInject : function(str, data) {
		if (typeof str === 'string' && (data instanceof Array)) {
	
			return str.replace(/({\d})/g, function(i) {
				return data[i.replace(/{/, '').replace(/}/, '')];
			});
		} else if (typeof str === 'string' && (data instanceof Object)) {
	
			for (let key in data) {
				return str.replace(/({([^}]+)})/g, function(i) {
					let key = i.replace(/{/, '').replace(/}/, '');
					if (!data[key]) {
						return i;
					}
	
					return data[key];
				});
			}
		} else {
	
			return false;
		}
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
		var getDispatch = function (callback, action) {
			if (!action) {
				callback(null);
			}
			this.debugLog("getDispatch function called for url: %s", action.url);
			this.httpRequest(action.url, action.body, action.httpMethod, function(error, response, responseBody) {
				if (error) {
					this.log("GetState function failed: %s", error.message);
					callback(error);
				} else {
					this.debugLog("received response from action: %s", action.url);
					var state = responseBody;
					state = this.applyMappers(action.mappers,state);
					if(state == "inconclusive" && action.inconclusive){
						this.debugLog("response inconclusive, try again.");
						getDispatch(callback,action.inconclusive);
					}else{
						/* Edited by Tamas Gal 2018.10.22. */
						if ( action.floatValue ) {
							this.debugLog("We have a value: %s, no rounding", parseFloat(state));
							callback(null, parseFloat(state)); 														
						}
						else {							
							this.debugLog("We have a value: %s, int: %d", state, parseInt(state));
							callback(null, parseInt(state));							
						}
						
					}
				}
			}.bind(this));

		}.bind(this);

		var setDispatch = function (value, callback, characteristic) {
			if (this.enableSet == false) { callback() }
			else {
				var actionName = "set" + characteristic.displayName.replace(/\s/g, '')
				this.debugLog("setDispatch:actionName:value: ", actionName, value); 
				var action = this.urls[actionName];
				if (!action || !action.url) {
					callback(null);
				}
				var state = this.state;
				var body = action.body;
				var mappedValue = this.applyMappers(action.mappers, value);
				var url = eval('`'+action.url+'`').replace(/{value}/gi, mappedValue);
				if (body) {
					body = eval('`'+body+'`').replace(/{value}/gi, mappedValue);
				}

				this.httpRequest(url, body, action.httpMethod, function(error, response, responseBody) {
					if (error) {
						this.log("GetState function failed: %s", error.message);
						callback(error);
					} else {
						callback(null, value);
					}
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
			case "AirPurifier": newService = new Service.AirPurifier(this.name); break;
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
			case "Fanv2": newService = new Service.Fanv2(this.name); break;
			case "FilterMaintenance": newService = new Service.FilterMaintenance(this.name); break;
			case "Faucet": newService = new Service.Faucet(this.name); break;
			case "GarageDoorOpener": newService = new Service.GarageDoorOpener(this.name); break;
			case "HeaterCooler": newService = new Service.HeaterCooler(this.name); break;
			case "HumidifierDehumidifier": newService = new Service.HumidifierDehumidifier(this.name); break;
			case "HumiditySensor": newService = new Service.HumiditySensor(this.name); break;
			case "IrrigationSystem": newService = new Service.IrrigationSystem(this.name); break;
			case "LeakSensor": newService = new Service.LeakSensor(this.name); break;
			case "LightSensor": newService = new Service.LightSensor(this.name); break;
			case "Lightbulb": newService = new Service.Lightbulb(this.name); break;
			case "LockManagement": newService = new Service.LockManagement(this.name); break;
			case "LockMechanism": newService = new Service.LockMechanism(this.name); break;
			case "Microphone": newService = new Service.Microphone(this.name); break;
			case "MotionSensor": newService = new Service.MotionSensor(this.name); break;
			case "OccupancySensor": newService = new Service.OccupancySensor(this.name); break;
			case "Outlet": newService = new Service.Outlet(this.name); break;
			case "Pairing": newService = new Service.Pairing(this.name); break;
			case "ProtocolInformation": newService = new Service.ProtocolInformation(this.name); break;
			case "Relay": newService = new Service.Relay(this.name); break;
			case "SecuritySystem": newService = new Service.SecuritySystem(this.name); break;
			case "SecuritySystem": newService = new Service.SecuritySystem(this.name); break;
			case "Slat": newService = new Service.Slat(this.name); break;
			case "Speaker": newService = new Service.Speaker(this.name); break;
			case "StatefulProgrammableSwitch": newService = new Service.StatefulProgrammableSwitch(this.name); break;
			case "StatelessProgrammableSwitch": newService = new Service.StatelessProgrammableSwitch(this.name); break;
			case "Switch": newService = new Service.Switch(this.name); break;
			case "TemperatureSensor": 
				newService = new Service.TemperatureSensor(this.name); 
				/* Edited by Tamas Gal 2018.12.01. Overriding minValue 0 to be able to display negative temp values*/
				newService.getCharacteristic(Characteristic.CurrentTemperature).setProps({ minValue: -100, maxValue: 100 });
				break;
			case "Thermostat": newService = new Service.Thermostat(this.name); break;
			case "TimeInformation": newService = new Service.TimeInformation(this.name); break;
			case "TunneledBTLEAccessoryService": newService = new Service.TunneledBTLEAccessoryService(this.name); break;
			case "Valve": newService = new Service.Valve(this.name); break;
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
			characteristic.on('get', optionCounters[characteristicIndex].getter.bind(this));
			characteristic.on('set', optionCounters[characteristicIndex].setter.bind(this));

			newService.addCharacteristic(characteristic);
		}
	
		function makeHelper(characteristic) {
			return {
				getter: function (callback) {
					var actionName = "get" + characteristic.displayName.replace(/\s/g, '');
					var action = this.urls[actionName];
					if (this.forceRefreshDelay == 0 ) { 
						getDispatch(function(error,data){
							this.debugLog(actionName + " getter function returned with data: " + data);
							this.enableSet = false;
							this.state[actionName] = data;
							characteristic.setValue(data);
							this.enableSet = true;
							callback(error,data);
						}.bind(this), action); 
					} 
					else {
						
						if (typeof this.statusEmitters[actionName] != "undefined"){
							this.debugLog(actionName + " returning cached data: " + this.state[actionName]);
							callback(null,this.state[actionName]);
							return;
						} 
						this.debugLog("creating new emitter for " + actionName);

						this.statusEmitters[actionName] = pollingtoevent(function (done) {
							this.debugLog("requested update for action " + actionName);
							getDispatch(done,action);

						}.bind(this), { 
							longpolling: true, 
							interval: this.forceRefreshDelay * 1000, 
							longpollEventName: actionName 
						});

						this.statusEmitters[actionName].on(actionName, function (data) 
						{							
							this.debugLog(actionName + " emitter returned data: " + data);
							this.enableSet = false;
							this.state[actionName] = data;
							characteristic.setValue(data);
							this.enableSet = true;
						
							if(callback){
								this.debugLog("calling callback for action " + actionName);
								callback(null, this.state[actionName]);
							}
							// just call it once, multiple calls not allowed
							callback = null;
						}.bind(this));

						this.statusEmitters[actionName].on("error", function(err, data) {
							this.log("Emitter errored: %s. with data %j", err, data);
						}.bind(this));
						
					}
				},
				setter: function (value, callback) { setDispatch(value, callback, characteristic) }
			};
		}
		return [informationService, newService];
	}
};
