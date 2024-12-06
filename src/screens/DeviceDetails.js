import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import { manager } from '../components/BluetoothManager';
import { krakenDeviceUUID, KrakenUUIDs } from '../kraken/KrakenUUIDs';
import base64 from 'react-native-base64';
const DeviceDetails = ({route}) => {
    console.log('item', route.params.item)

    const DeviceData= route.params.item;
    console.log('DeviceData', DeviceData)
    const [text, setText] = useState('');


    const performWrite = async function (action, data) {
        // switch (action) {
        //   case 'name':
        //     if (onNameChange() == 'invalid') {
        //       return;
        //     }
        //     break;
        //   case 'serial number':
        //     if (newSerialNumber.length > 8) {
        //       Alert.alert('Character limit: 8 characters');
        //       return;
        //     }
        //     break;
        // }


        await disconnectDevice(DeviceData?.deviceId).then(async () => {
            await connectToDevice(DeviceData?.deviceId).then(async device =>
              await device.discoverAllServicesAndCharacteristics().then(async () => {
                await writeDataToDevice(DeviceData.deviceId, action, data)
                  .then(async () => {

      
                  })
                  .catch(e => {
                    console.log(e);
                    // Toaster(`${action} ${Messages.toasterFailed}`);
       
                  });
              }),
            );
          });

    }



   async  function disconnectDevice(deviceId) {
        console.log('Attempting : disconnection..');
        let status = await manager.cancelDeviceConnection(deviceId)
          .then(async () => {
            console.log('Device has been disconnected successfully');
            return 'Device has been disconnected successfully';
          })
          .catch(error => {
            console.log(`error while disconnecting : ${error.message}`);
            return `error while disconnecting : ${error.message}`;
          });
        return status;
    };

    async function connectToDevice(deviceId, options = {}) {
        return await manager.connectToDevice(deviceId, options)
      }
      async  function writeDataToDevice(deviceId, action, data) {
        let encodedValue = data;
        let status = '';
        let characteristicUUID = '';
      
        switch (action) {
          case 'name':
            characteristicUUID = KrakenUUIDs.krakenDisplayNameCharacteristicUUID;
            encodedValue = base64.encode(data+'\0');
            break;
          case 'serial number':
            characteristicUUID =
              KrakenUUIDs.krakenSerialNumberWriteCharacteristicUUID;
            encodedValue = base64.encode(data);
            break;
          case 'zero sensor':
            characteristicUUID = KrakenUUIDs.krakenZeroSensorCharacteristicUUID;
            break;
            case  "Smoothing Samples":
            characteristicUUID = KrakenUUIDs.krakenSmoothingSampleCharacteristicUUID;
            break;
            case "Update Frequency":
            characteristicUUID = KrakenUUIDs.krakenUpdateFrequencyCharacteristicUUID;
            break;
  
        }
        console.log(`encoded value : ${encodedValue}`);
        console.log(`characteristicUUID value : ${characteristicUUID}`);
        await  manager.writeCharacteristicWithResponseForDevice(deviceId, krakenDeviceUUID, characteristicUUID, encodedValue)
          .then(() => {
            console.log('Write Success' )
            status = 'Write Success';
          })
          .catch(error => {
            console.log(`error while writing : ${error.message}`);
            status = 'Write Failed';
          });
      
        return status;
    };




  return (
    <View style={styles.container}>
    <TextInput
      style={styles.input}
      placeholder="Type your message..."
      placeholderTextColor="#888" // Light gray placeholder text
      value={text}
      onChangeText={setText}
    />

    <TouchableOpacity
    
    onPress={()=>performWrite('name', text)}
    style={styles.buttonContainer}>
        <Text>
            Change Display Name
        </Text>
    </TouchableOpacity>
  </View>
  )
}

export default DeviceDetails

const styles = StyleSheet.create({
    container: {
        flex: 1,
      backgroundColor:'white',
        padding: 16,
      },
      input: {
        height: 50,
        backgroundColor: '#f0f0f0', // Light gray background
        borderRadius: 25, // Rounded corners
        paddingHorizontal: 16, // Padding inside the input
        fontSize: 16,
        color: '#333', // Dark text color
      },
      buttonContainer:{
        alignItems:'center',
        justifyContent:'center',
        alignSelf:'center',
        width:'50%',
        marginVertical:30,
        height:40,
        backgroundColor:'orange',
        borderRadius:15,
      }
})