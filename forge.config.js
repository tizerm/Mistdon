module.exports = {
  packagerConfig: {
    asar: true,
    icon: './path/to/icon'
  },
  rebuildConfig: {},
  makers: [
    /*
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        iconUrl: 'https://url/to/icon.ico',
        setupIcon: './path/to/icon.ico'
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },*/
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
      config: {
        icon: './path/to/icon.ico'
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      platforms: ["win32"],
      config: {
        repository: {
          owner: "tizerm",
          name: "Mistdon"
        },
      },
    },
  ],
};
