const fs = require('node:fs');
const path = require('node:path');

const reactNativeRoot = path.join(__dirname, '..', 'node_modules', 'react-native');
const shimPath = path.join(reactNativeRoot, 'rn-get-polyfills.js');

if (!fs.existsSync(reactNativeRoot)) {
  process.exit(0);
}

if (!fs.existsSync(shimPath)) {
  fs.writeFileSync(
    shimPath,
    "module.exports = function getPolyfills() { return require('@react-native/js-polyfills')(); };\n",
    'utf8'
  );
  console.log('Created react-native/rn-get-polyfills compatibility shim.');
}
