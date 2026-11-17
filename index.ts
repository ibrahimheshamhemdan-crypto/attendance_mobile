// Pure JS Polyfill for global.crypto.getRandomValues (Zero native module dependencies)
if (typeof (global as any).crypto !== 'object') {
  (global as any).crypto = {};
}
if (typeof (global as any).crypto.getRandomValues !== 'function') {
  (global as any).crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
    if (array && 'byteLength' in array) {
      const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  };  
}

import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
