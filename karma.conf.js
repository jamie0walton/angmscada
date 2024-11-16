module.exports = function (config) {
  config.set({
    browsers: [],
    autoWatch: false,
    files: [
      { pattern: 'dist/angmscada/**/*', watched: true, included: false, served: true }
    ],
    proxies: {
      '/': 'http://192.168.1.28:8324/'
    },
    browserNoActivityTimeout: 300000,
    captureTimeout: 300000,
    frameworks: ['jasmine'],
    plugins: [
      'karma-jasmine',
      'karma-coverage'
    ]
  });
};

