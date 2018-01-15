/**
 * TRYWController
 *
 * @description :: Server-side logic for managing TRYWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinTRYW = require('bitcoin');
var clientTRYW = new bitcoinTRYW.Client({
  host: sails.config.company.clientTRYWhost,
  port: sails.config.company.clientTRYWport,
  user: sails.config.company.clientTRYWuser,
  pass: sails.config.company.clientTRYWpass
});

module.exports = {
  getNewTRYWAddress: function(req, res) {
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
      clientTRYW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from TRYW server",
            statusCode: 400
          });

        console.log('TRYW address generated', address);

        if (!user.isTRYWAddress) {
          User.update({
            email: userMailId
          }, {
            isINRWAddress: true
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
  getTRYWAddressByAccount: function(req, res) {
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
      clientTRYW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from TRYW server",
            statusCode: 400
          });
        }
        console.log('TRYW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendTRYW: function(req, res, next) {
    console.log("Enter into sendTRYW");
    var userEmailAddress = req.body.userMailId;
    var userTRYWAmountToSend = parseFloat(req.body.amount);
    var userReceiverTRYWAddress = req.body.recieverTRYWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniTRYWAmountSentByUser = 0.001;
    miniTRYWAmountSentByUser = parseFloat(miniTRYWAmountSentByUser);
    if (!userEmailAddress || !userTRYWAmountToSend || !userReceiverTRYWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userTRYWAmountToSend < miniTRYWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniTRYWAmountSentByUser);
      return res.json({
        "message": "Sending amount TRYW is not less then " + miniTRYWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userTRYWAmountToSend) - parseFloat(sails.config.company.txFeeTRYW));
              var transactionFeeOfTRYW = new BigNumber(sails.config.company.txFeeTRYW);
              var netamountToSend = new BigNumber(userTRYWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfTRYW);

              console.log("clientTRYW netamountToSend :: " + netamountToSend);
              clientTRYW.cmd('sendfrom', userEmailAddress, userReceiverTRYWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverTRYWAddress, userReceiverTRYWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromTRYWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "TRYW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid TRYW Address",
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
                        "message": "Problem in TRYW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in TRYW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientTRYW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromTRYWAccount:: " + err);
                        return res.json({
                          "message": "Error in TRYW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfTRYW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientTRYW.cmd('move', userEmailAddress, sails.config.common.companyTRYWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromTRYWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "TRYW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid TRYW Address",
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
                                "message": "Problem in TRYW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in TRYW Server",
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
  getTxsListTRYW: function(req, res, next) {
    console.log("Enter into getTxsListTRYW::: ");
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
      clientTRYW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromTRYWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "TRYW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in TRYW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in TRYW Server",
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
  getBalTRYW: function(req, res, next) {
    console.log("Enter into getBalTRYW::: ");
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
      clientTRYW.cmd(
        'getbalance',
        userMailId,
        function(err, userTRYWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromTRYWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "TRYW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in TRYW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in TRYW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceTRYW: userTRYWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};