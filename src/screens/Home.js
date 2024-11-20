import {
  View,
  Text,
  Platform,
  Alert,
  PermissionsAndroid,
  FlatList,
  Button,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import {manager} from './BluetoothManager';
import {
  arcusDeviceUUID,
  krakenDeviceUUID,
  KrakenUUIDs,
} from '../kraken/KrakenUUIDs';
import {bytesToString} from 'convert-string';

const Home = () => {
  const [deviceList, setDeviceList] = useState([]);


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
  React.useEffect(() => {
    const subscription = manager.onStateChange(state => {
      if (state === 'PoweredOn') {
        scanAndConnect();
        subscription.remove();
      }
    }, true);
    return () => subscription.remove();
  }, [manager]);

  // Scan for devices and connect
  function scanAndConnect() {
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        return;
      }

      const isKraken =
        device.serviceUUIDs && device.serviceUUIDs.includes(krakenDeviceUUID);
      const isArcus =
        device.serviceUUIDs && device.serviceUUIDs.includes(arcusDeviceUUID);

      if (isKraken || isArcus) {
        device
          .connect()
          .then(device => device.discoverAllServicesAndCharacteristics())
          .then(device => {
            return device.readCharacteristicForService('180F', '2A19');
          })
          .then(deviceResult => {
            const convertedValue = Uint8Array.from(
              atob(deviceResult.value),
              c => c.charCodeAt(0),
            );
            const batteryStatus = getBatteryReading(convertedValue[0]);

            const myData = manager.monitorCharacteristicForDevice(
              deviceResult?.deviceID,
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
                  console.log('Device info:', {
                    deviceId: device.id,
                    name: device.name,
                    battery: batteryStatus,
                    signalStrength: device.rssi,
                    krakenName: krakenData.name,
                    pressure: krakenData.pressure,
                    isKraken,
                    isArcus,
                  });

                  const newDevice = generateDeviceInformationObject(
                    device.id,
                    device.name,
                    batteryStatus,
                    device.rssi,
                    krakenData.name,
                    krakenData.pressure,
                    isKraken,
                    isArcus,
                  );

                  if (existingDeviceIndex === -1) {
                    updatedDeviceList.push(newDevice);
                  } else {
                    updatedDeviceList[existingDeviceIndex] = newDevice;
                  }

                  return updatedDeviceList;
                });
              },
              deviceResult?.deviceID,
            );
          })
          .catch(error => console.log('error', error));
      }
    });
  }

  function readDeviceSubscriptionData(data) {
    let readData = Uint8Array.from(atob(data.value), c => c.charCodeAt(0));

    let krakenIndex = 0;
    let name = bin2String(readData.slice(krakenIndex, krakenIndex + 16), 16);
    let pressure = readingToPsi(
      readData.slice(krakenIndex + 16, krakenIndex + 21),
      5,
    );

    return {name, pressure};
  }

  function bin2String(bytes, len) {
    let result = '';
    for (let i = 0; bytes[i] !== 0 && i < len; ++i) {
      result += String.fromCharCode(parseInt(bytes[i]));
    }

    return result;
  }

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

  function getBatteryReading(value) {
    let batteryStatus = '';
    if (value === 255) {
      batteryStatus = 'Charging..';
    } else {
      batteryStatus = `${value}%`;
    }
    return batteryStatus;
  }

  function generateDeviceInformationObject(
    address,
    name,
    batteryStatus,
    signalStrength,
    krakenName,
    pressure,
    isKraken,
    isArcus,
  ) {
    return {
      deviceId: address,
      deviceName: name,
      battery: batteryStatus,
      signalStrength,
      krakenName,
      pressure,
      isKraken,
      isArcus,
    };
  }

  // Filter devices that have a valid battery level

  const krakenDevices = deviceList.filter(device => device.isKraken);
  const arcusDevices = deviceList.filter(device => device.isArcus);



  return (
    <View style={{padding: 20}}>
      <Text style={{fontSize: 24, fontWeight: 'bold'}}>Home</Text>

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
        <Button
          title="Arcus"
          onPress={() => setSelectedSection('Arcus')}
          color={selectedSection === 'Arcus' ? 'blue' : 'gray'}
        />
      </View>

      {/* Conditional Rendering of Sections */}
      {selectedSection === 'Kraken' && (
        <View>
          <Text style={{fontWeight: 'bold', fontSize: 18}}>Kraken Devices</Text>
          <FlatList
            data={krakenDevices}
            keyExtractor={item => item.deviceId}
            renderItem={({item}) => (
              <View style={{marginVertical: 5}}>
                <Text>Address</Text>
                <Text>{item.deviceId}</Text>
                <Text>Device Name: {item.deviceName}</Text>
                <Text>Pressure: {item.pressure}</Text>
                <Text>Signal Strength: {item.signalStrength}</Text>
                <Text>Battery: {item.battery}</Text>
              </View>
            )}
          />
        </View>
      )}

      {selectedSection === 'Arcus' && (
        <View>
          <Text style={{fontWeight: 'bold', fontSize: 18}}>Arcus Devices</Text>
          <FlatList
            data={arcusDevices}
            keyExtractor={item => item.deviceId}
            renderItem={({item}) => (
              <View style={{marginVertical: 5}}>
                <Text>Address</Text>
                <Text>{item.deviceId}</Text>
                <Text>Device Name: {item.deviceName}</Text>
                <Text>Signal Strength: {item.signalStrength}</Text>
                <Text>Battery: {item.battery}</Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
};

export default Home;
