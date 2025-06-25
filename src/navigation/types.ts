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
  ProductFlow: undefined;
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
  ProductDetail: { productId: string };
};

// Main Tab Navigator (Farmer)
export type MainTabParamList = {
  Home: undefined;
  AddFruit: undefined;
  Requests: undefined;
};

// Buyer Tab Navigator
export type BuyerTabParamList = {
  Home: undefined;
  Browse: undefined;
  Orders: undefined;
  Watchlist: undefined;
};

// Product Stack
export type ProductStackParamList = {
  ProductDetail: { productId: string };
};

// Fruit Stack (for farmers)
export type FruitStackParamList = {
  AddFruit: undefined;
  PhotoUpload: { fruitData: any };
  PriceSelection: { fruitData: any; photoUrls: string[] };
};
