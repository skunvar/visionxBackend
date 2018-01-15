/**
 * RUBWController
 *
 * @description :: Server-side logic for managing RUBWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinRUBW = require('bitcoin');
var clientRUBW = new bitcoinRUBW.Client({
  host: sails.config.company.clientRUBWhost,
  port: sails.config.company.clientRUBWport,
  user: sails.config.company.clientRUBWuser,
  pass: sails.config.company.clientRUBWpass
});

module.exports = {
  getNewRUBWAddress: function(req, res) {
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
      clientRUBW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from RUBW server",
            statusCode: 400
          });

        console.log('RUBW address generated', address);

        if (!user.isRUBWAddress) {
          User.update({
            email: userMailId
          }, {
            isRUBWAddress: true
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
  getRUBWAddressByAccount: function(req, res) {
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
      clientRUBW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from RUBW server",
            statusCode: 400
          });
        }
        console.log('RUBW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendRUBW: function(req, res, next) {
    console.log("Enter into sendRUBW");
    var userEmailAddress = req.body.userMailId;
    var userRUBWAmountToSend = parseFloat(req.body.amount);
    var userReceiverRUBWAddress = req.body.recieverRUBWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniRUBWAmountSentByUser = 0.001;
    miniRUBWAmountSentByUser = parseFloat(miniRUBWAmountSentByUser);
    if (!userEmailAddress || !userRUBWAmountToSend || !userReceiverRUBWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userRUBWAmountToSend < miniRUBWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniRUBWAmountSentByUser);
      return res.json({
        "message": "Sending amount RUBW is not less then " + miniRUBWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userRUBWAmountToSend) - parseFloat(sails.config.company.txFeeRUBW));
              var transactionFeeOfRUBW = new BigNumber(sails.config.company.txFeeRUBW);
              var netamountToSend = new BigNumber(userRUBWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfRUBW);

              console.log("clientRUBW netamountToSend :: " + netamountToSend);
              clientRUBW.cmd('sendfrom', userEmailAddress, userReceiverRUBWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverRUBWAddress, userReceiverRUBWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromRUBWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "RUBW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid RUBW Address",
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
                        "message": "Problem in RUBW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in RUBW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientRUBW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromRUBWAccount:: " + err);
                        return res.json({
                          "message": "Error in RUBW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfRUBW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientRUBW.cmd('move', userEmailAddress, sails.config.common.companyRUBWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromRUBWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "RUBW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid RUBW Address",
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
                                "message": "Problem in RUBW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in RUBW Server",
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
  getTxsListRUBW: function(req, res, next) {
    console.log("Enter into getTxsListRUBW::: ");
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
      clientRUBW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromRUBWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "RUBW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in RUBW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in RUBW Server",
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
  getBalRUBW: function(req, res, next) {
    console.log("Enter into getBalRUBW::: ");
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
      clientRUBW.cmd(
        'getbalance',
        userMailId,
        function(err, userRUBWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromRUBWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "RUBW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in RUBW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in RUBW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceRUBW: userRUBWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};