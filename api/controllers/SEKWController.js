/**
 * SEKWController
 *
 * @description :: Server-side logic for managing SEKWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinSEKW = require('bitcoin');
var clientSEKW = new bitcoinSEKW.Client({
  host: sails.config.company.clientSEKWhost,
  port: sails.config.company.clientSEKWport,
  user: sails.config.company.clientSEKWuser,
  pass: sails.config.company.clientSEKWpass
});

module.exports = {
  getNewSEKWAddress: function(req, res) {
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
      clientSEKW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from SEKW server",
            statusCode: 400
          });

        console.log('SEKW address generated', address);

        if (!user.isSEKWAddress) {
          User.update({
            email: userMailId
          }, {
            isSEKWAddress: true
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
  getSEKWAddressByAccount: function(req, res) {
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
      clientSEKW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from SEKW server",
            statusCode: 400
          });
        }
        console.log('SEKW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendSEKW: function(req, res, next) {
    console.log("Enter into sendSEKW");
    var userEmailAddress = req.body.userMailId;
    var userSEKWAmountToSend = parseFloat(req.body.amount);
    var userReceiverSEKWAddress = req.body.recieverSEKWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniSEKWAmountSentByUser = 0.001;
    miniSEKWAmountSentByUser = parseFloat(miniSEKWAmountSentByUser);
    if (!userEmailAddress || !userSEKWAmountToSend || !userReceiverSEKWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userSEKWAmountToSend < miniSEKWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniSEKWAmountSentByUser);
      return res.json({
        "message": "Sending amount SEKW is not less then " + miniSEKWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userSEKWAmountToSend) - parseFloat(sails.config.company.txFeeSEKW));
              var transactionFeeOfSEKW = new BigNumber(sails.config.company.txFeeSEKW);
              var netamountToSend = new BigNumber(userSEKWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfSEKW);

              console.log("clientSEKW netamountToSend :: " + netamountToSend);
              clientSEKW.cmd('sendfrom', userEmailAddress, userReceiverSEKWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverSEKWAddress, userReceiverSEKWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromSEKWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "SEKW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid SEKW Address",
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
                        "message": "Problem in SEKW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in SEKW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientSEKW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromSEKWAccount:: " + err);
                        return res.json({
                          "message": "Error in SEKW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfSEKW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientSEKW.cmd('move', userEmailAddress, sails.config.common.companySEKWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromSEKWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "SEKW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid SEKW Address",
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
                                "message": "Problem in SEKW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in SEKW Server",
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
  getTxsListSEKW: function(req, res, next) {
    console.log("Enter into getTxsListSEKW::: ");
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
      clientSEKW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromSEKWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "SEKW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in SEKW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in SEKW Server",
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
  getBalSEKW: function(req, res, next) {
    console.log("Enter into getBalSEKW::: ");
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
      clientSEKW.cmd(
        'getbalance',
        userMailId,
        function(err, userSEKWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromSEKWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "SEKW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in SEKW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in SEKW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceSEKW: userSEKWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};