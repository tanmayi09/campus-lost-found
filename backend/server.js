
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
require("dotenv").config();

const Item = require("./models/Item");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10kb" }));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Image upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and WebP images are allowed.")
      );
    }

    callback(null, true);
  }
});

// Upload image buffer to Cloudinary
function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "campusfind/items",
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    Readable.from(fileBuffer).pipe(stream);
  });
}

// Home route
app.get("/", (req, res) => {
  res.status(200).send("CampusFind API is running!");
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "CampusFind API is healthy."
  });
});

// Register user
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(400).json({
        message:
          "Enter your name, email, and a password between 8 and 72 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    return res.status(201).json({
      message: "Registration successful.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed. Please try again."
    });
  }
});

// Login user
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      password.length > 72
    ) {
      return res.status(400).json({
        message: "Please provide a valid email and password."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from .env");

      return res.status(500).json({
        message: "Login is temporarily unavailable."
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }
});

// JWT authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. Please log in."
    });
  }

  const token = authHeader.split(" ")[1];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "Authentication is temporarily unavailable."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token."
    });
  }
}

// Get all lost and found items
app.get("/api/items", async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });

    return res.status(200).json(items);
  } catch (error) {
    console.error("Fetch items error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch items."
    });
  }
});

// Create a lost or found item
app.post(
  "/api/items",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        status,
        location,
        date,
        contactName,
        contactEmail
      } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string" ||
        !description.trim() ||
        typeof category !== "string" ||
        !category.trim() ||
        !["Lost", "Found"].includes(status) ||
        typeof location !== "string" ||
        !location.trim() ||
        !date ||
        typeof contactName !== "string" ||
        !contactName.trim() ||
        typeof contactEmail !== "string" ||
        !contactEmail.trim()
      ) {
        return res.status(400).json({
          message: "Please provide all required item details."
        });
      }

      let imageUrl = "";

      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        imageUrl = result.secure_url;
      }

      const item = await Item.create({
        reportedBy: req.user.userId,
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        status,
        location: location.trim(),
        date,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        imageUrl
      });

      return res.status(201).json({
        message: "Item reported successfully.",
        item
      });
    } catch (error) {
      console.error("Create item error:", error.message);

      return res.status(500).json({
        message: "Failed to report item."
      });
    }
  }
);

// Edit item: only its reporter can edit it
app.put(
  "/api/items/:id",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid item ID."
        });
      }

      const allowedFields = [
        "title",
        "description",
        "category",
        "status",
        "location",
        "date",
        "contactName",
        "contactEmail"
      ];

      const updates = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (
        typeof updates.title !== "string" ||
        !updates.title.trim() ||
        typeof updates.description !== "string" ||
        !updates.description.trim() ||
        typeof updates.category !== "string" ||
        !updates.category.trim() ||
        !["Lost", "Found"].includes(updates.status) ||
        typeof updates.location !== "string" ||
        !updates.location.trim() ||
        !updates.date ||
        typeof updates.contactName !== "string" ||
        !updates.contactName.trim() ||
        typeof updates.contactEmail !== "string" ||
        !updates.contactEmail.trim()
      ) {
        return res.status(400).json({
          message: "Please provide all required item details."
        });
      }

      updates.title = updates.title.trim();
      updates.description = updates.description.trim();
      updates.category = updates.category.trim();
      updates.location = updates.location.trim();
      updates.contactName = updates.contactName.trim();
      updates.contactEmail = updates.contactEmail.trim();

      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer);
        updates.imageUrl = result.secure_url;
      }

      const updatedItem = await Item.findOneAndUpdate(
        {
          _id: id,
          reportedBy: req.user.userId
        },
        { $set: updates },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedItem) {
        return res.status(404).json({
          message:
            "Item not found or you are not authorized to edit it."
        });
      }

      return res.status(200).json({
        message: "Item updated successfully.",
        item: updatedItem
      });
    } catch (error) {
      console.error("Edit item error:", error.message);

      return res.status(500).json({
        message: "Failed to update item."
      });
    }
  }
);

// Delete item: only its reporter can delete it
app.delete("/api/items/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid item ID."
      });
    }

    const deletedItem = await Item.findOneAndDelete({
      _id: id,
      reportedBy: req.user.userId
    });

    if (!deletedItem) {
      return res.status(404).json({
        message:
          "Item not found or you are not authorized to delete this item."
      });
    }

    return res.status(200).json({
      message: "Item deleted successfully.",
      itemId: deletedItem._id
    });
  } catch (error) {
    console.error("Delete item error:", error.message);

    return res.status(500).json({
      message: "Failed to delete item."
    });
  }
});

// Handle upload errors, including unsupported types and files over 5 MB
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "Image size must not exceed 5 MB."
      });
    }

    return res.status(400).json({
      message: "Image upload failed. Please select one image."
    });
  }

  if (
    error.message ===
    "Only JPG, PNG, and WebP images are allowed."
  ) {
    return res.status(400).json({
      message: error.message
    });
  }

  console.error("Request error:", error.message);

  return res.status(500).json({
    message: "An unexpected server error occurred."
  });
});

// Start server after connecting to MongoDB
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from the .env file");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected database:", mongoose.connection.name);
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();
