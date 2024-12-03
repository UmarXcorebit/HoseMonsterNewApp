import React, { useEffect, useState, useCallback } from 'react';
import { manager } from '../components/BluetoothManager';
import { krakenDeviceUUID, KrakenUUIDs } from '../kraken/KrakenUUIDs';
import { bytesToString } from 'convert-string';
import { Text, View } from 'react-native';

// Memoize PsiComponent to prevent unnecessary re-renders
const PsiComponent = React.memo(({ deviceId }) => {
  const [pressure, setPressure] = useState('?');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effect to start monitoring when deviceId changes
  useEffect(() => {
    if (!deviceId) return;

    setLoading(true);
    setError(null);
    monitorPressure(deviceId);

    return () => {
      // Cleanup (e.g., stop monitoring when component unmounts or deviceId changes)
      manager.removeDeviceListener(deviceId);
    };
  }, [deviceId, monitorPressure]);

  // Memoize the monitoring function to prevent unnecessary re-creation
  const monitorPressure = useCallback(async (deviceId) => {
    try {
      const subscription = manager.monitorCharacteristicForDevice(
        deviceId,
        krakenDeviceUUID,
        KrakenUUIDs.devicePressureSubscriptionCharacteristicUUID,
        (error, characteristic) => {
          if (error) {
            setError('Failed to subscribe to pressure data');
            setLoading(false);
            return;
          }

          const krakenData = extractPressureData(characteristic);
          setPressure(krakenData?.pressure);
          setLoading(false);
        }
      );

      // Cleanup function to remove listener
      return () => subscription.remove();
    } catch (err) {
      setError('Error monitoring pressure');
      setLoading(false);
      console.error(err);
    }
  }, []);

  // Convert pressure data to PSI format
  function readingToPsi(bytes) {
    let pressure = bytesToString(bytes.filter(byte => byte !== 0));
    pressure = Number.parseInt(pressure).toString();

    // Format pressure to show decimal point
    if (pressure.length === 1) {
      return `0.${pressure}`;
    } else {
      const separatorIndex = pressure.length - 1;
      return `${pressure.slice(0, separatorIndex)}.${pressure.slice(separatorIndex)}`;
    }
  }

  // Extract pressure data from the characteristic
  const extractPressureData = (deviceDetails) => {
    const readData = Uint8Array.from(atob(deviceDetails.value), c => c.charCodeAt(0));
    const pressureBytes = readData.slice(16, 21);  // Adjust byte range based on your data format
    return { pressure: readingToPsi(pressureBytes) };
  };

  // Render loading, error, or pressure data
  return (
    <View>
      {loading && <Text>Loading pressure...</Text>}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {!loading && !error && <Text>Pressure: {pressure} PSI</Text>}
    </View>
  );
});

export default PsiComponent;
