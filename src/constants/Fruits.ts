import { LegacyFruit } from '../types';

export const Fruits: LegacyFruit[] = [
  {
    id: 1,
    name: 'Banana',
    image: require('../assets/fruits/banana.png'),
    bgColor: '#FFF7B2',
    description: "Bananas are a powerhouse of natural energy and one of the most convenient snacks. Rich in potassium, they help maintain proper heart and muscle function. They also contain vitamin B6, magnesium, and dietary fiber, making them great for digestion and mood regulation.",
  },
  // {
  //   id: 2,
  //   name: 'Orange',
  //   image: require('../assets/fruits/orange.png'),
  //   bgColor: '#FFE1B3',
  //   description: "Oranges are one of the most popular citrus fruits, loved for their juicy sweetness and refreshing tang. Packed with vitamin C, they help strengthen the immune system, promote glowing skin, and support heart health.",
  // },
  // {
  //   id: 3,
  //   name: 'Grape',
  //   image: require('../assets/fruits/grapes.png'),
  //   bgColor: '#E8D5F0',
  //   description: "Grapes are sweet, juicy fruits packed with antioxidants and resveratrol, which support heart health and may help protect against aging. They're also rich in vitamin C and potassium, making them great for hydration and immune support.",
  // },
  // {
  //   id: 4,
  //   name: 'Pomegranate',
  //   image: require('../assets/fruits/pomegranate.png'),
  //   bgColor: '#FFD8DA',
  //   description: "Pomegranates are ruby-red fruits filled with juicy seeds called arils. They're exceptionally rich in antioxidants, vitamin C, and anti-inflammatory compounds that support heart health, boost immunity, and promote healthy aging.",
  // },
  {
    id: 5,
    name: 'Sweet Lemon',
    image: require('../assets/fruits/sweetlemon.png'),
    bgColor: '#F0F8D0',
    description: "Sweet lemons are citrus fruits with a mild, sweet-tart flavor. They're rich in vitamin C, citric acid, and antioxidants that help boost immunity, aid digestion, and support detoxification. Perfect for fresh juice or adding zest to dishes.",
  },
  // {
  //   id: 6,
  //   name: 'Apple',
  //   image: require('../assets/fruits/Apple.png'),
  //   bgColor: '#FFE1E1',
  //   description: "Apples are crisp, sweet fruits known for their high fiber content and antioxidants. They aid digestion, help manage weight, and support heart health. Rich in vitamin C and various polyphenols, apples are perfect for daily nutrition.",
  // },
  // {
  //   id: 7,
  //   name: 'Mango',
  //   image: require('../assets/fruits/mango.png'),
  //   bgColor: '#FFE8B3',
  //   description: "Mangoes are tropical fruits with sweet, juicy flesh and a rich, creamy texture. They're loaded with vitamin A, vitamin C, and antioxidants that support eye health, immunity, and skin health. Known as the 'king of fruits' for their exceptional taste.",
  // },
];

// Export supported fruit types for validation
export const SUPPORTED_FRUIT_TYPES = [
  'banana',
  'orange', 
  'grape',
  'pomegranate',
  'sweet lemon',
  'apple',
  'mango'
];

// Helper function to get fruit by type
export const getFruitByType = (type: string) => {
  return Fruits.find(fruit => fruit.name.toLowerCase() === type.toLowerCase());
};

// Helper function to validate fruit type
export const isValidFruitType = (type: string): boolean => {
  return SUPPORTED_FRUIT_TYPES.includes(type.toLowerCase());
};
