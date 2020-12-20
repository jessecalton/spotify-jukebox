if (process.env.NODE_ENV === 'production') {
  // we are in prod
  module.exports = require('./prod');
} else {
  // we are in development
  module.exports = require('./dev');
}
