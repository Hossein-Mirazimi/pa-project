//---Config
process.env.NODE_CONFIG_DIR = __dirname + '/config';

const config = require('config');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const persianDate = require('persian-date');
const Joi = require('joi');

const { User } = require('./model/user');
const { authenticate } = require('./middleware/authenticate');
const {
  splitDate,
  printRunLevel,
  handleError,
  handleMessage,
  handleUserValidate,
} = require('./utils/utils');
const { logger } = require('./utils/winstonOptions');

printRunLevel(config.get('level'));

const app = express();

const requestLogger = fs.createWriteStream(
  path.join(__dirname, 'log/requests.log')
);

persianDate.toLocale('en');
const date = new persianDate().format('YYYY/M/DD');

app.use(express.json());
app.use(helmet());
app.use(
  morgan('combined', {
    stream: requestLogger,
  })
);

app.post('/api/users', async (req, res) => {
  // *** Async/await ***
  try {
    const body = _.pick(req.body, ['fullName', 'email', 'password']);
    let user = new User(body);

    await user.save();

    res.status(200).send(user);
  } catch (e) {
    res.status(400).json({
      Error: `something went wrong. ${e}`,
    });
  }

  // *** Promise ***
  // const body = _.pick(req.body, ['fullName', 'email', 'password']);

  // console.log(body);

  // let user = new User(body);

  // user.save().then(
  //   (user) => {
  //     res.status(200).send(user);
  //   },
  //   (err) => {
  //     res.status(400).json({
  //       Error: `something went wrong. ${err}`,
  //     });
  //   }
  // );
});

app.post('/api/login', async (req, res) => {
  // *** Async/await ***
  try {
    const body = _.pick(req.body, ['email', 'password']);

    let user = await User.findByCredentials(body.email, body.password);
    let token = await user.generateAuthToken();

    res.header('x-auth', token).status(200).send(token);
  } catch (e) {
    res.status(400).json({
      Error: `something went wrong. ${e}`,
    });
  }
  // *** Promise ***
  // const body = _.pick(req.body, ['email', 'password']);

  // User.findByCredentials(body.email, body.password).then((user) => {
  //   user.generateAuthToken().then(
  //     (token) => {
  //       res.header('x-auth', token).status(200).send(token);
  //     },
  //     (err) => {
  //       res.status(400).json({
  //         Error: `something went wrong. ${err}`,
  //       });
  //     }
  //   );
  // });
});

app.delete('/api/logout', authenticate, async (req, res) => {
  try {
    await req.user.removeToken(req.token);

    handleMessage(res, 'Logout successFull');
  } catch (e) {
    handleError(e);
  }
});

app.post('/api/payment', authenticate, async (req, res) => {
  try {
    const paymentsJoiSchema = Joi.object({
      info: Joi.string().min(3).required(),
      amount: Joi.number().min(1).required(),
    });

    let validateResult = paymentsJoiSchema.validate(req.body); //Joi.va(req.body, paymentsJoiSchema);

    console.log(validateResult);

    if (validateResult.error) {
      handleError(res, validateResult.error);
      return;
    }

    const body = _.pick(req.body, ['info', 'amount']);

    let user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
      },
      {
        $push: {
          payment: {
            info: body.info,
            amount: body.amount,
            date,
          },
        },
      }
    );

    handleUserValidate(user, res);

    handleMessage(res, 'Payment has been saved');
  } catch (e) {
    handleError(res, e);
  }
});

