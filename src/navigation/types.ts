/**
 * Type definitions for Navigation
 */

import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Root Stack
export type RootStackParamList = {
  Auth: undefined;
  Main?: {
    screen?: 'BuyerTabs';
    params?: {
      screen?: keyof BuyerTabParamList;
    };
  };
  Notification: undefined;
  NotificationDetail: {
    id: string;
    title: string;
    body: string; // Changed from message to body to match Firebase structure
    date: string;
    time?: string;
    type?: 'transaction' | 'promotion' | 'update' | 'alert' | 'request';
    offer?: any;
    actionUrl?: string;
    category?: string;
    createdAt?: string;
    orderId?: string;
    requestId?: string;
    status?: string;
  };
  ProfileScreen: undefined;
  EditProfile: undefined;
  About: undefined;
  ChangePassword: undefined;
  HelpGuide: undefined;
  HelpScreen: undefined;
  FaqDetail: undefined;
  PaymentSecurity: undefined;
  AppPlatform: undefined;
  BestPractices: undefined;
  Languages: undefined;
  TermsCondition: undefined;
  PrivacyOnly: undefined;
  BuyerProfile: {
    buyerId: string;
    buyerName?: string;
  };
  ChatList: undefined;
  ChatDetail: undefined;
};

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  MobileScreen: undefined;
  OTPVerification: { phoneNumber: string };
  RoleSelection: undefined;
  IntroduceYourself: undefined;
  FruitsScreen: { onboarding?: boolean; mode?: string; fromAuth?: boolean } | undefined;
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
  Requests: undefined;
  AddFruit: undefined;
  Chats: undefined;
  Profiles: undefined;
};

// Buyer Tab Navigator
export type BuyerTabParamList = {
  Home: undefined;
  Chats: undefined;
  Requests: undefined;
};

// Buyer Stack Navigator (includes tabs + product detail)
export type BuyerStackParamList = {
  BuyerTabs: undefined;
  ProductDetail: { productId: string; product?: any };
  FruitsScreen: undefined;
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
