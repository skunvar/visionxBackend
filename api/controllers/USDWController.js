/**
 * USDWController
 *
 * @description :: Server-side logic for managing USDWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinUSDW = require('bitcoin');
var clientUSDW = new bitcoinUSDW.Client({
  host: sails.config.company.clientUSDWhost,
  port: sails.config.company.clientUSDWport,
  user: sails.config.company.clientUSDWuser,
  pass: sails.config.company.clientUSDWpass
});

module.exports = {
  getNewUSDWAddress: function(req, res) {
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
      clientUSDW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from USDW server",
            statusCode: 400
          });

        console.log('USDW address generated', address);

        if (!user.isUSDWAddress) {
          User.update({
            email: userMailId
          }, {
            isUSDWAddress: true
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
  getUSDWAddressByAccount: function(req, res) {
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
      clientUSDW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from USDW server",
            statusCode: 400
          });
        }
        console.log('USDW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendUSDW: function(req, res, next) {
    console.log("Enter into sendUSDW");
    var userEmailAddress = req.body.userMailId;
    var userUSDWAmountToSend = parseFloat(req.body.amount);
    var userReceiverUSDWAddress = req.body.recieverUSDWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniUSDWAmountSentByUser = 0.001;
    miniUSDWAmountSentByUser = parseFloat(miniUSDWAmountSentByUser);
    if (!userEmailAddress || !userUSDWAmountToSend || !userReceiverUSDWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userUSDWAmountToSend < miniUSDWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniUSDWAmountSentByUser);
      return res.json({
        "message": "Sending amount USDW is not less then " + miniUSDWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userUSDWAmountToSend) - parseFloat(sails.config.company.txFeeUSDW));
              var transactionFeeOfUSDW = new BigNumber(sails.config.company.txFeeUSDW);
              var netamountToSend = new BigNumber(userUSDWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfUSDW);

              console.log("clientUSDW netamountToSend :: " + netamountToSend);
              clientUSDW.cmd('sendfrom', userEmailAddress, userReceiverUSDWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverUSDWAddress, userReceiverUSDWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromUSDWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "USDW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid USDW Address",
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
                        "message": "Problem in USDW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in USDW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientUSDW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromUSDWAccount:: " + err);
                        return res.json({
                          "message": "Error in USDW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfUSDW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientUSDW.cmd('move', userEmailAddress, sails.config.common.companyUSDWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromUSDWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "USDW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid USDW Address",
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
                                "message": "Problem in USDW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in USDW Server",
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
  getTxsListUSDW: function(req, res, next) {
    console.log("Enter into getTxsListUSDW::: ");
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
      clientUSDW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromUSDWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "USDW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in USDW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in USDW Server",
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
  getBalUSDW: function(req, res, next) {
    console.log("Enter into getBalUSDW::: ");
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
      clientUSDW.cmd(
        'getbalance',
        userMailId,
        function(err, userUSDWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromUSDWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "USDW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in USDW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in USDW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceUSDW: userUSDWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};