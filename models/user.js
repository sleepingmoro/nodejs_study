'use strict';
module.exports = (sequelize, DataTypes) => {
  var user = sequelize.define('user', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      },
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    salt:{
      type: DataTypes.STRING
    },
    balance:{
      type: DataTypes.INTEGER,
      allowNull: false,
      default: 500
    },
    recommendedUserEmail:{
      type: DataTypes.STRING,
      allowNull: true
    }
  });

  return user;
};