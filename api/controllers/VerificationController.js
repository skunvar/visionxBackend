/**
 * VerificationController
 *
 * @description :: Server-side logic for managing verifications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

//External Dependencies.........taxProofImageName
var filesholderpath = sails.config.common.imgegeContainer;
var statusCodeOne = 1;
module.exports = {
  uploadTaxProofImageImage: function(req, res) {
    console.log("Enter into uploadTaxProofImageImage :: " + filesholderpath);
    var userId = req.param('userId');
    var taxProofImageName = req.file('taxProofImageName');

    if (!userId || !taxProofImageName) {
      console.log("Invalid Paranter ");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
        id: userId
      })
      .exec(function(err, userInfoInDB) {
        if (err) {
          console.log("Error to find user");
          return res.json({
            "message": "Error to find user",
            statusCode: 400
          });
        }
        if (!userInfoInDB) {
          console.log("Invalid userId!");
          return res.json({
            "message": "Invalid userId!",
            statusCode: 400
          });
        } else {
          console.log("userAll Details :: " + JSON.stringify(userInfoInDB));
          console.log("taxProofImageName ::: " + taxProofImageName);
          var uploadFileFolderPath = filesholderpath + userInfoInDB.id + "/";
          taxProofImageName.upload({
            dirname: uploadFileFolderPath
          }, function onUploadComplete(err, uploadedfiles) {
            if (err) {
              return res.json({
                'message': 'Error to upload file',
                statusCode: 400
              });
            }
            if (uploadedfiles.length == 0) {
              return res.json({
                'message': 'Please upload taxProofImageName',
                statusCode: 400
              });
            } else {
              var fileUploadedDetails = uploadedfiles[0];
              console.log("fileUploadedDetails :: " + JSON.stringify(fileUploadedDetails.fd));
              var fileNameSaveInDB = fileUploadedDetails.fd;
              var fileTypeSaveInDB = fileUploadedDetails.type;
              fileNameSaveInDB = fileNameSaveInDB.replace(uploadFileFolderPath, "");
              console.log("fileNameSaveInDB ::: " + fileNameSaveInDB);
              User.update({
                  id: userId
                }, {
                  taxProofImageName: fileNameSaveInDB
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    return res.json({
                      "message": "Error to update passoword!",
                      statusCode: 401
                    });
                  }
                  console.log("Your TaxProof uploaded successfully!");
                  return res.json({
                    "message": "Your TaxProof uploaded successfully",
                    statusCode: 200
                  });
                });
            }
          });
        }
      });
  },
  uploadAddressProofImage: function(req, res) {
    console.log("Enter into uploadAddressProofImage :: " + filesholderpath);
    var userId = req.param('userId');
    var addressProofImage = req.file('addressProofImage');

    if (!userId || !addressProofImage) {
      console.log("Invalid Paranter ");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
        id: userId
      })
      .exec(function(err, userInfoInDB) {
        if (err) {
          console.log("Error to find user");
          return res.json({
            "message": "Error to find user",
            statusCode: 400
          });
        }
        if (!userInfoInDB) {
          console.log("Invalid userId!");
          return res.json({
            "message": "Invalid userId!",
            statusCode: 400
          });
        } else {
          console.log("userAll Details :: " + JSON.stringify(userInfoInDB));
          console.log("addressProofImage ::: " + addressProofImage);
          var uploadFileFolderPath = filesholderpath + userInfoInDB.id + "/";
          addressProofImage.upload({
            dirname: uploadFileFolderPath
          }, function onUploadComplete(err, uploadedfiles) {
            if (err) {
              return res.json({
                'message': 'Error to upload file',
                statusCode: 400
              });
            }
            if (uploadedfiles.length == 0) {
              return res.json({
                'message': 'Please upload addressProof',
                statusCode: 400
              });
            } else {
              var fileUploadedDetails = uploadedfiles[0];
              console.log("fileUploadedDetails :: " + JSON.stringify(fileUploadedDetails.fd));
              var fileNameSaveInDB = fileUploadedDetails.fd;
              var fileTypeSaveInDB = fileUploadedDetails.type;
              fileNameSaveInDB = fileNameSaveInDB.replace(uploadFileFolderPath, "");
              console.log("fileNameSaveInDB ::: " + fileNameSaveInDB);
              User.update({
                  id: userId
                }, {
                  addressProofImageName: fileNameSaveInDB
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    return res.json({
                      "message": "Error to update passoword!",
                      statusCode: 401
                    });
                  }
                  console.log("Update passoword successfully!");
                  return res.json({
                    "message": "Your addressProof uploaded successfully",
                    statusCode: 200
                  });
                });
            }
          });
        }
      });

  },
  addVerificationDetails: function(req, res) {
    console.log("Enter into addVerificationDetails :: " + JSON.stringify(req.body));
    var userId = req.body.userId;
    var firstName = req.body.firstName;
    var middleName = req.body.middleName;
    var lastName = req.body.lastName;
    var DOB = req.body.DOB;
    var addLine1 = req.body.addLine1;
    var addLine2 = req.body.addLine2;
    var city = req.body.city;
    var state = req.body.state;
    var country = req.body.country;
    var pincode = req.body.pincode;
    var mobileNumber = req.body.mobileNumber;
    var bankAccountHolderName = req.body.bankAccountHolderName;
    var bankAccountNumber = req.body.bankAccountNumber;
    var bankName = req.body.bankName;
    var IFSCCode = req.body.IFSCCode;
    var taxProofNumber = req.body.taxProofNumber;
    var addressProofType = req.body.addressProofType;
    var addressProofNumber = req.body.addressProofNumber;


    // if (!userId ||
    //   !firstName ||
    //   !middleName ||
    //   !lastName ||
    //   !addLine1 ||
    //   !addLine2 ||
    //   !city ||
    //   !state ||
    //   !country ||
    //   !pincode ||
    //   !mobileNumber ||
    //   !bankAccountHolderName ||
    //   !bankAccountNumber ||
    //   !bankName ||
    //   !IFSCCode ||
    //   !taxProofNumber ||
    //   !addressProofType ||
    //   !addressProofNumber) {
    //   console.log("User Entered invalid parameter ");
    //   return res.json({
    //     "message": "Can't be empty!!!",
    //     statusCode: 400
    //   });
    // }
    User.findOne({
      id: userId
    }).exec(function(err, user) {
      if (err) {
        return res.serverError(err);
      }
      if (!user) {
        return res.json({
          "message": "User not found!!!",
          statusCode: 400
        });
      }
      var saveVerificationData = {
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        addLine1: addLine1,
        addLine2: addLine2,
        city: city,
        state: state,
        DOB : DOB,
        verificationDate : new Date(),
        country: country,
        pincode: pincode,
        mobileNumber: mobileNumber,
        bankAccountHolderName: bankAccountHolderName,
        bankAccountNumber: bankAccountNumber,
        bankName: bankName,
        IFSCCode: IFSCCode,
        taxProofNumber: taxProofNumber,
        addressProofType: addressProofType,
        addressProofNumber: addressProofNumber,
        verificationowner: userId,
      };
      Verification.create(saveVerificationData).exec(function(err, finn) {
        if (err) {
          return res.json({
            "message": "Error Verification Details",
            statusCode: 400
          });
        }
        User.update({
            id: userId
          }, {
            verificationStatus: statusCodeOne,
            isKYC: true
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update passoword!",
                statusCode: 401
              });
            }
            console.log("Update verificationStatus successfully!");
            return res.json({
              "message": 'Your application successfully submitted for review!!!',
              statusCode: 200
            });
          });
      });
    });
  },
  getVerificationDetails: function(req, res) {
    console.log("Enter into addVerificationDetails :: " + JSON.stringify(req.body));
    var userId = req.body.userId;
    if (!userId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
        id: userId
      }).populateAll()
      .exec(function(err, user) {
        if (err) {
          return res.serverError(err);
        }
        if (!user) {
          return res.json({
            "message": "User not found!!!",
            statusCode: 400
          });
        }
        return res.json({
          user: user,
          statusCode: 200
        });

      });
  },
};
