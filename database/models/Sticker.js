const { DataTypes } = require('sequelize');
const sequelize = require('../config');
const Collection = require('./Collection');

const Sticker = sequelize.define('Sticker', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  keywords: {
    type: DataTypes.JSON,
    defaultValue: []
  }
});

Sticker.belongsTo(Collection);
module.exports = Sticker;