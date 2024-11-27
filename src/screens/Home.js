import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
  Text,
  View,
} from 'react-native';
import {
  arcusDeviceUUID,
  krakenDeviceUUID,
  KrakenUUIDs,
} from '../kraken/KrakenUUIDs';
import { manager } from './BluetoothManager';
import { bytesToString } from 'convert-string';

const Home = () => {
  const [deviceList, setDeviceList] = useState([]);
  console.log('deviceList---->', deviceList)
  const [selectedSection, setSelectedSection] = useState('Kraken');

  // Request Bluetooth permission
  const requestBluetoothPermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }
    if (
      Platform.OS === 'android' &&
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    ) {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      if (
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN &&
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      ) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          result['android.permission.BLUETOOTH_CONNECT'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }

    Alert.alert('Permissions have not been granted');
    return false;
  };

  // Request permissions on component mount
  useEffect(() => {
    requestBluetoothPermission();
  }, []);

  // Start scanning once Bluetooth is powered on
  useEffect(() => {
    const subscription = manager.onStateChange(state => {
      if (state === 'PoweredOn') {
        scanAndConnect();
        subscription.remove();
      }
    }, true);
    return () => subscription.remove();
  }, [manager]);

  // Scan for devices and connect
  async function scanAndConnect() {
  
    manager.startDeviceScan([], { allowDuplicates: false }, async (error, device) => {

      if(error){
        return;
      }
      const isKraken =
        device.serviceUUIDs && device.serviceUUIDs.includes(krakenDeviceUUID);

        if (device.name == null || device.localName == null) {
          return;
        }
        if(isKraken){
          try {
            let isConnectedDevice = await device.isConnected();
          if(isConnectedDevice){
            connectDeviceInfo(device)
          }else{
            let  connectDevice = await device.connect();
            connectDeviceInfo(connectDevice)
            

          }

          } catch (error) {
            
          }
       
        }
    })
 
  }


  const connectDeviceInfo =  async(device) => {
    let deviceInfo = await device.discoverAllServicesAndCharacteristics();

    if(deviceInfo){
  
    
      let getDevicedetails = await deviceInfo.readCharacteristicForService('180F','2A19');
    
    if(getDevicedetails){

      const convertedValue = Uint8Array.from(
        atob(getDevicedetails.value),
        c => c.charCodeAt(0),
      );
      const batteryStatus = getBatteryReading(convertedValue[0]);


      const myData = manager.monitorCharacteristicForDevice(
        getDevicedetails?.deviceID,
        krakenDeviceUUID,
        KrakenUUIDs.devicePressureSubscriptionCharacteristicUUID,
        (error, characteristic) => {
       
          const krakenData = readDeviceSubscriptionData(characteristic);

          // Update deviceList based on Kraken/Arcus data
          setDeviceList(prevDeviceList => {
            const updatedDeviceList = [...prevDeviceList];

            const existingDeviceIndex = updatedDeviceList.findIndex(
              d => d.deviceId === device.id,
            );
  

            const newDevice = generateDeviceInformationObject(
              device.id,
              device.name,
              batteryStatus,
              krakenData.pressure,
       
            );

            if (existingDeviceIndex === -1) {
              updatedDeviceList.push(newDevice);
            } else {
              updatedDeviceList[existingDeviceIndex] = newDevice;
            }

            return updatedDeviceList;
          });
        },
    
      );
    }
    
  }
  }

  function getBatteryReading(value) {
    let batteryStatus = '';
    if (value === 255) {
      batteryStatus = 'Charging..';
    } else {
      batteryStatus = `${value}%`;
    }
    return batteryStatus;
  }

  // Update pressure data for a device that already exists in the list
  function updatePressureForDevice(deviceId, pressure) {
    // Instead of updating the entire device list, only modify the pressure for the updated device
    setDeviceList(prevDeviceList => {
      const updatedList = prevDeviceList.map(device =>
        device.deviceId === deviceId
          ? { ...device, pressure: pressure || '?' } // Ensure pressure is updated
          : device
      );
      return updatedList;
    });
  }

  // Update the device list with new devices or existing devices with updated pressure data
  function updateDeviceList(prevDeviceList, device) {
    const newDevice = generateDeviceInformationObject(
      device.id,
      device.name,
      device.serviceUUIDs
    );

    return prevDeviceList.some(d => d.deviceId === device.id)
      ? prevDeviceList // If device already exists, don't add it again
      : [...prevDeviceList, newDevice]; // Add new device to list if not present
  }

  // Generate device information object with default pressure value as '?'
  function generateDeviceInformationObject(address, name, id,pressure) {
    return {
      deviceId: address,
      deviceName: name,
      id: id,
      pressure: pressure, // Initially set to '?' before pressure data is received
    };
  }

  // Parse the pressure data from the characteristic
  function readDeviceSubscriptionData(data) {

    let readData = Uint8Array.from(atob(data.value), c => c.charCodeAt(0));

    let krakenIndex = 0;

    let pressure = readingToPsi(
      readData.slice(krakenIndex + 16, krakenIndex + 21),
      5
    );

    return { pressure };
  }

  // Convert pressure data to PSI format
  function readingToPsi(bytes) {

    let pressure = bytesToString(bytes.filter(byte => byte != 0));

    pressure = Number.parseInt(pressure).toString();

    if (pressure.length === 1) {
      pressure = '0.' + pressure;
    } else {
      let separatorIndex = pressure.length - 1;
      pressure =
        pressure.slice(0, separatorIndex) +
        '.' +
        pressure.slice(separatorIndex);
    }
    return pressure;
  }

  // Filter devices based on selected section (Kraken or Arcus)
  const filterDevices = () => {
    if (selectedSection === 'Kraken') {
      return deviceList.filter(device =>
        device.id?.includes(krakenDeviceUUID)
      );
    } else if (selectedSection === 'Arcus') {
      return deviceList.filter(device =>
        device.id?.includes(arcusDeviceUUID)
      );
    } else {
      return deviceList; // Return all devices if no section is selected
    }
  };

  return (
    <View style={{ padding: 20 }}>


      {/* Toggle Buttons for Kraken and Arcus */}
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
        {/* <Button
          title="Arcus"
          onPress={() => setSelectedSection('Arcus')}
          color={selectedSection === 'Arcus' ? 'blue' : 'gray'}
        /> */}
      </View>

      {/* Display Devices with Pressure Data */}
      {deviceList.map(item => (
        <View key={item.deviceId} style={{ marginVertical: 5 }}>
          <Text>Address: {item.deviceId}</Text>
          <Text>Device Name: {item.deviceName}</Text>
          <Text>Battery Status: {item.id}</Text>
          <Text>Pressure: {item.pressure}</Text>
        </View>
      ))}
    </View>
  );
};

export default Home;
