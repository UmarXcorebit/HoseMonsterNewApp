import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../screens/Home";
import { createStaticNavigation } from "@react-navigation/native";
import DeviceDetails from "../screens/DeviceDetails";


const RootStack = createNativeStackNavigator({
    screens: {
      Home: Home,
      Deatils:DeviceDetails
    },
  });
  
  export const Navigation = createStaticNavigation(RootStack);