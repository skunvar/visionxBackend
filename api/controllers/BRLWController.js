/**
 * BRLWController
 *
 * @description :: Server-side logic for managing BRLWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinBRLW = require('bitcoin');
var clientBRLW = new bitcoinBRLW.Client({
  host: sails.config.company.clientBRLWhost,
  port: sails.config.company.clientBRLWport,
  user: sails.config.company.clientBRLWuser,
  pass: sails.config.company.clientBRLWpass
});

module.exports = {
  getNewBRLWAddress: function(req, res) {
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
      clientBRLW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from BRLW server",
            statusCode: 400
          });

        console.log('BRLW address generated', address);

        if (!user.isBRLWAddress) {
          User.update({
            email: userMailId
          }, {
            isBRLWAddress: true
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
  getBRLWAddressByAccount: function(req, res) {
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
      clientBRLW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from BRLW server",
            statusCode: 400
          });
        }
        console.log('BRLW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendBRLW: function(req, res, next) {
    console.log("Enter into sendBRLW");
    var userEmailAddress = req.body.userMailId;
    var userBRLWAmountToSend = parseFloat(req.body.amount);
    var userReceiverBRLWAddress = req.body.recieverBRLWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniBRLWAmountSentByUser = 0.001;
    miniBRLWAmountSentByUser = parseFloat(miniBRLWAmountSentByUser);
    if (!userEmailAddress || !userBRLWAmountToSend || !userReceiverBRLWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userBRLWAmountToSend < miniBRLWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniBRLWAmountSentByUser);
      return res.json({
        "message": "Sending amount BRLW is not less then " + miniBRLWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userBRLWAmountToSend) - parseFloat(sails.config.company.txFeeBRLW));
              var transactionFeeOfBRLW = new BigNumber(sails.config.company.txFeeBRLW);
              var netamountToSend = new BigNumber(userBRLWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfBRLW);

              console.log("clientBRLW netamountToSend :: " + netamountToSend);
              clientBRLW.cmd('sendfrom', userEmailAddress, userReceiverBRLWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverBRLWAddress, userReceiverBRLWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromBRLWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "BRLW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid BRLW Address",
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
                        "message": "Problem in BRLW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in BRLW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientBRLW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromBRLWAccount:: " + err);
                        return res.json({
                          "message": "Error in BRLW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfBRLW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientBRLW.cmd('move', userEmailAddress, sails.config.common.companyBRLWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromBRLWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "BRLW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid BRLW Address",
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
                                "message": "Problem in BRLW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in BRLW Server",
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
  getTxsListBRLW: function(req, res, next) {
    console.log("Enter into getTxsListBRLW::: ");
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
      clientBRLW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromBRLWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BRLW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BRLW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BRLW Server",
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
  getBalBRLW: function(req, res, next) {
    console.log("Enter into getBalBRLW::: ");
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
      clientBRLW.cmd(
        'getbalance',
        userMailId,
        function(err, userBRLWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBRLWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BRLW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BRLW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BRLW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceBRLW: userBRLWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};