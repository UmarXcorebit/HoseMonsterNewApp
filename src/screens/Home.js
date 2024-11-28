import React, { useEffect, useState } from 'react';
import { Alert, Button, PermissionsAndroid, Platform, Text, View } from 'react-native';
import { krakenDeviceUUID } from '../kraken/KrakenUUIDs';
import { manager } from '../components/BluetoothManager';
import PsiComponent from '../components/PsiComponent';

const Home = () => {
  const [deviceList, setDeviceList] = useState([]);
  const [selectedSection, setSelectedSection] = useState('Kraken');

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
        permission => granted[permission] === PermissionsAndroid.RESULTS.GRANTED
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
        subscription.remove();
      }
    }, true);

    return () => subscription.remove();
  }, []);

  // Scan for devices and connect
  const scanAndConnect = async () => {
    manager.startDeviceScan([], { allowDuplicates: false }, async (error, device) => {
      if (error || !device.name) return;

      const isKraken = device.serviceUUIDs?.includes(krakenDeviceUUID);
      if (isKraken) {
        await handleDeviceConnection(device);
      }
    });
  };

  // Handle device connection and add to the device list
  const handleDeviceConnection = async (device) => {
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
      manager.onDeviceDisconnected(device.id,(error,device)=> {
        if(error){
          console.error('device in case disconnected', error)
        }

      })
      // console.error(`Error connecting to device ${device.name}:`, error);
    }
  };

  // Get battery status from the device
  const getBatteryStatus = async (deviceInfo) => {
    const getDeviceDetails = await deviceInfo.readCharacteristicForService('180F', '2A19');
    if (getDeviceDetails) {
      const convertedValue = Uint8Array.from(atob(getDeviceDetails.value), c => c.charCodeAt(0));
      return convertedValue[0] === 255 ? 'Charging..' : `${convertedValue[0]}%`;
    }
    return 'Unknown';
  };

  // Update device list
  const updateDeviceList = (device, batteryStatus) => {
    setDeviceList(prevDeviceList => {
      const updatedDeviceList = [...prevDeviceList];
      const existingDeviceIndex = updatedDeviceList.findIndex(d => d.deviceId === device.id);

      const newDevice = {
        deviceId: device.id,
        deviceName: device.name,
        batteryStatus,
      };

      if (existingDeviceIndex === -1) {
        updatedDeviceList.push(newDevice);
      } else {
        updatedDeviceList[existingDeviceIndex] = newDevice;
      }

      return updatedDeviceList;
    });
  };

  return (
    <View style={{ padding: 20 }}>
      {/* Section selection buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 }}>
        <Button
          title="Kraken"
          onPress={() => setSelectedSection('Kraken')}
          color={selectedSection === 'Kraken' ? 'blue' : 'gray'}
        />
      </View>

      {/* Display list of connected devices with pressure data */}
      {deviceList.map(item => (
        <View key={item.deviceId} style={{ marginVertical: 5 }}>
          <Text>Address: {item.deviceId}</Text>
          <Text>Device Name: {item.deviceName}</Text>
          <Text>Battery Status: {item.batteryStatus}</Text>
          <PsiComponent deviceId={item.deviceId} />
        </View>
      ))}
    </View>
  );
};

export default Home;
