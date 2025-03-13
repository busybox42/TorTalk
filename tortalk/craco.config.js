module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          "crypto": require.resolve("crypto-browserify"),
          "stream": require.resolve("stream-browserify"),
          "assert": require.resolve("assert/"),
          "http": require.resolve("stream-http"),
          "https": require.resolve("https-browserify"),
          "os": require.resolve("os-browserify/browser"),
          "url": require.resolve("url/"),
          "util": require.resolve("util/"),
          "zlib": require.resolve("browserify-zlib"),
          "path": require.resolve("path-browserify"),
          "querystring": require.resolve("querystring-es3"),
          "buffer": require.resolve("buffer/"),
          "fs": false,
          "net": false,
          "tls": false,
          "dns": false
        }
      }
    }
  }
}; 