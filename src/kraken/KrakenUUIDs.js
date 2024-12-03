// This object holds all the service and characteric UUID which we need
export const KrakenUUIDs = {
    krakenManfacturerNameCharacteristicUUID: '2A29',
    krakenModelNumberCharacteristicUUID: '2A24',
    krakenSerialNumberCharacteristicUUID: '2A25',
    krakenFirmwareRevisionCharacteristicUUID: '2A26',
    krakenHardwareRevisionCharacteristicUUID: '2A27',
    arcusToggleRadioCharacteristicUUID: '6911a896-694c-47bd-be46-5ed9f5fd78f2',
    arcusGetDataCharacteristicUUID: '58c00e85-71c8-d83f-aa6f-d95bf57a7829',
    arcusIndexSizerCharacteristicUUID: '277d8c4a-faa1-7d4b-9045-c36b66b97d80',
    krakenBatteryServiceUUID: '180F',
    krakenBatteryCharacteristicUUID: '2A19',
    krakenDisplayNameCharacteristicUUID: 'c91a9bbe-2470-0ce4-81ed-818844bdca4e',
    krakenPressureCharacteristicUUID: '324d6d26-a1f6-4a87-8513-0cffa5623c15',
    krakenSerialNumberWriteCharacteristicUUID:
      'a01cdc2e-50ad-4c21-a008-1d6c377d89e3',
    krakenZeroSensorCharacteristicUUID: 'e2f1efe7-aea4-45f2-9c35-7f49436e5d81',
    krakenDeepSleepCharacteristicUUID: '2868d2b9-4716-a42b-2827-fd3d804a0c53',
    krakenRebootCharacteristicUUID: '1ff17b7c-213e-4a4e-bd0c-563bd74cd0b8',
    krakenSmoothingSampleCharacteristicUUID: 'ce2448b0-a845-410d-a594-56b0db1a0cda',
    krakenUpdateFrequencyCharacteristicUUID: 'd4e2a39e-7589-4513-a90b-df4bdf9e6806',
    arcusOperatingModeCharacteristic: '163a2782-db36-4d38-986f-911f41373b8c',
    devicePressureSubscriptionCharacteristicUUID: 'dab8fe8e-75d9-48f3-a6a0-9bdfb9435121',
    krakenLocalIdCharacteristicUUID : 'd6c581ef-54a8-4b13-980c-4885079c7798'
  };
  
  export const krakenDeviceUUID = '7db25886-88c8-495c-a451-8e43d5e8e7d0';
  export const arcusDeviceUUID = '47b3244a-a55b-5184-46f8-73716eb5d67a';
  
  export const krakenInformationServiceUUID = '180A';
  
  // Used for DFU
  export const krakenOtaService = '1d14d6ee-fd63-4fa1-bfa4-8f47b42119f0';
  export const krakenOtaControlAttribute = 'f7bf3564-fb6d-4e53-88a4-5e37e0326063';
  export const krakenOtaDataAttribute = '984227f3-34fc-4045-a5d0-2c581f81a153';
  export const ctlStart = 0x00;
  export const ctlDone = 0x03;
  export const ctlClose = 0x04;
  

  export const BleData = {
    REQUEST_MTU: 245,
    BLOCK_SIZE: 245 - 8,
    NEGOTIATED_MTU: 0,
  };