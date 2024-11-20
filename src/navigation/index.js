import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../screens/Home";
import { createStaticNavigation } from "@react-navigation/native";


const RootStack = createNativeStackNavigator({
    screens: {
      Home: Home,
    },
  });
  
  export const Navigation = createStaticNavigation(RootStack);