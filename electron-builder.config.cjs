module.exports = {
  appId: 'com.agentworkspace.app',
  productName: 'Agent Workspace',
  directories: {
    output: 'dist',
    buildResources: 'assets',
  },
  files: ['out/**/*'],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    category: 'public.app-category.developer-tools',
  },
  win: { target: 'nsis' },
  linux: { target: 'AppImage' },
}
