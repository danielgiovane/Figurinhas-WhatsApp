const { DataTypes } = require('sequelize');
const sequelize = require('../config');

const Collection = sequelize.define('Collection', {
  name: {
    type: DataTypes.STRING, // Campo deve existir
    allowNull: false,
    unique: true
  }
});

module.exports = Collection;