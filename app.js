const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');

const app = express();
const PORT = 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files
app.use('/banners', express.static(path.join(__dirname, 'public')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Helper function to save metadata
function saveMetadata(filename, originalname) {
  const metadataFile = 'public/uploads/metadata.json';
  const metadata = {
    filename: filename,
    name: originalname,
    date: new Date().toISOString()
  };

  fs.readFile(metadataFile, 'utf8', (err, data) => {
    let json = [];
    if (!err) {
      json = JSON.parse(data);
    }
    json.push(metadata);

    fs.writeFile(metadataFile, JSON.stringify(json, null, 2), (err) => {
      if (err) {
        console.error('Error writing metadata file', err);
      }
    });
  });
}

// Middleware to check image dimensions
function checkImageDimensions(req, res, next) {
  if (!req.file) {
    return next();
  }

  const filePath = req.file.path;
  try {
    const dimensions = sizeOf(filePath);
    const { width, height } = dimensions;

    if (
      (width === 468 && height === 60) ||
      (width === 936 && height === 120)
    ) {
      next();
    } else {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file', err);
        }
        res.redirect('/banners/invalid-dimensions');
      });
    }
  } catch (err) {
    console.error('Error processing image', err);
    res.send('Error processing image');
  }
}

// Routes
app.get('/banners', (req, res) => {
  fs.readFile('public/uploads/metadata.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.send('Error reading metadata');
    } else {
      const files = JSON.parse(data);
      res.render('index', { files: files });
    }
  });
});

app.get('/banners/upload', (req, res) => {
  res.render('upload');
});

app.post('/banners/upload', upload.single('image'), checkImageDimensions, (req, res) => {
  if (req.file) {
    saveMetadata(req.file.filename, req.file.originalname);
  }
  res.redirect('/banners');
});

app.get('/banners/invalid-dimensions', (req, res) => {
  res.render('invalid-dimensions');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
