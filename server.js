const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configurações
const PORT = 3000;
const STICKER_SIZE = 512;
const TMP_DIR = path.join(__dirname, 'tmp');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Banco de dados em memória
let stickers = [];
let collections = new Set(["Família", "Amigos", "Programação"]);

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

    const newSticker = {
      id: Date.now().toString(),
      name,
      filename: outputFilename,
      collection,
      keywords: keywords.split(',').map(k => k.trim()),
      created: new Date()
    };

    stickers.push(newSticker);
    if (collection) collections.add(collection);

    res.status(201).json(newSticker);

  } catch (error) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

app.get('/collections', (req, res) => {
  res.json(Array.from(collections));
});

app.get('/stickers', (req, res) => {
  const { collection, search } = req.query;
  let results = [...stickers].sort((a, b) => new Date(b.created) - new Date(a.created));

  if (collection) {
    results = results.filter(s => s.collection === collection);
  }

  if (search) {
    const query = search.toLowerCase();
    results = results.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.keywords.some(k => k.toLowerCase().includes(query))
    );
  }

  res.json(results);
});

app.get('/share/:id', (req, res) => {
    const sticker = stickers.find(s => s.id === req.params.id);
    
    if (!sticker) {
        return res.status(404).json({ error: 'Figurinha não encontrada' });
    }

    const stickerUrl = `${req.protocol}://${req.get('host')}/uploads/${sticker.filename}`;
    const whatsappUrl = `whatsapp://send?sticker=${encodeURIComponent(stickerUrl)}`;
    
    res.json({ url: whatsappUrl });
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