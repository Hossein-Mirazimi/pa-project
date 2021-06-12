const validator = require('validator');

const { mongoose } = require('./../db/mongoose');

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
});

let User = mongoose.model('User', UserSchema);

module.exports = {
  User,
};
