/**
 * PLNWController
 *
 * @description :: Server-side logic for managing PLNWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinPLNW = require('bitcoin');
var clientPLNW = new bitcoinPLNW.Client({
  host: sails.config.company.clientPLNWhost,
  port: sails.config.company.clientPLNWport,
  user: sails.config.company.clientPLNWuser,
  pass: sails.config.company.clientPLNWpass
});

module.exports = {
  getNewPLNWAddress: function(req, res) {
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
      clientPLNW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from PLNW server",
            statusCode: 400
          });

        console.log('PLNW address generated', address);

        if (!user.isPLNWAddress) {
          User.update({
            email: userMailId
          }, {
            isPLNWAddress: true
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
  getPLNWAddressByAccount: function(req, res) {
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
      clientPLNW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from PLNW server",
            statusCode: 400
          });
        }
        console.log('PLNW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendPLNW: function(req, res, next) {
    console.log("Enter into sendPLNW");
    var userEmailAddress = req.body.userMailId;
    var userPLNWAmountToSend = parseFloat(req.body.amount);
    var userReceiverPLNWAddress = req.body.recieverPLNWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniPLNWAmountSentByUser = 0.001;
    miniPLNWAmountSentByUser = parseFloat(miniPLNWAmountSentByUser);
    if (!userEmailAddress || !userPLNWAmountToSend || !userReceiverPLNWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userPLNWAmountToSend < miniPLNWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniPLNWAmountSentByUser);
      return res.json({
        "message": "Sending amount PLNW is not less then " + miniPLNWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userPLNWAmountToSend) - parseFloat(sails.config.company.txFeePLNW));
              var transactionFeeOfPLNW = new BigNumber(sails.config.company.txFeePLNW);
              var netamountToSend = new BigNumber(userPLNWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfPLNW);

              console.log("clientPLNW netamountToSend :: " + netamountToSend);
              clientPLNW.cmd('sendfrom', userEmailAddress, userReceiverPLNWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverPLNWAddress, userReceiverPLNWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromPLNWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "PLNW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid PLNW Address",
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
                        "message": "Problem in PLNW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in PLNW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientPLNW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromPLNWAccount:: " + err);
                        return res.json({
                          "message": "Error in PLNW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfPLNW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientPLNW.cmd('move', userEmailAddress, sails.config.common.companyPLNWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromPLNWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "PLNW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid PLNW Address",
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
                                "message": "Problem in PLNW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in PLNW Server",
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
  getTxsListPLNW: function(req, res, next) {
    console.log("Enter into getTxsListPLNW::: ");
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
      clientPLNW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromPLNWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "PLNW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in PLNW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in PLNW Server",
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
  getBalPLNW: function(req, res, next) {
    console.log("Enter into getBalPLNW::: ");
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
      clientPLNW.cmd(
        'getbalance',
        userMailId,
        function(err, userPLNWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromPLNWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "PLNW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in PLNW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in PLNW Server",
              statusCode: 400
            });
          }
          return res.json({
            balancePLNW: userPLNWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};