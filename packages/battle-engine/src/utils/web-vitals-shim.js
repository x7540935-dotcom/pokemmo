import {
  onCLS,
  onFCP,
  onINP,
  onLCP,
  onTTFB,
} from '../../vendor/web-vitals.js';

export const onFID = (callback, options) => onINP(callback, options);

export { onCLS, onFCP, onLCP, onTTFB };


