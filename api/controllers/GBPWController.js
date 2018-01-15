/**
 * GBPWController
 *
 * @description :: Server-side logic for managing GBPWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinGBPW = require('bitcoin');
var clientGBPW = new bitcoinGBPW.Client({
  host: sails.config.company.clientGBPWhost,
  port: sails.config.company.clientGBPWport,
  user: sails.config.company.clientGBPWuser,
  pass: sails.config.company.clientGBPWpass
});

module.exports = {
  getNewGBPWAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientGBPW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from GBPW server",
            statusCode: 400
          });

        console.log('GBPW address generated', address);

        if (!user.isGBPWAddress) {
          User.update({
            email: userMailId
          }, {
            isGBPWAddress: true
          }).exec(function afterwards(err, updated) {
            if (err) {
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            // return res.json({
            //   newaddress: address,
            //   statusCode: 200
            // });
          });
        }
        return res.json({
          newaddress: address,
          statusCode: 401
        });
      });
    });
  },
  getGBPWAddressByAccount: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId)
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientGBPW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from GBPW server",
            statusCode: 400
          });
        }
        console.log('GBPW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendGBPW: function(req, res, next) {
    console.log("Enter into sendGBPW");
    var userEmailAddress = req.body.userMailId;
    var userGBPWAmountToSend = parseFloat(req.body.amount);
    var userReceiverGBPWAddress = req.body.recieverGBPWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniGBPWAmountSentByUser = 0.001;
    miniGBPWAmountSentByUser = parseFloat(miniGBPWAmountSentByUser);
    if (!userEmailAddress || !userGBPWAmountToSend || !userReceiverGBPWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userGBPWAmountToSend < miniGBPWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniGBPWAmountSentByUser);
      return res.json({
        "message": "Sending amount GBPW is not less then " + miniGBPWAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              console.log("Spending password is valid!!!");
              var minimumNumberOfConfirmation = 1;
              //var netamountToSend = (parseFloat(userGBPWAmountToSend) - parseFloat(sails.config.company.txFeeGBPW));
              var transactionFeeOfGBPW = new BigNumber(sails.config.company.txFeeGBPW);
              var netamountToSend = new BigNumber(userGBPWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfGBPW);

              console.log("clientGBPW netamountToSend :: " + netamountToSend);
              clientGBPW.cmd('sendfrom', userEmailAddress, userReceiverGBPWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverGBPWAddress, userReceiverGBPWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromGBPWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "GBPW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid GBPW Address",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -6) {
                      return res.json({
                        "message": "Account has Insufficient funds",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code < 0) {
                      return res.json({
                        "message": "Problem in GBPW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in GBPW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientGBPW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromGBPWAccount:: " + err);
                        return res.json({
                          "message": "Error in GBPW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfGBPW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientGBPW.cmd('move', userEmailAddress, sails.config.common.companyGBPWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromGBPWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "GBPW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid GBPW Address",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -6) {
                              return res.json({
                                "message": "Account has Insufficient funds",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code < 0) {
                              return res.json({
                                "message": "Problem in GBPW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in GBPW Server",
                              statusCode: 400
                            });
                          }
                          console.log('moveCompanyDetails :', moveCompanyDetails);
                          return res.json({
                            txid: TransactionDetails,
                            message: "Sent Successfully",
                            statusCode: 200
                          });
                        });
                    });
                });
            }
          });
      }
    });
  },
  getTxsListGBPW: function(req, res, next) {
    console.log("Enter into getTxsListGBPW::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).exec(function(err, user) {
      if (err) {
        console.log("Error to find user !!!");
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        console.log("Invalid Email !!!");
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      clientGBPW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromGBPWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "GBPW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in GBPW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in GBPW Server",
              statusCode: 400
            });
          }
          console.log("Return transactionList List !! ");
          return res.json({
            "tx": transactionList,
            statusCode: 200
          });
        });
    });
  },
  getBalGBPW: function(req, res, next) {
    console.log("Enter into getBalGBPW::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      console.log("Valid User :: " + JSON.stringify(user));
      clientGBPW.cmd(
        'getbalance',
        userMailId,
        function(err, userGBPWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromGBPWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "GBPW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in GBPW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in GBPW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceGBPW: userGBPWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};