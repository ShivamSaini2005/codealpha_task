import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Define custom types
interface DBUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
}

interface DBOrder {
  id: string;
  userId: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }[];
  total: number;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  status: "pending" | "processing" | "shipped" | "delivered";
  createdAt: string;
}

interface DBProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  rating: number;
  reviewsCount: number;
  features: string[];
}

interface DatabaseSchema {
  products: DBProduct[];
  users: DBUser[];
  orders: DBOrder[];
}

const INITIAL_PRODUCTS: DBProduct[] = [
  {
    id: "prod-1",
    name: "Svalbard Wool Blanket",
    description: "Wrap yourself in pure comfort. This luxurious blanket is woven from 100% organic Norwegian sheep wool, offering unmatched insulation, durability, and a classic heathered texture that enhances any living space.",
    price: 149.00,
    image: "https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?q=80&w=600&auto=format&fit=crop",
    category: "Home & Living",
    stock: 24,
    rating: 4.8,
    reviewsCount: 124,
    features: [
      "100% Organic Norwegian wool",
      "Dimensions: 150cm x 200cm",
      "Naturally soil and odor resistant",
      "Woven in a traditional family mill"
    ]
  },
  {
    id: "prod-2",
    name: "Fjord Oak Chair",
    description: "A masterclass in clean Scandinavian seating. Crafted from solid sustainable white oak, featuring an ergonomic curved backrest and a hand-woven paper cord seat that yields comfortably over years of daily dining.",
    price: 320.00,
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=600&auto=format&fit=crop",
    category: "Furniture",
    stock: 8,
    rating: 4.9,
    reviewsCount: 42,
    features: [
      "Solid European white oak frame",
      "Hand-woven paper cord seat (120 meters)",
      "Satin oil finish protects wood naturally",
      "No assembly required"
    ]
  },
  {
    id: "prod-3",
    name: "Nordic Ceramic Coffee Dripper",
    description: "Elevate your morning ritual. This matte-glazed stoneware pour-over dripper holds water temperature exceptionally well, suspended in a warm walnut wooden collar that nests perfectly over mugs and carafes.",
    price: 45.00,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop",
    category: "Kitchenware",
    stock: 45,
    rating: 4.7,
    reviewsCount: 88,
    features: [
      "High-fired stoneware with matte finish",
      "Solid American walnut wood collar",
      "Fits standard V60 size 02 paper filters",
      "Dishwasher safe ceramic cone"
    ]
  },
  {
    id: "prod-4",
    name: "Aurora Brass Desk Lamp",
    description: "Timeless geometry for the modern desk. Made entirely from solid spun brass, this lamp features a dome shade that tilts smoothly to direct glare-free light. Fitted with a woven cotton cord and tactile mechanical switch.",
    price: 189.00,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=600&auto=format&fit=crop",
    category: "Lighting",
    stock: 12,
    rating: 4.6,
    reviewsCount: 56,
    features: [
      "Spun brass base and shade",
      "1.8m woven brown cotton cable",
      "Adjustable shade pivot mechanism",
      "Standard E26 socket (bulb included)"
    ]
  },
  {
    id: "prod-5",
    name: "Oslo Linen Cushion",
    description: "A soft touch of organic texture. Made of heavyweight stonewashed European flax linen with deep envelope closure, filled with a plump premium down feather insert for perfect support and relaxed style.",
    price: 59.00,
    image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?q=80&w=600&auto=format&fit=crop",
    category: "Home & Living",
    stock: 35,
    rating: 4.5,
    reviewsCount: 71,
    features: [
      "100% European flax linen cover",
      "Premium 100% duck down feather insert",
      "Measures: 50cm x 50cm",
      "Stonewashed for exceptional softness"
    ]
  },
  {
    id: "prod-6",
    name: "Mergus Glass Carafe",
    description: "Pure clarity. Hand-blown from ultra-durable, thermal-shock resistant borosilicate glass, this water or wine carafe is finished with a raw turned solid oak spherical stopper to keep drinks pristine.",
    price: 38.00,
    image: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?q=80&w=600&auto=format&fit=crop",
    category: "Kitchenware",
    stock: 50,
    rating: 4.8,
    reviewsCount: 93,
    features: [
      "Hand-blown borosilicate glass",
      "Spherical oiled solid oak stopper",
      "Capacity: 1.2 Liters",
      "Drip-free rim design"
    ]
  },
  {
    id: "prod-7",
    name: "Tundra Oatmeal Rug",
    description: "Bring earthy warmth underfoot. This flat-woven floor rug is hand-loomed from thick undyed wool yarns, revealing natural color variations of stone, oatmeal, and cream. Highly durable and reversible.",
    price: 450.00,
    image: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?q=80&w=600&auto=format&fit=crop",
    category: "Furniture",
    stock: 5,
    rating: 4.9,
    reviewsCount: 19,
    features: [
      "80% Natural wool, 20% Organic cotton",
      "Hand-loomed flatweave construction",
      "Size: 160cm x 230cm",
      "Reversible design for twice the wear"
    ]
  },
  {
    id: "prod-8",
    name: "Skagerrak Cast Iron Pot",
    description: "A heavy kitchen icon. This enameled cast iron Dutch oven conducts heat flawlessly, boasting a self-basting lid that locks in moisture. From stove-top browning to slow oven roasting, it does it all with elegance.",
    price: 165.00,
    image: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=600&auto=format&fit=crop",
    category: "Kitchenware",
    stock: 15,
    rating: 4.9,
    reviewsCount: 112,
    features: [
      "Enameled heavy-gauge cast iron",
      "Capacity: 4.5 Quarts",
      "Oven safe up to 500°F (260°C)",
      "Excellent heat retention"
    ]
  },
  {
    id: "prod-9",
    name: "Kattegat Chef Knife",
    description: "Precision craft in carbon steel. Hand-forged by professional swordsmiths, featuring a core of high-carbon cobalt alloy clad in 33 layers of Damascus steel. Finished with an octagonal dark Birchwood handle.",
    price: 210.00,
    image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=600&auto=format&fit=crop",
    category: "Kitchenware",
    stock: 10,
    rating: 4.9,
    reviewsCount: 34,
    features: [
      "33-Layer Damascus stainless steel",
      "8-inch (20cm) multi-purpose chef blade",
      "Octagonal traditional Birchwood handle",
      "Exceptional edge retention (60+ Rockwell)"
    ]
  },
  {
    id: "prod-10",
    name: "Midnight Linen Bedding",
    description: "The ultimate luxury of deep rest. Woven from high-grade organic French flax, this complete linen sheet set has a relaxed drape and becomes softer with every single wash. Highly breathable and naturally temperature-regulating.",
    price: 280.00,
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=600&auto=format&fit=crop",
    category: "Home & Living",
    stock: 18,
    rating: 4.7,
    reviewsCount: 65,
    features: [
      "Includes: 1 Flat Sheet, 1 Fitted Sheet, 2 Pillowcases",
      "100% Organic French flax linen",
      "Deep pocket depth fits mattresses up to 40cm",
      "Arrives in a reusable linen storage pouch"
    ]
  }
];

