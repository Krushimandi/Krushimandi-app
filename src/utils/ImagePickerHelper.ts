import ImagePicker, { ImageOrVideo } from 'react-native-image-crop-picker';

export type PickImageOptions = {
  width?: number;
  height?: number;
  cropping?: boolean;
  compressImageQuality?: number; // 0 to 1
  multiple?: boolean;
};

export const pickImageFromGallery = async (
  options: PickImageOptions = {}
): Promise<ImageOrVideo | ImageOrVideo[]> => {
  try {
    const image = await ImagePicker.openPicker({
      width: options.width || 500,
      height: options.height || 500,
      cropping: options.cropping ?? false,
      compressImageQuality: options.compressImageQuality ?? 0.8,
      multiple: options.multiple ?? false,
    });
    return image;
  } catch (error) {
    console.error('Gallery pick cancelled or failed', error);
    throw error;
  }
};

export const takePhotoWithCamera = async (
  options: PickImageOptions = {}
): Promise<ImageOrVideo> => {
  try {
    const image = await ImagePicker.openCamera({
      width: options.width || 500,
      height: options.height || 500,
      cropping: options.cropping ?? false,
      compressImageQuality: options.compressImageQuality ?? 0.8,
    });
    return image;
  } catch (error) {
    console.error('Camera capture cancelled or failed', error);
    throw error;
  }
};

// Optional cleanup to free temp files
export const cleanTempImages = async (): Promise<void> => {
  try {
    await ImagePicker.clean();
    console.log('Temporary images cleaned.');
  } catch (error) {
    console.warn('Failed to clean temp images', error);
  }
};