app.get('/api/payments', authenticate, async (req, res) => {
  try {
    let user = await User.findOne({
      _id: req.user._id,
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not Found',
      });
    }

    res.status(200).send(user.payment);
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.delete('/api/payment/:id', authenticate, async (req, res) => {
  let id = req.params.id;

  try {
    let user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'payment._id': id,
      },
      {
        $pull: {
          payment: {
            _id: id,
          },
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not Found',
      });
    }

    res.status(200).send(user.payment);
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.patch('/api/payment/:id', authenticate, async (req, res) => {
  let id = req.params.id;
  let body = _.pick(req.body, ['amount', 'info', 'date']);

  try {
    let user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'payment._id': id,
      },
      {
        $set: {
          'payment.$.info': body.info,
          'payment.$.amount': body.amount,
          'payment.$.date': body.date,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not Found',
      });
    }

    res.status(200).json({
      message: 'Payment updated',
    });
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.post('/api/receive', authenticate, async (req, res) => {
  let body = _.pick(req.body, ['info', 'amount']);
  console.log(date, body);
  try {
    let user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
      },
      {
        $push: {
          receive: {
            info: body.info,
            amount: body.amount,
            date,
          },
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }
    res.status(200).json({
      message: 'receive has been saved',
    });
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.get('/api/receives', authenticate, async (req, res) => {
  try {
    let user = await User.findOne({
      _id: req.user._id,
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.status(200).send(user.receive);
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.delete('/api/receive/:id', authenticate, async (req, res) => {
  let { id } = req.params;
  try {
    let user = await User.findOneAndUpdate(
      {
        _id: req.user.id,
        'receive._id': id,
      },
      {
        $pull: {
          receive: {
            _id: id,
          },
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.status(200).send(user.receive);
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.patch('/api/receive/:id', authenticate, async (req, res) => {
  let { id } = req.params;
  try {
    let body = _.pick(req.body, ['info', 'amount', 'date']);

    let user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        'receive._id': id,
      },
      {
        $set: {
          'receive.$.info': body.info,
          'receive.$.amount': body.amount,
          'receive.$.date': body.date,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not Found',
      });
    }

    res.status(200).json({
      message: 'Receive updated',
    });
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.get('/api/paymentSum', authenticate, async (req, res) => {
  let amount = [];
  let theDate;

  try {
    let user = await User.findOne({
      _id: req.user._id,
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not Found',
      });
    }

    user.payment.forEach((el) => {
      let splitArr = splitDate(el.date);
      theDate = new persianDate([
        Number(splitArr[0]),
        Number(splitArr[1]),
        Number(splitArr[2]),
      ]);

      let toDayDate = new persianDate();

      if (theDate.isSameMonth(toDayDate)) {
        amount.push(el.amount);
      }
    });

    res.status(200).json({
      sum: `${_.sum(amount)}`,
    });
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.get('/api/payment/:date', authenticate, async (req, res) => {
  let param = req.params.date;
  let date = param.replaceAll('-', '/');

  try {
    let user = await User.findOne({
      _id: req.user._id,
    });

    let payments = [];

    user.payment.forEach((el) => {
      if (el.date === date) {
        payments.push(el);
      }
    });

    res.status(200).send(payments);
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.get('/api/receiveSum', authenticate, async (req, res) => {
  let amount = [];
  let theDate;

  try {
    let user = await User.findOne({
      _id: req.user._id,
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not Found',
      });
    }

    user.receive.forEach((el) => {
      let splitArr = splitDate(el.date);
      theDate = new persianDate([
        Number(splitArr[0]),
        Number(splitArr[1]),
        Number(splitArr[2]),
      ]);

      let toDayDate = new persianDate();

      if (theDate.isSameMonth(toDayDate)) {
        amount.push(el.amount);
      }
    });

    res.status(200).json({
      sum: `${_.sum(amount)}`,
    });
  } catch (e) {
    return res.status(404).json({
      error: 'User not Found',
    });
  }
});

app.get('/api/receive/:date', authenticate, async (req, res) => {
  let param = req.params.date;
  let date = param.replaceAll('-', '/');

  try {
    let user = await User.findOne({ _id: req.user._id });

    let receives = [];

    if (!user) {
      return res.status(404).json({
        error: 'User not Found',
      });
    }

    user.receive.forEach((el) => {
      if (el.date === date) {
        receives.push(el);
      }
    });

    res.status(200).send(receives);
  } catch (e) {
    res.status(400).json({
      error: `something went wrong ${e}`,
    });
  }
});

app.get('/', (req, res) => res.send('Hello World to my server'))

app.listen(config.get('PORT'), () => {
  logger.info(`Server is running on port ${config.get('PORT')}`);
});
