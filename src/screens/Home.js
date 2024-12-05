import React, {useEffect, useState} from 'react';
import {
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
  View,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  BleData,
  ctlDone,
  ctlStart,
  krakenDeviceUUID,
  krakenOtaControlAttribute,
  krakenOtaDataAttribute,
  krakenOtaService,
} from '../kraken/KrakenUUIDs';
import {manager} from '../components/BluetoothManager';
import PsiComponent from '../components/PsiComponent';
import {ZeroByteFW} from '@zerobytellc/zerobyte-firmware-utils';
import RNFetchBlob from 'rn-fetch-blob';

const Home = () => {
  const [deviceList, setDeviceList] = useState([]);
  const [selectedSection, setSelectedSection] = useState('Kraken');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  var Buffer = require('buffer/').Buffer;
  // Request Bluetooth permissions
  const requestBluetoothPermission = async () => {
    if (Platform.OS === 'ios') return true;

    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = permissions.every(
        permission =>
          granted[permission] === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allGranted) {
        Alert.alert('Permissions have not been granted');
      }

      return allGranted;
    }

    return false;
  };

  // Request Bluetooth permissions on component mount
  useEffect(() => {
    requestBluetoothPermission();
  }, []);

  // Start scanning once Bluetooth is powered on
  useEffect(() => {
    const subscription = manager.onStateChange(state => {
      if (state === 'PoweredOn') {
        scanAndConnect();
      }
    }, true);

    return () => subscription.remove();
  }, []);

  // Scan for devices and connect
  const scanAndConnect = async () => {
    manager.startDeviceScan(
      [],
      {allowDuplicates: false},
      async (error, device) => {
        if (error || !device.name) return;

        const isKraken = device.serviceUUIDs?.includes(krakenDeviceUUID);
        if (isKraken) {
          await handleDeviceConnection(device);
        }
      },
    );
  };

  // Handle device connection and add to the device list
  const handleDeviceConnection = async device => {
    try {
      const isConnected = await manager.isDeviceConnected(device.id);

      if (!isConnected) {
        await manager.connectToDevice(device.id);
        const deviceInfo = await device.discoverAllServicesAndCharacteristics();
        if (deviceInfo) {
          const batteryStatus = await getBatteryStatus(deviceInfo);
          updateDeviceList(device, batteryStatus);
        }
      } else {
        const deviceInfo = await device.discoverAllServicesAndCharacteristics();
        if (deviceInfo) {
          const batteryStatus = await getBatteryStatus(deviceInfo);
          updateDeviceList(device, batteryStatus);
        }
      }
    } catch (error) {
      manager.onDeviceDisconnected(device.id, (error, device) => {
        if (error) {
          console.error('device in case disconnected', error);
        }
      });
      // console.error(`Error connecting to device ${device.name}:`, error);
    }
  };

  // Get battery status from the device
  const getBatteryStatus = async deviceInfo => {
    const getDeviceDetails = await deviceInfo.readCharacteristicForService(
      '180F',
      '2A19',
    );
    if (getDeviceDetails) {
      const convertedValue = Uint8Array.from(atob(getDeviceDetails.value), c =>
        c.charCodeAt(0),
      );
      return convertedValue[0] === 255 ? 'Charging..' : `${convertedValue[0]}%`;
    }
    return 'Unknown';
  };

  // Update device list
  const updateDeviceList = (device, batteryStatus) => {
    setDeviceList(prevDeviceList => {
      const updatedDeviceList = [...prevDeviceList];
      const existingDeviceIndex = updatedDeviceList.findIndex(
        d => d.deviceId === device.id,
      );

      const newDevice = {
        deviceId: device.id,
        deviceName: device.name,
        batteryStatus,
        dfuFound: true,
      };

      if (existingDeviceIndex <= -1) {
        updatedDeviceList.push(newDevice);
      } else {
        updatedDeviceList[existingDeviceIndex] = newDevice;
      }

      return updatedDeviceList;
    });
  };

  // perform DFU
  const getFirmwareFile = async function (isRangeExtender) {
    let modules = [];

    let availableLatestFirmwares = await ZeroByteFW.get_latest_fw_info(
      'hosemonster',
      isRangeExtender,
      // undefined,
      // 'internal',
    );

    for (let i = 0; i < availableLatestFirmwares.length; ++i) {
      let latestFirmware = availableLatestFirmwares[i];
      console.log(`Downloading ${isRangeExtender} : ${latestFirmware.version}`);
      modules.push(await ZeroByteFW.download_fw(latestFirmware));
    }

    return modules;
  };
  //   const performDFU = async () => {
  //   console.log(`Performing firmware update for ${selectedDevice?.deviceName} : ${selectedDevice?.deviceId}`);
  //   let firmwarePaths = await getFirmwareFile('kraken');
  //   //get  path of the file in an array
  //   console.log( "Success Path---->",firmwarePaths);

  //   if(firmwarePaths){

  //   for (let i = firmwarePaths.length - 1; i >= 0; --i) {
  //     let fileCountMsg = `[${firmwarePaths.length - i} of ${firmwarePaths.length}]`;
  // console.log('fileCountMsg---->', fileCountMsg)
  //     let firmwarePath = firmwarePaths[i];
  //     try {
  //  await manager.cancelDeviceConnection(selectedDevice?.deviceId)

  //     } catch (error) {
  //       console.log("Dis connecting error", error);
  //     }

  //   await readFileAndStartFlashing(
  //       deviceId,
  //       firmwarePath,
  //       [firmwarePaths.length - i, firmwarePaths.length],
  //     ).then(result => {
  //      console.log('result', result)
  //     })
  //   }
  // }

  //   return result ? 1 : 0;
  //   }

  const performDFU = async () => {

    let firmwarePaths = await getFirmwareFile('kraken');


    if (!firmwarePaths || firmwarePaths.length === 0) {
      console.log('No firmware paths found.');
      return 0;
    }
    let result = false; 
    for (let i = firmwarePaths.length - 1; i >= 0; --i) {
      let fileCountMsg = `[${firmwarePaths.length - i} of ${
        firmwarePaths.length
      }]`;
      console.log('fileCountMsg---->', fileCountMsg);
      let firmwarePath = firmwarePaths[i];

      try {
        result = await readFileAndStartFlashing(
          selectedDevice?.deviceId, // Ensure you're passing the correct deviceId
          firmwarePath,
          [firmwarePaths.length - i, firmwarePaths.length],
        );
        // console.log('Flashing result:----->', result);
      } catch (error) {
        console.log('Flashing error', error);
        continue; // Skip to next firmware path if flashing fails
      }
    }

    return result ? 1 : 0;
  };

  const readFileAndStartFlashing = async function (
    deviceId,
    firmwarePath,
    steps,
  ) {
    console.log('firmwarePath---Reading->', firmwarePath);
    let firmwareBytes = await readFirmwareBytes(firmwarePath);
    console.log('firmwarePath---Reading->', firmwarePath);
    if (firmwareBytes) {
      return beginDFU(deviceId, firmwareBytes, steps);
    }
  };

  const readFirmwareBytes = async function (filePath) {

    let stats = await RNFetchBlob.fs.stat(`${filePath}`);
    let firmwareSize = stats.size;
    let firmwareBuffer = new ArrayBuffer(firmwareSize);
    let firmwareBytes = new Uint8Array(firmwareBuffer);
    let done = false;

    if (stats.size > 0) {
      RNFetchBlob.fs.readStream(filePath, 'ascii').then(stream => {
        let bytesRead = 0;

        stream.open();
        stream.onError(err => {
          console.log('Error while reading file ', err);
        });
        stream.onData(chunk => {
          firmwareBytes.set(chunk, bytesRead);
          bytesRead += chunk.length;
        });
        stream.onEnd(() => {
          console.log('Done reading file ');
          done = true;
        });
      });

      while (!done) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    return firmwareBytes;
  };

  



  const beginDFU = async (deviceId, firmwareBytes) => {
    let totalBytesWritten = 0;
  
    try {

       const result = await establishConnectionWithDevice(deviceId);
      console.log('Device connection established. Starting firmware update...',result);
      if(result){
          const uploadProcessResult =  await otaBeginUploadProcess(deviceId);
          console.log('uploadProcessResult------->',uploadProcessResult )
          if(uploadProcessResult){
            console.log(`Starting to write ${firmwareBytes?.length || 0} bytes. Please wait...`);
  totalBytesWritten = await writeFirmwareBlocksToDevice(deviceId, Array.from(firmwareBytes));
  console.log('totalBytesWritten------>', totalBytesWritten)
  if(totalBytesWritten){
 await finishUpDFU(deviceId);

// await manager.cancelDeviceConnection(deviceId)
  }
          }
      }

  
      console.log('Firmware update completed. Disconnecting from device...');
  
      // Finish up the DFU process

     
    } catch (error) {
      console.error('Error during DFU process: ', error);
      throw error;  // Rethrow the error to propagate it up the call stack if necessary
    }
  
    return totalBytesWritten === firmwareBytes.length;
  };
  
  const establishConnectionWithDevice = async function (deviceId) {
    return new Promise(resolve => setTimeout(resolve, 1000))
      .then(async () => {
        return await manager.connectToDevice(deviceId, {
          autoConnect: true,
          requestMTU:  BleData.REQUEST_MTU,
        });
      })
      .then(device => {
        return device.discoverAllServicesAndCharacteristics();
      })
      .then(device => {
        console.log('Requesting MTU ' + BleData.REQUEST_MTU);
        return manager.requestMTUForDevice(device.id,   BleData.REQUEST_MTU);
      })
      .then(device => {
        console.log('Negotiated MTU: ' + device.mtu);
        console.log('Setting BLOCK_SIZE = ' + (device.mtu - 8));
        BleData.NEGOTIATED_MTU = device.mtu;
        BleData.BLOCK_SIZE = device.mtu - 8;
        return device;
      })
      .catch(error => {
        console.log('Error during establishing connection ', error);
      });
  };

  const otaBeginUploadProcess = async function (deviceId) {
    let newValueBuffer = Buffer.alloc(1);
    newValueBuffer.writeUInt8(ctlStart);

    try {
      return manager
        .writeCharacteristicWithoutResponseForDevice(
          deviceId,
          krakenOtaService,
          krakenOtaControlAttribute,
          newValueBuffer.toString('base64'),
        );
    } catch (error) {
      console.log('Error ota begin upload b', error);
    }
  };

  const writeFirmwareBlocksToDevice = async function (
    deviceId,
    bytes,

  ) {
    let index = 0;
    let bytesWritten = 0;
    let currentSlice = bytes.slice(index, index + BleData.BLOCK_SIZE);

    while (currentSlice.length > 0) {

      let isFirstWriteAttempt = true;
      let isWriteSuccessful = false;

      while (isFirstWriteAttempt && !isWriteSuccessful) {
        try {
          await BluetoothManagerInstance.manager
            .writeCharacteristicWithoutResponseForDevice(
              deviceId,
              krakenOtaService,
              krakenOtaDataAttribute,
              Buffer.from(currentSlice).toString('base64'),
            )
            .catch(error => {
              console.log(error);
              bytesWritten = 0;
            });

          isWriteSuccessful = true;
        
        } catch (error) {
          if (!isFirstWriteAttempt) {
            throw error;
          }
          isFirstWriteAttempt = false;
        }
      }

      index += BleData.BLOCK_SIZE;
      bytesWritten += Math.min(currentSlice.length, BleData.BLOCK_SIZE);
      currentSlice = currentSlice = bytes.slice(
        index,
        index + BleData.BLOCK_SIZE,
      );
    }

    return bytesWritten;
  };

  const finishUpDFU = function (deviceId) {
    let newValueBuffer = Buffer.alloc(1);
    newValueBuffer.writeUInt8(ctlDone);
  
    try {
      return manager.writeCharacteristicWithResponseForDevice(
          deviceId,
          krakenOtaService,
          krakenOtaControlAttribute,
          newValueBuffer.toString('base64'),
        )
        .then(characteristic => {
          console.log('Waiting 1000ms after writing CTL_END-------->',characteristic);
          return new Promise(r => setTimeout(r, 1000));
        })
        .catch(error => {
          console.log('Error occurred during finishing up DFU',error);

          return new Promise((r, f) => setTimeout(f, 1000));
        });
    } catch (error) {
      console.log('FINISH UP DFU ERROR!----->', error);
    }
  };


       
  

  return (
    <View style={{padding: 20}}>
      {/* Section selection buttons */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginVertical: 20,
        }}>
        <Button
          title="Kraken"
          onPress={() => setSelectedSection('Kraken')}
          color={selectedSection === 'Kraken' ? 'blue' : 'gray'}
        />
      </View>

      {/* Display list of connected devices with pressure data */}
      {deviceList.map(item => (
        <View key={item.deviceId} style={{marginVertical: 5}}>
          <Text>Address: {item.deviceId}</Text>
          <Text>Device Name: {item.deviceName}</Text>
          <Text>Battery Status: {item.batteryStatus}</Text>
          <PsiComponent deviceId={item.deviceId} />
          {item?.dfuFound && (
            <TouchableOpacity
              onPress={() => {
                setSelectedDevice(item);
                setModalVisible(true);
              }}
              style={{
                width: '25%',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'orange',
              }}>
              <Text>DFU</Text>
            </TouchableOpacity>
          )}
          <Modal
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              Alert.alert('Modal has been closed.');
              setModalVisible(!modalVisible);
            }}>
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text style={styles.modalText}>
                  Are you sure you want to update device data?
                </Text>
                <View
                  style={{
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 20,
                  }}>
                  <Pressable
                    style={[styles.buttonClose, styles.button]}
                    onPress={() => setModalVisible(false)}>
                    <Text style={styles.textStyle}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.buttonClose, styles.button]}
                    onPress={() => performDFU()}>
                    <Text style={styles.textStyle}>Confirm</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      ))}
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    // margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    borderColor: '#000',
    borderWidth: 1,
    width: '70%',
    height: '20%',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});
