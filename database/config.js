// database/config.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database/stickers.db',
  logging: false
});

module.exports = sequelize; // Exportação direta sem desestruturação