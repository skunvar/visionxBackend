/**
 * Verification.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  autoCreatedAt: false,
  autoUpdatedAt: false,
  attributes: {
    firstName: {
      type: 'string'
    },
    middleName: {
      type: 'string'
    },
    lastName: {
      type: 'string'
    },
    addLine1: {
      type: 'string'
    },
    addLine2: {
      type: 'string'
    },
    DOB : {
      type: 'string'
    },
    verificationDate : {
      type : "datetime"
    },
    city: {
      type: 'string'
    },
    state: {
      type: 'string'
    },
    country: {
      type: 'string'
    },
    pincode: {
      type: 'string'
    },
    mobileNumber: {
      type: 'string'
    },
    bankAccountHolderName: {
      type: 'string'
    },
    bankAccountNumber: {
      type: 'string'
    },
    bankName: {
      type: 'string'
    },
    IFSCCode: {
      type: 'string'
    },
    taxProofNumber: {
      type: 'string'
    },
    taxProofImage: {
      type: 'string'
    },
    addressProofType: {
      type: 'string'
    },
    addressProofNumber: {
      type: 'string'
    },
    addressProofImage: {
      type: 'string'
    },
    isAgree: {
      type: "boolean",
      defaultsTo: false
    },
    refNumber: {
      type: 'string'
    },
    refAmount: {
      type: 'float',
      defaultsTo: 0
    },
    modeOfPayment: {
      type: 'string'
    },
    verificationowner: {
      model: 'user'
    }
  }
};