// Helper functions for reading and writing the JSON database file
function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialSchema: DatabaseSchema = {
        products: INITIAL_PRODUCTS,
        users: [],
        orders: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), "utf-8");
      return initialSchema;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file, returning default schema:", error);
    return { products: INITIAL_PRODUCTS, users: [], orders: [] };
  }
}

function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Memory session store mapping token -> userId
const sessions = new Map<string, string>();

// Cryptography helpers
function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize DB immediately on boot
  readDB();

  // Authentication Middleware
  const authenticateUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing Authorization token." });
      return;
    }
    const token = authHeader.substring(7);
    const userId = sessions.get(token);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired session." });
      return;
    }
    // Append userId to req object
    (req as any).userId = userId;
    next();
  };

  // --- API ROUTES ---

  // 1. Get all products
  app.get("/api/products", (req, res) => {
    const db = readDB();
    res.json(db.products);
  });

  // 2. Get single product details
  app.get("/api/products/:id", (req, res) => {
    const db = readDB();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }
    res.json(product);
  });

  // 3. User Registration
  app.post("/api/auth/register", (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ error: "All fields (username, email, password) are required." });
      return;
    }

    const db = readDB();
    const existingUser = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()
    );

    if (existingUser) {
      res.status(400).json({ error: "Username or email is already taken." });
      return;
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const userId = "user-" + crypto.randomUUID();

    const newUser: DBUser = {
      id: userId,
      username,
      email: email.toLowerCase(),
      passwordHash,
      salt
    };

    db.users.push(newUser);
    writeDB(db);

    // Create session
    const token = "token-" + crypto.randomBytes(32).toString("hex");
    sessions.set(token, userId);

    res.status(201).json({
      token,
      user: {
        id: userId,
        username,
        email: newUser.email
      }
    });
  });

  // 4. User Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const db = readDB();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.status(400).json({ error: "Invalid email or password." });
      return;
    }

    const calculatedHash = hashPassword(password, user.salt);
    if (calculatedHash !== user.passwordHash) {
      res.status(400).json({ error: "Invalid email or password." });
      return;
    }

    // Create session
    const token = "token-" + crypto.randomBytes(32).toString("hex");
    sessions.set(token, user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  });

  // 5. Get current authenticated user profile
  app.get("/api/auth/me", authenticateUser, (req, res) => {
    const userId = (req as any).userId;
    const db = readDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email
    });
  });

  // 6. Submit/Process Order
  app.post("/api/orders", authenticateUser, (req, res) => {
    const userId = (req as any).userId;
    const { items, shippingAddress, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Order items are required." });
      return;
    }
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
      res.status(400).json({ error: "Complete shipping address is required." });
      return;
    }

    const db = readDB();

    // Verify stock and update stock
    for (const item of items) {
      const product = db.products.find((p) => p.id === item.productId);
      if (!product) {
        res.status(400).json({ error: `Product ${item.name} not found in database.` });
        return;
      }
      if (product.stock < item.quantity) {
        res.status(400).json({ error: `Insufficient stock for ${product.name}. Only ${product.stock} left.` });
        return;
      }
    }

    // Deduct stock
    for (const item of items) {
      const product = db.products.find((p) => p.id === item.productId);
      if (product) {
        product.stock -= item.quantity;
      }
    }

    const orderId = "ord-" + crypto.randomUUID();
    const newOrder: DBOrder = {
      id: orderId,
      userId,
      items,
      total: Number(total),
      shippingAddress,
      status: "processing", // immediately starts processing
      createdAt: new Date().toISOString()
    };

    db.orders.push(newOrder);
    writeDB(db);

    res.status(201).json(newOrder);
  });

  // 7. Get user's order history
  app.get("/api/orders", authenticateUser, (req, res) => {
    const userId = (req as any).userId;
    const db = readDB();
    const userOrders = db.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(userOrders);
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
