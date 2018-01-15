/**
 * User.js
 *0,1,2,3,4 Not submitted, Submitted but Pending, Approved, reject
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
var bcrypt = require('bcrypt');
module.exports = {
  schema: true,
  autoCreatedAt: false,
  autoUpdatedAt: false,
  attributes: {
    email: {
      type: 'email',
      email: true,
      required: true,
      unique: true
    },
    encryptedPassword: {
      type: 'string'
    },
    encryptedSpendingpassword: {
      type: 'string'
    },
    encryptedForgotPasswordOTP: {
      type: 'string'
    },
    encryptedForgotSpendingPasswordOTP: {
      type: 'string'
    },
    encryptedEmailVerificationOTP: {
      type: 'string'
    },
    taxProofImageName: {
      type: 'string'
    },
    addressProofImageName: {
      type: 'string'
    },
    isKYC: {
      type: 'boolean',
      defaultsTo: false
    },
    verificationStatus: {
      type: 'integer',
      defaultsTo: 0
    },
    verifyEmail: {
      type: 'boolean',
      defaultsTo: false
    },
    isAdmin: {
      type: 'boolean',
      defaultsTo: false
    },
    isINRWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isUSDWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isEURWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isGBPWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isBRLWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isPLNWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isCADWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isTRYWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isRUBWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isMXNWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isCZKWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isILSWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isNZDWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isJPYWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isSEKWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    isAUDWAddress: {
      type: 'boolean',
      defaultsTo: false
    },
    //INR
    verificationDetails: {
      collection: 'verification',
      via: 'verificationowner'
    },
    toJSON: function() {
      var obj = this.toObject();
      delete obj.encryptedPassword;
      delete obj.encryptedSpendingpassword;
      delete obj.encryptedEmailVerificationOTP;
      delete obj.encryptedForgotPasswordOTP;
      delete obj.encryptedForgotSpendingPasswordOTP;
      return obj;
    }
  },
  beforeCreate: function(values, next) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) return next(err);
      bcrypt.hash(values.password, salt, function(err, hash) {
        if (err) return next(err);
        values.encryptedPassword = hash;
        next();
      })
    })
  },
  comparePassword: function(password, user, cb = () => {}) {
    bcrypt.compare(password, user.encryptedPassword, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },
  compareSpendingpassword: function(spendingpassword, user, cb = () => {}) {
    bcrypt.compare(spendingpassword, user.encryptedSpendingpassword, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },
  compareForgotpasswordOTP: function(otp, user, cb) {
    bcrypt.compare(otp, user.encryptedForgotPasswordOTP, function(err, match) {
      if (err) {
        console.log(" cb(err).. findOne.authenticated called.........");
        cb(err);
      }
      if (match) {
        cb(null, true);
      } else {
        console.log("not match.....");
        cb(err);
      }
    })
  },
  compareEmailVerificationOTP: function(otp, user, cb) {
    bcrypt.compare(otp, user.encryptedEmailVerificationOTP, function(err, match) {
      if (err) {
        console.log(" cb(err).. findOne.authenticated called.........");
        cb(err);
      }
      if (match) {
        cb(null, true);
      } else {
        console.log("not match.....");
        cb(err);
      }
    })
  },
  compareEmailVerificationOTPForSpendingPassword: function(otp, user, cb) {
    bcrypt.compare(otp, user.encryptedForgotSpendingPasswordOTP, function(err, match) {
      if (err) {
        console.log(" cb(err).. findOne.authenticated called.........");
        cb(err);
      }
      if (match) {
        cb(null, true);
      } else {
        console.log("not match.....");
        cb(err);
      }
    })
  }
};