/**
 * JPYWController
 *
 * @description :: Server-side logic for managing JPYWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');

var bitcoinJPYW = require('bitcoin');
var clientJPYW = new bitcoinJPYW.Client({
  host: sails.config.company.clientJPYWhost,
  port: sails.config.company.clientJPYWport,
  user: sails.config.company.clientJPYWuser,
  pass: sails.config.company.clientJPYWpass
});

module.exports = {
  getNewJPYWAddress: function(req, res) {
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
      clientJPYW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from JPYW server",
            statusCode: 400
          });

        console.log('JPYW address generated', address);

        if (!user.isJPYWAddress) {
          User.update({
            email: userMailId
          }, {
            isJPYWAddress: true
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
  getJPYWAddressByAccount: function(req, res) {
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
      clientJPYW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from JPYW server",
            statusCode: 400
          });
        }
        console.log('JPYW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendJPYW: function(req, res, next) {
    console.log("Enter into sendJPYW");
    var userEmailAddress = req.body.userMailId;
    var userJPYWAmountToSend = parseFloat(req.body.amount);
    var userReceiverJPYWAddress = req.body.recieverJPYWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniJPYWAmountSentByUser = 0.001;
    miniJPYWAmountSentByUser = parseFloat(miniJPYWAmountSentByUser);
    if (!userEmailAddress || !userJPYWAmountToSend || !userReceiverJPYWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userJPYWAmountToSend < miniJPYWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniJPYWAmountSentByUser);
      return res.json({
        "message": "Sending amount JPYW is not less then " + miniJPYWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userJPYWAmountToSend) - parseFloat(sails.config.company.txFeeJPYW));
              var transactionFeeOfJPYW = new BigNumber(sails.config.company.txFeeJPYW);
              var netamountToSend = new BigNumber(userJPYWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfJPYW);

              console.log("clientJPYW netamountToSend :: " + netamountToSend);
              clientJPYW.cmd('sendfrom', userEmailAddress, userReceiverJPYWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverJPYWAddress, userReceiverJPYWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromJPYWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "JPYW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid JPYW Address",
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
                        "message": "Problem in JPYW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in JPYW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientJPYW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromJPYWAccount:: " + err);
                        return res.json({
                          "message": "Error in JPYW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfJPYW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientJPYW.cmd('move', userEmailAddress, sails.config.common.companyJPYWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromJPYWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "JPYW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid JPYW Address",
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
                                "message": "Problem in JPYW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in JPYW Server",
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
  getTxsListJPYW: function(req, res, next) {
    console.log("Enter into getTxsListJPYW::: ");
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
      clientJPYW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromJPYWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "JPYW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in JPYW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in JPYW Server",
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
  getBalJPYW: function(req, res, next) {
    console.log("Enter into getBalJPYW::: ");
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
      clientJPYW.cmd(
        'getbalance',
        userMailId,
        function(err, userJPYWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromJPYWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "JPYW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in JPYW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in JPYW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceJPYW: userJPYWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};