module.exports = {
    apps : [{
      name: "supersimpleautoresponder",
      script: "./index.js",
      args: "test:none",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      }
    }]
  }
  