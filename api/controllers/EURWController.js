/**
 * EURWController
 *
 * @description :: Server-side logic for managing EURWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinEURW = require('bitcoin');
var clientEURW = new bitcoinEURW.Client({
  host: sails.config.company.clientEURWhost,
  port: sails.config.company.clientEURWport,
  user: sails.config.company.clientEURWuser,
  pass: sails.config.company.clientEURWpass
});

module.exports = {
  getNewEURWAddress: function(req, res) {
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
      clientEURW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from EURW server",
            statusCode: 400
          });

        console.log('EURW address generated', address);

        if (!user.isEURWAddress) {
          User.update({
            email: userMailId
          }, {
            isEURWAddress: true
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
  getEURWAddressByAccount: function(req, res) {
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
      clientEURW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from EURW server",
            statusCode: 400
          });
        }
        console.log('EURW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendEURW: function(req, res, next) {
    console.log("Enter into sendEURW");
    var userEmailAddress = req.body.userMailId;
    var userEURWAmountToSend = parseFloat(req.body.amount);
    var userReceiverEURWAddress = req.body.recieverEURWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniEURWAmountSentByUser = 0.001;
    miniEURWAmountSentByUser = parseFloat(miniEURWAmountSentByUser);
    if (!userEmailAddress || !userEURWAmountToSend || !userReceiverEURWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userEURWAmountToSend < miniEURWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniEURWAmountSentByUser);
      return res.json({
        "message": "Sending amount EURW is not less then " + miniEURWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userEURWAmountToSend) - parseFloat(sails.config.company.txFeeEURW));
              var transactionFeeOfEURW = new BigNumber(sails.config.company.txFeeEURW);
              var netamountToSend = new BigNumber(userEURWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfEURW);

              console.log("clientEURW netamountToSend :: " + netamountToSend);
              clientEURW.cmd('sendfrom', userEmailAddress, userReceiverEURWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverEURWAddress, userReceiverEURWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromEURWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "EURW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid EURW Address",
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
                        "message": "Problem in EURW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in EURW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientEURW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromEURWAccount:: " + err);
                        return res.json({
                          "message": "Error in EURW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfEURW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientEURW.cmd('move', userEmailAddress, sails.config.common.companyEURWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromEURWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "EURW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid EURW Address",
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
                                "message": "Problem in EURW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in EURW Server",
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
  getTxsListEURW: function(req, res, next) {
    console.log("Enter into getTxsListEURW::: ");
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
      clientEURW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromEURWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "EURW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in EURW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in EURW Server",
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
  getBalEURW: function(req, res, next) {
    console.log("Enter into getBalEURW::: ");
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
      clientEURW.cmd(
        'getbalance',
        userMailId,
        function(err, userEURWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromEURWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "EURW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in EURW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in EURW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceEURW: userEURWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};