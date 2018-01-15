/**
 * NZDWController
 *
 * @description :: Server-side logic for managing NZDWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinNZDW = require('bitcoin');
var clientNZDW = new bitcoinNZDW.Client({
  host: sails.config.company.clientNZDWhost,
  port: sails.config.company.clientNZDWport,
  user: sails.config.company.clientNZDWuser,
  pass: sails.config.company.clientNZDWpass
});

module.exports = {
  getNewNZDWAddress: function(req, res) {
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
      clientNZDW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from NZDW server",
            statusCode: 400
          });

        console.log('NZDW address generated', address);

        if (!user.isNZDWAddress) {
          User.update({
            email: userMailId
          }, {
            isNZDWAddress: true
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
  getNZDWAddressByAccount: function(req, res) {
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
      clientNZDW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from NZDW server",
            statusCode: 400
          });
        }
        console.log('NZDW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendNZDW: function(req, res, next) {
    console.log("Enter into sendNZDW");
    var userEmailAddress = req.body.userMailId;
    var userNZDWAmountToSend = parseFloat(req.body.amount);
    var userReceiverNZDWAddress = req.body.recieverNZDWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniNZDWAmountSentByUser = 0.001;
    miniNZDWAmountSentByUser = parseFloat(miniNZDWAmountSentByUser);
    if (!userEmailAddress || !userNZDWAmountToSend || !userReceiverNZDWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userNZDWAmountToSend < miniNZDWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniNZDWAmountSentByUser);
      return res.json({
        "message": "Sending amount NZDW is not less then " + miniNZDWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userNZDWAmountToSend) - parseFloat(sails.config.company.txFeeNZDW));
              var transactionFeeOfNZDW = new BigNumber(sails.config.company.txFeeNZDW);
              var netamountToSend = new BigNumber(userNZDWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfNZDW);

              console.log("clientNZDW netamountToSend :: " + netamountToSend);
              clientNZDW.cmd('sendfrom', userEmailAddress, userReceiverNZDWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverNZDWAddress, userReceiverNZDWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromNZDWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "NZDW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid NZDW Address",
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
                        "message": "Problem in NZDW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in NZDW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientNZDW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromNZDWAccount:: " + err);
                        return res.json({
                          "message": "Error in NZDW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfNZDW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientNZDW.cmd('move', userEmailAddress, sails.config.common.companyNZDWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromNZDWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "NZDW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid NZDW Address",
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
                                "message": "Problem in NZDW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in NZDW Server",
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
  getTxsListNZDW: function(req, res, next) {
    console.log("Enter into getTxsListNZDW::: ");
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
      clientNZDW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromNZDWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "NZDW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in NZDW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in NZDW Server",
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
  getBalNZDW: function(req, res, next) {
    console.log("Enter into getBalNZDW::: ");
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
      clientNZDW.cmd(
        'getbalance',
        userMailId,
        function(err, userNZDWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromNZDWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "NZDW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in NZDW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in NZDW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceNZDW: userNZDWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};