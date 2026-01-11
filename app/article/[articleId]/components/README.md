# Article Components

This directory contains modularized components for the article reading experience.

## Components

### 1. **TranslationWarning.tsx**

- Warning message that appears after 3 Korean translation clicks
- Features: Auto-hide after 5 seconds, animated slide in/out
- Props: `isVisible`, `onClose`

## Shared Constants

### **constants/colors.ts**

- Centralized color palette used across all components
- Ensures consistent styling and easy theme updates

## Benefits of Modularization

1. **Maintainability**: Each component has a single responsibility
2. **Reusability**: Components can be reused across different parts of the app
3. **Testing**: Individual components can be tested in isolation
4. **Code Organization**: Cleaner main ArticleClient component
5. **Performance**: Better tree-shaking and code splitting opportunities

## Usage

```tsx
import TranslationWarning from "./components/TranslationWarning";
import { colors } from "./constants/colors";
```

## New Features Added

1. **Translation Warning System**: Shows warning after 3 Korean translation clicks with message "한국어에 너무 의존하면 영어 공부에 도움이 안됩니다"
2. **Improved UX**: Smooth animations and responsive design across all components
