// Using the external pymscada wwwserver to serve dist/angmscada
module.exports = function (config) {
  config.set({
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--remote-debugging-port=9876'],
        chromeDataDir: '/tmp/chrome-test-profile-1234',
        browserName: 'chrome',
        chromeExecutable: '/usr/bin/chromium'
      }
    },
    hostname: '192.168.1.28',
    port: 9876,
    singleRun: false,
    autoWatch: true,
    files: [
      { pattern: 'dist/angmscada/**/*', watched: true, included: false, served: true }
    ],
    proxies: {
      '/': 'http://192.168.1.28:8324/'
    },
    // Add these settings to allow manual browser connection for reporting
    browserNoActivityTimeout: 300000, // 5 minutes
    captureTimeout: 300000,
    frameworks: ['jasmine']
  });
};

