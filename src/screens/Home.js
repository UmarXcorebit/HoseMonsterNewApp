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
import {krakenDeviceUUID} from '../kraken/KrakenUUIDs';
import {manager} from '../components/BluetoothManager';
import PsiComponent from '../components/PsiComponent';
import { ZeroByteFW } from '@zerobytellc/zerobyte-firmware-utils';
import RNFetchBlob from 'rn-fetch-blob';

const Home = () => {
  const [deviceList, setDeviceList] = useState([]);
  const [selectedSection, setSelectedSection] = useState('Kraken');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

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
        console.log('here we are going to scan...!');
        // subscription.remove();
        console.log('here we are going to after...!');
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
      }

      const deviceInfo = await device.discoverAllServicesAndCharacteristics();
      if (deviceInfo) {
        const batteryStatus = await getBatteryStatus(deviceInfo);
        updateDeviceList(device, batteryStatus);
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

      if (existingDeviceIndex === -1) {
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
  }
  const performDFU = async () => {
  console.log(`Performing firmware update for ${selectedDevice?.deviceName} : ${selectedDevice?.deviceId}`);
  let firmwarePaths = await getFirmwareFile('kraken');
  //get  path of the file in an array
  console.log( "Success Path---->",firmwarePaths);
  }

  const readFileAndStartFlashing = async function (
    deviceId,
    firmwarePath,
    skipReboot,
    steps,
  ) {
    let firmwareBytes = await readFirmwareBytes(firmwarePath);
  };

  const readFirmwareBytes = async function (filePath) {
    let stats = await RNFetchBlob.fs.stat(`${filePath}`);
    console.log('stats', stats)

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
                setSelectedDevice(item)
                setModalVisible(true)
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
                    onPress={() => 
                      performDFU()
                    }>
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
