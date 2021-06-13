const validator = require('validator');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const config = require('config');

const { mongoose } = require('./../db/mongoose');
const tokenOptions = {
  type: String,
  required: true,
};
let UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    minLength: 3,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minLlngth: 6,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: '{Value} is not valid email',
    },
  },
  password: {
    type: String,
    minlength: 6,
    required: true,
  },
  tokens: [
    {
      _id: false,
      access: tokenOptions,
      token: tokenOptions,
    },
  ],
  payment: [
    {
      info: {
        type: String,
        required: true,
        trim: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      date: {
        type: String,
        required: true,
      },
    },
  ],
  receive: [
    {
      info: {
        type: String,
        required: true,
        trim: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      date: {
        type: String,
        required: true,
      },
    },
  ],
});

UserSchema.methods.toJSON = function () {
  let user = this;

  let userObject = user.toObject();

  return _.pick(userObject, ['fullName', 'email', '_id']);
};

UserSchema.methods.generateAuthToken = function () {
  let user = this;
  let access = 'auth';

  let token = jwt
    .sign(
      {
        _id: user._id.toHexString(),
        access,
      },
      config.get('JWT_SECRET')
    )
    .toString();

  user.tokens.push({
    access,
    token,
  });

  return user.save().then(() => {
    return token;
  });
};

UserSchema.pre('save', function (next) {
  let user = this;

  if (user.isModified('password')) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

UserSchema.statics.findByCredentials = function (email, password) {
  let User = this;

  return User.findOne({
    email,
  }).then((user) => {
    if (!user) {
      return Promise.reject();
    }

    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          resolve(user);
        } else {
          reject();
        }
      });
    });
  });
};

UserSchema.statics.findByToken = function (token) {
  let User = this;

  let decoded;

  try {
    decoded = jwt.verify(token, config.get('JWT_SECRET'));
  } catch (e) {
    return Promise.reject(e);
  }

  return User.findOne({
    _id: decoded._id,
    'tokens.token': token,
    'tokens.access': 'auth',
  });
};

let User = mongoose.model('User', UserSchema);

module.exports = {
  User,
};
