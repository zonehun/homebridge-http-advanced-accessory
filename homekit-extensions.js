/* @flow weak */
'use strict';

const Characteristic = require('hap-nodejs').Characteristic;

/**
 * Characteristic "PushOn"
 */

const PushOnUUID = '74fefc26-4f40-11e7-b114-b2f933d5fe66';

const PushOn = function() {
  const characteristic = new Characteristic('Push On', PushOnUUID);

  characteristic.setProps({
    format: Characteristic.Formats.BOOL,
    perms: [Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
  });

  characteristic.value = 0;
  return characteristic;
};

PushOn.UUID = PushOnUUID;

/**
 * Characteristic "RotationSpeedIR"
 */

const RotationSpeedIRUUID = '74ff01ee-4f40-11e7-b114-b2f933d5fe66';

const RotationSpeedIR = function() {
  const characteristic = new Characteristic('Rotation Speed IR', RotationSpeedIRUUID);

  characteristic.setProps({
    format: Characteristic.Formats.FLOAT,
    unit: Characteristic.Units.PERCENTAGE,
    maxValue: 8,
    minValue: 0,
    minStep: 1,
    perms: [Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
  });

  characteristic.value = 4;
  return characteristic;
};

RotationSpeedIR.UUID = RotationSpeedIRUUID;

/**
 * Characteristic "VolumeIR"
 */

const VolumeIRUUID = 'be9ac330-4f43-11e7-b114-b2f933d5fe66';

const VolumeIR = function() {
  const characteristic = new Characteristic('Volume IR', VolumeIRUUID);

  characteristic.setProps({
    format: Characteristic.Formats.FLOAT,
    unit: Characteristic.Units.PERCENTAGE,
    maxValue: 100,
    minValue: 0,
    minStep: 1,
    perms: [Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
  });

  characteristic.value = 50;
  return characteristic;
};

VolumeIR.UUID = VolumeIRUUID;

/**
 * Characteristic "MuteIR"
 */

const MuteIRUUID = 'be9ac772-4f43-11e7-b114-b2f933d5fe66';

const MuteIR = function() {
  const characteristic = new Characteristic('Mute IR', MuteIRUUID);

  characteristic.setProps({
    format: Characteristic.Formats.BOOL,
    perms: [Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
  });

  characteristic.value = 0;
  return characteristic;
};

MuteIR.UUID = MuteIRUUID;


const FanIRUUID = '74ff031a-4f40-11e7-b114-b2f933d5fe66';

const FanIR = function(displayName, subtype) {
  const service = new Service(displayName, FanIRUUID, subtype);

  service.addCharacteristic(PushOn);

  // Optional Characteristics
  service.addOptionalCharacteristic(RotationSpeedIR);

  return char;
};

FanIR.UUID = FanIRUUID;


const TVIRUUID = 'be9ac984-4f43-11e7-b114-b2f933d5fe66';

const TVIR = function(displayName, subtype) {
  const service = new Service(displayName, TVIRUUID, subtype);

  service.addCharacteristic(PushOn);

  // Optional Characteristics
  service.addOptionalCharacteristic(VolumeIR);
  service.addOptionalCharacteristic(MuteIR);

  return char;
};

TVIR.UUID = TVIRUUID;


module.exports = {
  Characteristic: {
    PushOn: PushOn,
    RotationSpeedIR: RotationSpeedIR,
    MuteIR: MuteIR,
    VolumeIR: VolumeIR
  },
  Service: {
    FanIR: FanIR,
    TVIR: TVIR
  }
}