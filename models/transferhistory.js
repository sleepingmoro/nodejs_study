'use strict';
module.exports = (sequelize, DataTypes) => {
  const transferHistory = sequelize.define('transferHistory', {
    sentUserEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    receivedUserEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {});

  return transferHistory;
};