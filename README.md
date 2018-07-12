# homebridge http advanced accessory

Homebridge plugin that can turn virtually any device which exposes HTTP APIs into an HomeKit compatible Service.
Its purpose is to connect any device that can be controlled via HTTP command to Homekit. It creates a Homebridge accessory which uses HTTP calls to *change* and *check* its state via [Actions](#Actions).

This plugin is a fork of HttpAccessory and has merged many features (mainly mappers) from the [homebridge-http-securitysystem](<https://github.com/codetwice/homebridge-http-securitysystem>).

## Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-http-advanced-accessory
3. Update your configuration file. See sample-config.json in this repository for a sample. 

## Features

The main function of the module is to proxy HomeKit queries to an arbitrary web API to retrieve and set the status of the accessory. Main features include:

- Configurable HTTP endpoints to use for getting/setting the state, including passing parameters in for of GET or in POST body
- Support for basic HTTP authentication
- Configurable mapping of API response data to HomeKit Accessory status to allow custom responses
- Configurable mapping of url and body request data to HomeKit Accessory status to allow custom requests
- Interval polling of the current state to enable real-time notifications even if the Accessory has been enabled without the use of HomeKit

## Configuration

Configuration sample:

 ```json
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
            "optionCharacteristic" :[],
            "urls":{
               "getContactSensorState": {
                  "url" : "http://remoteserver/xml/zones/zonesStatus48IP.xml",
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
               "url" : "http://remoteserver/xml/state/virtualKeypad.xml",
               "mappers" : [
                   { "type": "xpath",  "parameters": { "xpath": "//generic/text()" } },
                   { "type": "static", "parameters": { "mapping": { "0": "3", "1": "1", "2": "2", "3": "0" } } }
               ]
            },
            "getSecuritySystemCurrentState": {
               "url" : "http://remoteserver/xml/partitions/partitionsStatus48IP.xml", 
               "mappers" : [
                  { "type": "regex",  "parameters": { "regexp" : "(ALARM)",    "capture": "1" } },
                  { "type": "regex",  "parameters": { "regexp" : ">(ARMED)",   "capture": "1" } },
                  { "type": "regex",  "parameters": { "regexp" : "(DISARMED)", "capture": "1" } },
                  { "type": "static", "parameters": { "mapping": { "ALARM": "4", "ARMED":"inconclusive", "DISARMED": "3"} } }
               ],
               "inconclusive" : {
                  "url" : "http://remoteserver/xml/state/virtualKeypad.xml", 
                  "mappers" : [
                      { "type": "xpath",  "parameters": { "xpath": "//generic/text()" } },
                      { "type": "static", "parameters": { "mapping": { "0": "3", "1": "1", "2": "2", "3": "0" } } }
                  ]
               }
            },
            "setSecuritySystemTargetState": {
               "url" : "http://remoteserver/xml/cmd/cmdOk.xml?cmd=setMacro&macroId={value}&redirectPage=/xml/cmd/cmdError.xml",
               "mappers" : [
                   { "type": "static", "parameters": { "mapping": { "0": "3", "1": "1", "2": "2", "3": "0" } } }
               ]
            }
         }
         }
    ],

    "platforms": []
}
```

- The **name** parameter determines the name of the accessory you will see in HomeKit.
- The **service** parameter determines the kind of Service\Accessory you will see in HomeKit.
- The **username/password** configuration can be used to specify the username and password if the remote webserver requires HTTP authentication.
- A **debug** turns on debug messages. The important bit is that it reports the mapping process so that it's easier to debug.
- The **optionCharacteristic** is an array of optional Characteristic of the service that you want to expose to HomeKit. The full list of supported, mandatory and optional, Characteristics can be found [HERE](<https://github.com/mlaanderson/HAP-NodeJS-Types/blob/master/lib/gen/README.md>)
- The **urls section** configures the URLs that are to be called on certain events. It contains a key-value map of actions that can be executed. The key is name of the action and the value is a configuration JSON object for that action. See the [Actions](#Actions) section below.
- The **polling** is a boolean that specifies if the current state should be pulled on regular intervals or not. Defaults to false.
- **forceRefreshDelay** is a number which defines the poll interval in seconds. Defaults to 0.
- The **mappings** optional parameter allows the definition of several response mappers. This can be used to translate the response received by readCurrentState and readTargetState to the expect 0...4 range expected by homekit

## Actions

The action is a key-value map that configures the URLs to be called to perform a read or a write on a particular Charateristic. In fact, there are two kind of actions, getters and setters: actions for getter keys begin with word "get", actions for the setters begin with "set".
So the key name is composed of two parts:

- The kind of action: "get" or "set"
- The name of the HomeKit Characteristics for that Service (the full list of supported Characteristics can be found [HERE](<https://github.com/mlaanderson/HAP-NodeJS-Types/blob/master/lib/gen/README.md>)

For example to get the value of the SecuritySystemTargetState Characteristic, the key value would be "getSecuritySystemTargetState" while to set it, "setSecuritySystemTargetState"
The value object has the following JSON format for a **getter** action:

```JSON
"getTargetTemperature" : {
    "url":"http://",
    "httpMethod":"",
    "body" : "",
    "mappers" : [],
    "inconclusive" : {
        "url":"",
        "httpMethods":"",
        "mappers": [],
        "inconclusive":{}
    }
}
```

Where:

- The **url** parameter is the url to be called for that action.
- The **httpMethod** (OPTIONAL) parameter is one of "GET" or "POST". Defaults to "GET".
- The **body** (OPTIONAL) parameter is the body of the HTTP POST call.
- The **mappers** (OPTIONAL) are a chain of blocks that have the purpose to parse the response received
- The **inconclusive** (OPTIONAL) parameter is another action that will be invoked if the result of the previous mapping chain is the word "inconclusive"

The value object has the following JSON format for a **setter** action:

```JSON
"setTargetTemperature" : {
    "url":"http://remoteserver/setTemperature?stemp={value}",
    "httpMethod":"",
    "body" : "{value}",
    "mappers" : []
}
```

Where:

- The **url** parameter is the url to be called for that action. If the string contains the "{value}" placeholder, it will be replaced by the value that HomeKit wants to set, after being changed parsed by mappers.
- The **httpMethod** (OPTIONAL) parameter is one of "GET" or "POST". Defaults to "GET".
- The **body** (OPTIONAL) parameter is the body of the HTTP POST call.
- The **mappers** (OPTIONAL) are a chain of blocks that have the purpose of changing the value that HomeKit wants to set to something that is valid for your device

### Mapping

The mappings block of the configuration may contain any number of mapper definitions. The mappers are chained after each other,  the result of a mapper is fed into the input of the next mapper. The purpose of this whole chain is to somehow boil down the response received from the API to a single value which is expected by Homekit.

Each mapper has the following JSON format:

```JSON
{
    "type": "<type of the mapper>",
    "parameters": { <parameters to be passed to the mapper> }
}
```

There are 3 kinds of mappers implemented at the moment.

#### Static mapper

The static mapper can be used to define a key => value dictionary. It will simply look up the input in the dictionary and if it is found, it returns the corresponding value. It's great for mapping string responses like "ARMED" to their actual number. 

Configuration is as follows:

```JSON
{
    "type": "static",
    "parameters": { 
        "mapping": {
            "STAY": "0",
            "AWAY": "1",
            "whataever you don't like": "whatever you like more"
        }
    }
}
```

This configuration would map STAY to 0, AWAY to 1 and "whatever you don't like" to "whatever you like more". If the mapping does not have an entry which corresponds to input, it returns the full input. 

#### Regexp mapper

The regexp mapper can be used to define a regular expression to run on the input, capture some substring of it and return it. It's great for mapping string responses which may change around but have a certain part that's always there and which is the part you are interested in. 

Configuration is as follows:

```JSON
{
    "type": "regex",
    "parameters": {
        "regexp": "^The system is currently (ARMED|DISARMED), yo!$",
        "capture": "1"
    }
}
```

This configuration will run the regular expression defined by the ***regexp*** parameter against the input and return the first capture group (as defined by ***capture***). So, in this case, if the input is "The system is currenty ARMED, yo!", the mapper will map this to "ARMED".

If the regexp does not match the input, the mapper returns the full input. 

#### XPath mapper

The XPath mapper can be used to extract data from an XML document. It allows the definition of an XPath which will then be applied to the input and returns whatever the query selects. 

When using this mapper, make sure that you select text elements and not entire nodes or node lists, otherwise it will fail horribly.

Configuration is as follows:

```JSON
{
    "type": "xpath",
    "parameters": {
        "xpath": "//partition[3]/text()",
        "index": 0
    }
}
```

Let's assume this mapper gets the following input:

```XML
<?xml version="1.0" encoding="ISO-8859-1"?>
<partitionsStatus>
    <partition>ARMED</partition>
    <partition>ARMED</partition>
    <partition>ARMED_IMMEDIATE</partition>
</partitionsStatus>
```

In this case this mapper will return "ARMED_IMMEDIATE". The ***index*** parameter can be used to specify which element to return if the xpath selects multiple elements. In the example above it is completely redundant as partition[3] already makes sure that a single partition is selected.

## Supported services

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

## Configuration Example

The purpose of this section is collect as many configuration example as possible.

### Bticino "Nuovo antifurto filare"

This first example is to configure a Bticino (BT-4200, 4201, 4202) as a HomeKit SecuritySystem

```json
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
                "url" : "http://remoteserver/xml/state/virtualKeypad.xml",
                "mappers" : [
                    { "type": "xpath",  "parameters": { "xpath": "//generic/text()" } },
                    { "type": "static", "parameters": { "mapping": { "0": "3", "1": "1", "2": "2", "3": "0" } } }
                ]
            },
            "getSecuritySystemCurrentState": {
                "url" : "http://remoteserver/xml/partitions/partitionsStatus48IP.xml", 
                "mappers" : [
                    { "type": "regex",  "parameters": { "regexp" : "(ALARM)",    "capture": "1" } },
                    { "type": "regex",  "parameters": { "regexp" : ">(ARMED)",   "capture": "1" } },
                    { "type": "regex",  "parameters": { "regexp" : "(DISARMED)", "capture": "1" } },
                    { "type": "static", "parameters": { "mapping": { "ALARM": "4", "ARMED":"inconclusive", "DISARMED": "3"} } }
                ],
                "inconclusive" : {
                    "url" : "http://remoteserver/xml/state/virtualKeypad.xml", 
                    "mappers" : [
                        { "type": "xpath",  "parameters": { "xpath": "//generic/text()" } },
                        { "type": "static", "parameters": { "mapping": { "0": "3", "1": "1", "2": "2", "3": "0" } } }
                    ]
                }
            },
            "setSecuritySystemTargetState": {
                "url" : "http://remoteserver/xml/cmd/cmdOk.xml?cmd=setMacro&macroId={value}&redirectPage=/xml/cmd/cmdError.xml",
                "mappers" : [
                    { "type": "static", "parameters": { "mapping": { "0": "3", "1": "1", "2": "2", "3": "0" } } }
                ]
            }
        }
    }
```

### Bticino "Nuovo antifurto filare" Zones as ContactSensor

```JSON
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
            "url" : "http://remoteserver/xml/zones/zonesStatus48IP.xml",
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
}
```

### Daikin as HeaterCooler

This is still incomplete but the unofficial Daikin documentation (<https://github.com/ael-code/daikin-control>) can help you to complete it.

```JSON
{
    "accessory": "HttpAccessory",
    "service": "HeaterCooler",
    "name": "Condizionatore Soggiorno",
    "forceRefreshDelay": 5,
    "debug" : false,
    "urls":{
        "getCurrentHeaterCoolerState": {
            "url" : "http://192.168.x.x/aircon/get_control_info", 
            "mappers" : [
                {"type": "regex", "parameters": {"regexp": "(pow=0)","capture": "1"} },
                {"type": "regex", "parameters": { "regexp": "mode=(\\d)", "capture": "1"} },
                {"type": "static", "parameters": { "mapping": { "pow=0": "0", "3":"3", "4":"2"} } }
            ]
        },
        "getTargetHeaterCoolerState":{
            "url" : "http://192.168.x.x/aircon/get_control_info", 
            "mappers" : [
                {"type": "regex", "parameters": {"regexp": "(pow=0)","capture": "1"} },
                {"type": "regex", "parameters": { "regexp": "mode=(\\d)", "capture": "1"} },
                {"type": "static", "parameters": { "mapping": { "pow=0": "0", "3":"3", "4":"2"} } }
            ]
        },
        "setTargetHeaterCoolerState":{
            "url" : "http://192.168.x.x/aircon/set_control_info/{value}",
            "mappers" : [
                {"type": "static", "parameters": { "mapping": { "0": "?mode=0", "1":"?mode=4", "2":"?mode=3"} } }
            ]
        },
        "getActive":{
            "url" : "http://192.168.x.x/aircon/get_control_info", 
            "mappers" : [
                {"type": "regex", "parameters": {"regexp": "pow=(\\d)","capture": "1"} }
            ]
        },
        "setActive":{
            "url" : "http://192.168.x.x/aircon/set_control_info/{value}",
            "mappers" : [
                {"type": "static", "parameters": { "mapping": { "0": "?pow=0", "1":"?pow=1"} } }
            ]
        }

    }
}

```