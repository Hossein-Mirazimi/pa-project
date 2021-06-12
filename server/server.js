//---Config
process.env.NODE_CONFIG_DIR = __dirname + '/config';

const config = require('config');

const { User } = require('./model/user');
console.log(`*** ${String(config.get('level')).toUpperCase()} ***`);

let newUser = new User({
  fullName: 'Hossein Mirazimi',
  email: 'use@toplearn.com',
  password: '123456',
});

newUser.save().then((user) => {
  console.log('User has been saved to database. ', user);
});
