/**
 * INRWController
 *
 * @description :: Server-side logic for managing INRWS
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');

var bitcoinINRW = require('bitcoin');
var clientINRW = new bitcoinINRW.Client({
  host: sails.config.company.clientINRWhost,
  port: sails.config.company.clientINRWport,
  user: sails.config.company.clientINRWuser,
  pass: sails.config.company.clientINRWpass
});

module.exports = {

  getNewINRWAddress: function(req, res) {
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
      clientINRW.cmd('getnewaddress', userMailId, function(err, address) {
        if (err)
          return res.json({
            "message": "Failed to get new address from INRW server",
            statusCode: 400
          });

        console.log('INRW address generated', address);

        if (!user.isINRWAddress) {
          User.update({
            email: userMailId
          }, {
            isINRWAddress: true
          }).exec(function afterwards(err, updated) {
            console.log("Easdlkfjasldfjalskdfjalsdfjl...............");
            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            // return res.json({
            //   newaddress: "address",
            //   statusCode: 200
            // });
          });
        }
        return res.json({
          newaddress: address,
          statusCode: 200
        });
      });
    });
  },
  getINRWAddressByAccount: function(req, res) {
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
      clientINRW.cmd('getaddressesbyaccount', userMailId, function(err, listaddress) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from INRW server",
            statusCode: 400
          });
        }
        console.log('INRW address generated', listaddress);
        return res.json({
          listaddress: listaddress,
          statusCode: 200
        });
      });
    });
  },
  sendINRW: function(req, res, next) {
    console.log("Enter into sendINRW");
    var userEmailAddress = req.body.userMailId;
    var userINRWAmountToSend = parseFloat(req.body.amount);
    var userReceiverINRWAddress = req.body.recieverINRWCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniINRWAmountSentByUser = 0.001;
    miniINRWAmountSentByUser = parseFloat(miniINRWAmountSentByUser);
    if (!userEmailAddress || !userINRWAmountToSend || !userReceiverINRWAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (userINRWAmountToSend < miniINRWAmountSentByUser) {
      console.log("Sending amount is not less then " + miniINRWAmountSentByUser);
      return res.json({
        "message": "Sending amount INRW is not less then " + miniINRWAmountSentByUser,
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
              //var netamountToSend = (parseFloat(userINRWAmountToSend) - parseFloat(sails.config.company.txFeeINRW));
              var transactionFeeOfINRW = new BigNumber(sails.config.company.txFeeINRW);
              var netamountToSend = new BigNumber(userINRWAmountToSend);
              netamountToSend = netamountToSend.minus(transactionFeeOfINRW);

              console.log("clientINRW netamountToSend :: " + netamountToSend);
              clientINRW.cmd('sendfrom', userEmailAddress, userReceiverINRWAddress, parseFloat(netamountToSend),
                minimumNumberOfConfirmation, userReceiverINRWAddress, userReceiverINRWAddress,
                function(err, TransactionDetails, resHeaders) {
                  if (err) {
                    console.log("Error from sendFromINRWAccount:: " + err);
                    if (err.code && err.code == "ECONNREFUSED") {
                      return res.json({
                        "message": "INRW Server Refuse to connect App",
                        statusCode: 400
                      });
                    }
                    if (err.code && err.code == -5) {
                      return res.json({
                        "message": "Invalid INRW Address",
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
                        "message": "Problem in INRW server",
                        statusCode: 400
                      });
                    }
                    return res.json({
                      "message": "Error in INRW Server",
                      statusCode: 400
                    });
                  }
                  console.log('TransactionDetails :', TransactionDetails);

                  clientINRW.cmd('gettransaction', TransactionDetails,
                    function(err, txDetails, resHeaders) {
                      if (err) {
                        console.log("Error from sendFromINRWAccount:: " + err);
                        return res.json({
                          "message": "Error in INRW Server",
                          statusCode: 400
                        });
                      }
                      console.log('txDetails :' + txDetails);
                      var txFeeFromNode = Math.abs(txDetails.fee);
                      var amountToMoveInCompanyAccount = transactionFeeOfINRW.minus(txFeeFromNode);
                      console.log("Move in company Account :: " + amountToMoveInCompanyAccount);
                      clientINRW.cmd('move', userEmailAddress, sails.config.common.companyINRWAccount, amountToMoveInCompanyAccount,
                        function(err, moveCompanyDetails, resHeaders) {
                          if (err) {
                            console.log("Error from sendFromINRWAccount:: " + err);
                            if (err.code && err.code == "ECONNREFUSED") {
                              return res.json({
                                "message": "INRW Server Refuse to connect App",
                                statusCode: 400
                              });
                            }
                            if (err.code && err.code == -5) {
                              return res.json({
                                "message": "Invalid INRW Address",
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
                                "message": "Problem in INRW server",
                                statusCode: 400
                              });
                            }
                            return res.json({
                              "message": "Error in INRW Server",
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
  getTxsListINRW: function(req, res, next) {
    console.log("Enter into getTxsListINRW::: ");
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
      clientINRW.cmd(
        'listtransactions',
        userMailId,
        function(err, transactionList) {
          if (err) {
            console.log("Error from sendFromINRWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "INRW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in INRW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in INRW Server",
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
  getBalINRW: function(req, res, next) {
    console.log("Enter into getBalINRW::: ");
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
      clientINRW.cmd(
        'getbalance',
        userMailId,
        function(err, userINRWMainbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromINRWAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "INRW Server Refuse to connect App",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in INRW server",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in INRW Server",
              statusCode: 400
            });
          }
          return res.json({
            balanceINRW: userINRWMainbalanceFromServer,
            statusCode: 200
          });
        });
    });
  },
};