/**
 * AUDWController
 *
 * @description :: Server-side logic for managing AUDWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var BigNumber = require('bignumber.js');

var bitcoinAUDW = require('bitcoin');
var clientAUDW = new bitcoinAUDW.Client({
  host: sails.config.company.clientAUDWhost,
  port: sails.config.company.clientAUDWport,
  user: sails.config.company.clientAUDWuser,
  pass: sails.config.company.clientAUDWpass
});

module.exports = {
  getNewAUDWAddress: function(req, res) {
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
      clientAUDW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from AUDW server",
            statusCode: 400
          });

        console.log('AUDW address generated', address);

        if (!user.isAUDWAddress) {
          User.update({
            email: userMailId
          }, {
            isAUDWAddress: true
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
  getAUDWAddressByAccount: function(req, res) {
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
      clientAUDW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from AUDW server",
            statusCode: 400
          });
        }
        console.log('AUDW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendAUDW: function(req, res, next) {
    console.log("Enter into sendAUDW");
    var userEmailAddress = req.body.userMailId;
    var userAUDWAmountToSend = parseFloat(req.body.amount);
    var userReceiverAUDWAddress = req.body.recieverAUDWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniAUDWAmountSentByUser = 0.001;
    miniAUDWAmountSentByUser = parseFloat(miniAUDWAmountSentByUser);
    if (!userEmailAddress || !userAUDWAmountToSend || !userReceiverAUDWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userAUDWAmountToSend < miniAUDWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniAUDWAmountSentByUser);
      return res.json({
        "message": "Sending amount AUDW is not less then " + miniAUDWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userAUDWAmountToSend) - parseFloat(sails.config.company.txFeeAUDW));
              var transactionFeeOfAUDW = new BigNumber(sails.config.company.txFeeAUDW);
              var netamountToSend = new BigNumber(userAUDWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfAUDW);

              console.log("clientAUDW netamountToSend :: " + netamountToSend);
              clientAUDW.cmd('sendfrom', userEmailAddress, userReceiverAUDWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverAUDWAddress, userReceiverAUDWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromAUDWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "AUDW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid AUDW Address",
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
                        "message": "Problem in AUDW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in AUDW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientAUDW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromAUDWAccount:: " + err);
                        return res.json({
                          "message": "Error in AUDW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfAUDW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientAUDW.cmd('move', userEmailAddress, sails.config.common.companyAUDWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromAUDWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "AUDW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid AUDW Address",
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
                                "message": "Problem in AUDW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in AUDW Server",
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
  getTxsListAUDW: function(req, res, next) {
    console.log("Enter into getTxsListAUDW::: ");
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
      clientAUDW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromAUDWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "AUDW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in AUDW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in AUDW Server",
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
  getBalAUDW: function(req, res, next) {
    console.log("Enter into getBalAUDW::: ");
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
      clientAUDW.cmd(
        'getbalance',
        userMailId,
        function(err, userAUDWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromAUDWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "AUDW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in AUDW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in AUDW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceAUDW: userAUDWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};