import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_4eC39HqLyjWDarjtT1zdp7dc");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // FFmpeg.wasm requires these headers for SharedArrayBuffer support
  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Create Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { price, title } = req.body;

      // In a real app, you'd look up the price in your database
      // For demo, we'll use the price passed from frontend (be careful in production!)
      const amount = parseInt(price.replace(/[^0-9]/g, "")) * 100; // Convert to cents/smallest unit

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "uzs",
              product_data: {
                name: title,
                description: "AlphaSpace Premium Xizmati",
              },
              unit_amount: amount || 2000000, // Default if parsing fails
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.origin}/shop-workspace?payment=success`,
        cancel_url: `${req.headers.origin}/shop-workspace?payment=cancel`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In Vercel, static files are served differently, but we keep this for local production tests
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
  }

  // Export the app for Vercel
  return app;
}

// Start server locally or export for Vercel
const appPromise = startServer();

if (process.env.NODE_ENV !== "production") {
  appPromise.then(app => {
    app.listen(3000, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:3000`);
    });
  });
}

export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
