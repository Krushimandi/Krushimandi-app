import React from 'react';
import { ViewStyle } from 'react-native';
import { SvgProps } from 'react-native-svg';

// Import SVG icons
import HomeIcon from '../../assets/icons/home.svg'; // Example icon, replace with actual path

// Define types for our icons
type IconName = 'home';
type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
};

/**
 * SvgIcon component for using SVG icons with customizable size and color
 */
const SvgIcon: React.FC<IconProps> = ({ name, size = 24, color = '#000', style }) => {
  const getIcon = () => {
    switch (name) {
      case 'home':
        return <HomeIcon width={size} height={size} fill={color} style={style} />;
      default:
        return null;
    }
  };

  return getIcon();
};

export default SvgIcon;
