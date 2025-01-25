require("dotenv").config();
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream'); // For converting file buffers
const path = require("path");
const { log } = require('console');
const app = express();
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

const envPath = path.resolve(__dirname, '.env');
console.log('Checking if .env exists:', fs.existsSync(envPath));
// Initialize Express app
app.get("/",(req,res)=>{
    return res.render("file");
})
app.use(express.json());

// MongoDB connection
async function connectdb() {
  const mongoose = require('mongoose');
  console.log('Mongo URI',process.env.MONGO_URI);
  // Get MongoDB URI from the .env file
  const mongoURI = process.env.MONGO_URI;

  
  // Connect to MongoDB
  mongoose
    .connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log('Connected to MongoDB!');
    })
    .catch((err) => {
      console.error('Error connecting to MongoDB:', err.message);
    });
}
connectdb();
// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB schema for storing file and metadata
const jobSchema = new mongoose.Schema({
  jobTitle: { type: String, required: true },
  orderValue: { type: Number  },
  date: { type: Date, required: true },
  fileUrl: { type: String, required: true }, // Cloudinary URL
  fileData: { type: Buffer, required: true }, // File data in MongoDB
  fileType: { type: String, required: true }, // File MIME type
});

const Job = mongoose.model('Job', jobSchema);

// Multer configuration for file uploads
const storage = multer.memoryStorage(); // Store file in memory temporarily
const upload = multer({ storage: storage });

// Controller to handle job creation
app.post('/job/create', upload.single('file'), async (req, res) => {
  try {
    const { jobTitle, order, date } = req.body;
    console.log({body:req.body,
        
    });

    // Validate required fields
    // if (!jobTitle || !orderValue || !date || !req.file) {
    //   return res.status(400).json({ message: 'All fields are required' });
    // }

    // Upload file to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'job-uploads', resource_type: 'auto' },
      async (error, result) => {
        if (error) {
          console.error('Error uploading to Cloudinary:', error);
          return res.status(500).json({ message: 'Cloudinary upload failed' });
        }
        console.log({"result":result.secure_url});

        // Create a new Job document
        const newJob = new Job({
          jobTitle,
          order,
          date,
          fileUrl: result.secure_url, // Cloudinary file URL
          fileData: req.file.buffer, // Store file as binary in MongoDB
          fileType: req.file.mimetype, // Store MIME type
        });

        console.log({"job created":newJob });

        // Save to MongoDB
        await newJob.save();

        res.status(201).render("file");
      }
    );

    // Stream the file buffer to Cloudinary
    Readable.from(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});





app.get('/job/search', async (req, res) => {
  try {
      const { query } = req.query;

      // Perform a case-insensitive search in MongoDB
      const jobs = await Job.find({
          jobTitle: { $regex: query, $options: 'i' },
      });

      // Render the results in the same EJS template
      res.render('file', { jobs });
  } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});





// Start the server
const PORT = process.env.PORT||5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

