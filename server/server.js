//---Config
process.env.NODE_CONFIG_DIR = __dirname + '/config';

const config = require('config');
const express = require('express');
const _ = require('lodash');

const { User } = require('./model/user');

console.log(`*** ${String(config.get('level')).toUpperCase()} ***`);

const app = express();

app.use(express.json());

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

app.listen(config.get('PORT'), () => {
  console.log(`Server is running on port ${config.get('PORT')}`);
});
