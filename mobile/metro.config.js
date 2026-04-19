const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, { isCSSEnabled: true });

config.resolver.assetExts = [...(config.resolver.assetExts ?? []), 'glb', 'gltf', 'bin', 'hdr'];

module.exports = config;
