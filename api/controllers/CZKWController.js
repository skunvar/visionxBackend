/**
 * CZKWController
 *
 * @description :: Server-side logic for managing CZKWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinCZKW = require('bitcoin');
var clientCZKW = new bitcoinCZKW.Client({
  host: sails.config.company.clientCZKWhost,
  port: sails.config.company.clientCZKWport,
  user: sails.config.company.clientCZKWuser,
  pass: sails.config.company.clientCZKWpass
});

module.exports = {
  getNewCZKWAddress: function(req, res) {
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
      clientCZKW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from CZKW server",
            statusCode: 400
          });

        console.log('CZKW address generated', address);

        if (!user.isCZKWAddress) {
          User.update({
            email: userMailId
          }, {
            isCZKWAddress: true
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
  getCZKWAddressByAccount: function(req, res) {
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
      clientCZKW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from CZKW server",
            statusCode: 400
          });
        }
        console.log('CZKW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendCZKW: function(req, res, next) {
    console.log("Enter into sendCZKW");
    var userEmailAddress = req.body.userMailId;
    var userCZKWAmountToSend = parseFloat(req.body.amount);
    var userReceiverCZKWAddress = req.body.recieverCZKWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniCZKWAmountSentByUser = 0.001;
    miniCZKWAmountSentByUser = parseFloat(miniCZKWAmountSentByUser);
    if (!userEmailAddress || !userCZKWAmountToSend || !userReceiverCZKWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userCZKWAmountToSend < miniCZKWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniCZKWAmountSentByUser);
      return res.json({
        "message": "Sending amount CZKW is not less then " + miniCZKWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userCZKWAmountToSend) - parseFloat(sails.config.company.txFeeCZKW));
              var transactionFeeOfCZKW = new BigNumber(sails.config.company.txFeeCZKW);
              var netamountToSend = new BigNumber(userCZKWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfCZKW);

              console.log("clientCZKW netamountToSend :: " + netamountToSend);
              clientCZKW.cmd('sendfrom', userEmailAddress, userReceiverCZKWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverCZKWAddress, userReceiverCZKWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromCZKWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "CZKW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid CZKW Address",
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
                        "message": "Problem in CZKW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in CZKW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientCZKW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromCZKWAccount:: " + err);
                        return res.json({
                          "message": "Error in CZKW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfCZKW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientCZKW.cmd('move', userEmailAddress, sails.config.common.companyCZKWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromCZKWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "CZKW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid CZKW Address",
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
                                "message": "Problem in CZKW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in CZKW Server",
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
  getTxsListCZKW: function(req, res, next) {
    console.log("Enter into getTxsListCZKW::: ");
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
      clientCZKW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromCZKWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "CZKW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in CZKW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in CZKW Server",
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
  getBalCZKW: function(req, res, next) {
    console.log("Enter into getBalCZKW::: ");
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
      clientCZKW.cmd(
        'getbalance',
        userMailId,
        function(err, userCZKWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromCZKWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "CZKW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in CZKW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in CZKW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceCZKW: userCZKWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};