/**
 * MXNWController
 *
 * @description :: Server-side logic for managing MXNWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinMXNW = require('bitcoin');
var clientMXNW = new bitcoinMXNW.Client({
  host: sails.config.company.clientMXNWhost,
  port: sails.config.company.clientMXNWport,
  user: sails.config.company.clientMXNWuser,
  pass: sails.config.company.clientMXNWpass
});

module.exports = {
  getNewMXNWAddress: function(req, res) {
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
      clientMXNW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from MXNW server",
            statusCode: 400
          });

        console.log('MXNW address generated', address);

        if (!user.isMXNWAddress) {
          User.update({
            email: userMailId
          }, {
            isMXNWAddress: true
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
  getMXNWAddressByAccount: function(req, res) {
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
      clientMXNW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from MXNW server",
            statusCode: 400
          });
        }
        console.log('MXNW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendMXNW: function(req, res, next) {
    console.log("Enter into sendMXNW");
    var userEmailAddress = req.body.userMailId;
    var userMXNWAmountToSend = parseFloat(req.body.amount);
    var userReceiverMXNWAddress = req.body.recieverMXNWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniMXNWAmountSentByUser = 0.001;
    miniMXNWAmountSentByUser = parseFloat(miniMXNWAmountSentByUser);
    if (!userEmailAddress || !userMXNWAmountToSend || !userReceiverMXNWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userMXNWAmountToSend < miniMXNWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniMXNWAmountSentByUser);
      return res.json({
        "message": "Sending amount MXNW is not less then " + miniMXNWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userMXNWAmountToSend) - parseFloat(sails.config.company.txFeeMXNW));
              var transactionFeeOfMXNW = new BigNumber(sails.config.company.txFeeMXNW);
              var netamountToSend = new BigNumber(userMXNWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfMXNW);

              console.log("clientMXNW netamountToSend :: " + netamountToSend);
              clientMXNW.cmd('sendfrom', userEmailAddress, userReceiverMXNWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverMXNWAddress, userReceiverMXNWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromMXNWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "MXNW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid MXNW Address",
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
                        "message": "Problem in MXNW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in MXNW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientMXNW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromMXNWAccount:: " + err);
                        return res.json({
                          "message": "Error in MXNW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfMXNW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientMXNW.cmd('move', userEmailAddress, sails.config.common.companyMXNWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromMXNWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "MXNW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid MXNW Address",
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
                                "message": "Problem in MXNW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in MXNW Server",
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
  getTxsListMXNW: function(req, res, next) {
    console.log("Enter into getTxsListMXNW::: ");
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
      clientMXNW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromMXNWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "MXNW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in MXNW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in MXNW Server",
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
  getBalMXNW: function(req, res, next) {
    console.log("Enter into getBalMXNW::: ");
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
      clientMXNW.cmd(
        'getbalance',
        userMailId,
        function(err, userMXNWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromMXNWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "MXNW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in MXNW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in MXNW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceMXNW: userMXNWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};