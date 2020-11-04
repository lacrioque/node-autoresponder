module.exports = {
    apps : [{
      name: "supersimpleautoresponder",
      script: "./index.js",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    }]
  }
  