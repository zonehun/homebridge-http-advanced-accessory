# homebridge http everything

Supports all devices on HomeBridge Platform / Bridges devices to http

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-httpeverything
3. Update your configuration file. See sample-config.json in this repository for a sample. 

# Configuration

Configuration sample:

 ```
 {
	"bridge": {
		"name": "Homebridge",
		"username": "C1:38:5A:AC:39:30",
		"port": 51826,
		"pin": "000-00-000"
	},
	"description": "This is an example configuration for the Everything Homebridge plugin",
	"accessories": [
		{
			"accessory": "Httpeverything",
			"service": "Thermostat",
			"name": "Thermostat (Maison)",
			"apiBaseUrl": "http://localhost:8080/thermostat",
			"apiSuffixUrl": "",
			"forceRefreshDelay": 0
		},
		{
			"accessory": "Httpeverything",
			"service": "WindowCovering",
			"name": "Volet (Salon)",
			"apiBaseUrl": "http://localhost:8080/window-covering",
			"apiSuffixUrl": "/0",
			"forceRefreshDelay": 0
		},
		{
			"accessory": "Httpeverything",
			"service": "WindowCovering",
			"name": "Volet (Salle à manger)",
			"apiBaseUrl": "http://localhost:8080/window-covering",
			"apiSuffixUrl": "/1",
			"forceRefreshDelay": 0
		},
		{
			"accessory": "Httpeverything",
			"service": "WindowCovering",
			"name": "Volet (Bureau)",
			"apiBaseUrl": "http://localhost:8080/window-covering",
			"apiSuffixUrl": "/2",
			"forceRefreshDelay": 0
		},
		{
			"accessory": "Httpeverything",
			"service": "WindowCovering",
			"name": "Volet (Cuisine)",
			"apiBaseUrl": "http://localhost:8080/window-covering",
			"apiSuffixUrl": "/3",
			"forceRefreshDelay": 0
		},
				{
			"accessory": "Httpeverything",
			"service": "WindowCovering",
			"name": "Volet (Chambre)",
			"apiBaseUrl": "http://localhost:8080/window-covering",
			"apiSuffixUrl": "/4",
			"forceRefreshDelay": 0
		},
		{
			"accessory": "Httpeverything",
			"service": "HumiditySensor",
			"name": "Humidité",
			"apiBaseUrl": "http://localhost:8080/humidity-sensor",
			"apiSuffixUrl": "",
			"forceRefreshDelay": 0
		},
		{
			"accessory": "Httpeverything",
			"service": "TemperatureSensor",
			"name": "Temp. Ext.",
			"apiBaseUrl": "http://localhost:8080/temperature-sensor",
			"apiSuffixUrl": "",
			"forceRefreshDelay": 0
		}
		,
		{
			"accessory": "Httpeverything",
			"service": "Switch",
			"name": "Force Chauffe-eau",
			"apiBaseUrl": "http://localhost:8080/force-hot-water",
			"apiSuffixUrl": "",
			"forceRefreshDelay": 0
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


