# homebridge http accessory

Supports all devices on HomeBridge Platform / Bridges devices to http

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-http-advanced-accessory
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

Configuration sample:

 ```
 {
	"bridge": {
		"name": "Homebridge",
		"username": "C1:38:5A:AC:39:30",
		"port": 51826,
		"pin": "123-45-678"
	},
	"description": "This is an example configuration for the Everything Homebridge plugin",
	"accessories": [
		{
			"accessory": "HttpAdvancedAccessory",
			"service": "ContactSensor",
			"name": "Terrace Sensor",
			"forceRefreshDelay": 5,
			"username": "admin",
			"password": "admin",
			"debug" : false,
			"urls":{
			   "getContactSensorState": {
				  "url" : "http://localhost/xml/zones/zonesStatus48IP.xml", 
				  "mappers" : [
					  {
						  "type": "xpath",
						  "parameters": {
							  "xpath": "//status[1]/text()"
						  }
					  },
					  {
						  "type": "static",
						  "parameters": {
							  "mapping": {
								  "ALARM": "1",
								  "NORMAL":"0"
							  }
						  }
					 }
				  ]
			   }
			} 
		 },
		 {
         "accessory": "HttpAccessory",
         "service": "SecuritySystem",
         "name": "Btcino Security",
         "forceRefreshDelay": 5,
         "username": "admin",
         "password": "admin",
         "debug" : false,
         "urls":{
            "getSecuritySystemTargetState": {
               "url" : "http://192.168.201.12/xml/state/virtualKeypad.xml", 
               "mappers" : [
                   { "type": "xpath",  "parameters": { "xpath": "//generic/text()" } },
                   { "type": "static", "parameters": { "mapping": { "0": "3", "1": "1", "2": "2", "3": "0" } } }
               ]
            },
            "getSecuritySystemCurrentState": {
               "url" : "http://192.168.201.12/xml/partitions/partitionsStatus48IP.xml", 
               "mappers" : [
                  { "type": "regex",  "parameters": { "regexp" : "(ALARM)",    "capture": "1" } },
                  { "type": "regex",  "parameters": { "regexp" : ">(ARMED)",   "capture": "1" } },
                  { "type": "regex",  "parameters": { "regexp" : "(DISARMED)", "capture": "1" } },
                  { "type": "static", "parameters": { "mapping": { "ALARM": "4", "ARMED":"inconclusive", "DISARMED": "3"} } }
               ],
               "inconclusive" : {
                  "url" : "http://192.168.201.12/xml/state/virtualKeypad.xml", 
                  "mappers" : [
                      { "type": "xpath",  "parameters": { "xpath": "//generic/text()" } },
                      { "type": "static", "parameters": { "mapping": { "0": "3", "1": "1", "2": "2", "3": "0" } } }
                  ]
               }
            },
            "setSecuritySystemTargetState": {
               "url" : "http://192.168.201.12/xml/cmd/cmdOk.xml?cmd=setMacro&CPK=B40030Jd&macroId={value}&redirectPage=/xml/cmd/cmdError.xml", 
               "mappers" : [
                   { "type": "static", "parameters": { "mapping": { "0": "3", "1": "1", "2": "2", "3": "0" } } }
               ]
            }
         } 
		
		
	],
	"platforms": []
}
```
# Supported services

AccessoryInformation
AirQualitySensor
BatteryService 
BridgeConfiguration
BridgingState
CameraControl
CameraRTPStreamManagement
CarbonDioxideSensor
CarbonMonoxideSensor
ContactSensor
Door
Doorbell
Fan
GarageDoorOpener
HumiditySensor
LeakSensor
LightSensor
Lightbulb
LockManagement
LockMechanism
Microphone
MotionSensor
OccupancySensor
Outlet
Pairing
ProtocolInformation
Relay
SecuritySystem
SmokeSensor
Speaker
StatefulProgrammableSwitch
StatelessProgrammableSwitch
Switch
TemperatureSensor
Thermostat
TimeInformation
TunneledBTLEAccessoryService
Window
WindowCovering  

# API Expectations


