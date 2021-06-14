const _ = require('lodash');

String.prototype.replaceAll = function (search, replace) {
  if (replace === undefined) {
    return this.toString();
  }

  return this.replace(new RegExp('[' + search + ']', 'g'), replace);
};

let splitDate = (date) => {
  return _.split(date, '/');
};

let printRunLevel = (level) => {
  console.log(`*** ${String(level).toLocaleUpperCase()} ***`);
};

let handleUserValidate = (user, res) => {
  if (!user) {
    return res.status(404).json({
      error: 'User not found',
    });
  }
};

let handleMessage = (res, message) => {
  res.status(200).json({
    message: message,
  });
};

let handleError = (res, err) => {
  res.status(400).json({
    error: `something went wrong ${err}`,
  });
};

module.exports = {
  printRunLevel,
  splitDate,
  handleUserValidate,
  handleMessage,
  handleError,
};
