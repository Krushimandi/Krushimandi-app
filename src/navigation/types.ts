/**
 * Type definitions for Navigation
 */

import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Root Stack
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Notification: undefined;
  NotificationDetail: {
    title: string;
    message: string;
    date: string;
    time?: string;
    type?: 'transaction' | 'promotion' | 'update' | 'alert';
  };
  ProfileScreen: undefined;
  EditProfile: undefined;
  About: undefined;
  ChangePassword: undefined;
  HelpGuide: undefined;
  Languages: undefined;
  PrivacyPolicy: undefined;
  ProfileSettings: undefined;
  Settings: undefined;
  BuyerProfile: {
    buyerId: string;
    buyerName?: string;
  };
};

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  MobileScreen: undefined;
  OTPVerification: { phoneNumber: string };
  RoleSelection: undefined;
  IntroduceYourself: undefined;
};

// Common Screens Stack
export type CommonScreensParamList = {
  Notification: undefined;
  NotificationDetail: {
    title: string;
    message: string;
    date: string;
    time?: string;
    type?: 'transaction' | 'promotion' | 'update' | 'alert';
  };
  ProfileScreen: undefined;
  Settings: undefined;
  BuyerProfile: {
    buyerId: string;
    buyerName?: string;
  };
};

// Main Tab Navigator (Farmer)
export type MainTabParamList = {
  Home: undefined;
  AddFruit: undefined;
  AddFarm: undefined;
  Requests: undefined;
};

// Buyer Tab Navigator
export type BuyerTabParamList = {
  Home: undefined;
  Orders: undefined;
  Requests: undefined;
};

// Buyer Stack Navigator (includes tabs + product detail)
export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { productId: string; product?: any };
};

// Product Stack (for buyers)
export type ProductStackParamList = {
  ProductDetail: { productId: string };
};

// Farmer Product Stack (for farmers)
export type FarmerProductStackParamList = {
  FarmerTabs: undefined;
  ProductDetailsFarmer: { productId: string; product?: any };
};

// Fruit Stack (for farmers)
export type FruitStackParamList = {
  AddFruit: undefined;
  PhotoUpload: { fruitData: any };
  PriceSelection: { fruitData: any; photoUrls: string[] };
};

// Farm Stack (for farmers)
export type FarmStackParamList = {
  AddFarm: undefined;
  FarmDetails: { farmData: any };
  FarmLocation: { farmData: any };
  FarmPhotos: { farmData: any };
};
