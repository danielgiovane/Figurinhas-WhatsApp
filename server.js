const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Sequelize } = require('sequelize');
const sequelize = require('./database/config');
const Sticker = require('./database/models/Sticker');
const Collection = require('./database/models/Collection');

const app = express();
app.use(cors());
app.use(express.json());

// Configurações
const PORT = 3000;
const STICKER_SIZE = 512;
const TMP_DIR = path.join(__dirname, 'tmp');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Configuração do Multer
const storage = multer.diskStorage({
  destination: TMP_DIR,
  filename: (req, file, cb) => {
    cb(null, `upload_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }
});

// Criar diretórios
[UPLOADS_DIR, TMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Adicione inicialização de coleções padrão
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });

    // Cria coleções padrão se não existirem
    await Collection.findOrCreate({ where: { name: 'Família' } });
    await Collection.findOrCreate({ where: { name: 'Amigos' } });
    await Collection.findOrCreate({ where: { name: 'Programação' } });

    console.log('✅ Banco de dados conectado');
  } catch (error) {
    console.error('❌ Erro no banco:', error);
  }
}
initializeDatabase();

// Rotas da API
app.post('/upload', upload.single('sticker'), async (req, res) => {
  try {
    const { name, collection, keywords } = req.body;

    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres' });
    }

    const outputFilename = `sticker_${Date.now()}.webp`;
    const outputPath = path.join(UPLOADS_DIR, outputFilename);

    await sharp(req.file.path)
      .resize(STICKER_SIZE, STICKER_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .webp({
        quality: 80,
        alphaQuality: 80
      })
      .toFile(outputPath);

    fs.unlinkSync(req.file.path);

    // Criar ou encontrar coleção
    const [collectionRecord] = await Collection.findOrCreate({
      where: {
        name: collection.trim() || 'Geral' // Garante criação mesmo com campo vazio
      }
    });

    // Criar sticker no banco
    const sticker = await Sticker.create({
      name,
      filename: outputFilename,
      keywords: keywords.split(',').map(k => k.trim()),
      CollectionId: collectionRecord.id
    });

    res.status(201).json({
      ...sticker.toJSON(),
      Collection: collectionRecord
    });

  } catch (error) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

app.get('/collections', async (req, res) => {
  try {
    const collections = await Collection.findAll({
      attributes: ['id', 'name'] // Garanta que o campo 'name' está sendo buscado
    });
    res.json(collections); // Envia array de objetos { id, name }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar coleções' });
  }
});

app.get('/stickers', async (req, res) => {
  try {
    const { collection, search } = req.query;
    const where = {};
    const include = [];

    if (collection) {
      include.push({
        model: Collection,
        where: { name: collection },
        attributes: ['name']
      });
    }

    if (search) {
      where.name = { [Sequelize.Op.like]: `%${search}%` };
    }

    const stickers = await Sticker.findAll({
      where,
      include: [{
        model: Collection,
        attributes: ['name']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(stickers.map(s => ({
      ...s.toJSON(),
      collection: s.Collection.name
    })));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar figurinhas' });
  }
});

app.get('/share/:id', async (req, res) => {
  try {
    const sticker = await Sticker.findByPk(req.params.id, {
      include: Collection
    });

    if (!sticker) {
      return res.status(404).json({ error: 'Figurinha não encontrada' });
    }

    const stickerUrl = `${req.protocol}://${req.get('host')}/uploads/${sticker.filename}`;
    const whatsappUrl = `whatsapp://send?sticker=${encodeURIComponent(stickerUrl)}`;

    res.json({ url: whatsappUrl });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao compartilhar' });
  }
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

app.use(express.static('public'));
app.use('/uploads', express.static(UPLOADS_DIR));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});