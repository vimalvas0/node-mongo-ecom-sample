/*
  Author: Vimal Vashisth
  Date: 2023-05-11
  Description: Demo implementation of a RESTful API using Express and Node.js for an eCommerce company.
*/

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const port = 3000;
const helmet = require("helmet");
const { formatDateForSearch } = require("./utils/dates.js");

// Using some basic security measures, based on some assumptions. Finally it depends on need of project.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'"],
      },
    },
    dnsPrefetchControl: { allow: true },
    expectCt: { maxAge: 86400, enforce: true },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "same-origin" },
    xssFilter: true,
  })
);

// Connect to the local MongoDB instance
mongoose.connect("mongodb://localhost/eCommerceDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create a mongoose schema for orders
const orderSchema = new mongoose.Schema({
  order_id: { type: String, required: true, unique: true },
  item_name: { type: String, required: true },
  cost: { type: Number, required: true },
  order_date: { type: Date, required: true },
  delivery_date: { type: Date, required: true },
});

// Create a mongoose model for orders...
const Order = mongoose.model("Order", orderSchema);

// Middleware to parse JSON payloads
app.use(express.json());

// Create a new order
app.post("/orders/create", async (req, res) => {
  try {
    const { order_id } = req.body;

    // Check for duplicate orders based on order_id
    const existingOrder = await Order.findOne({ order_id });
    if (existingOrder) {
      return res.status(409).json({ error: "Duplicate Order. Order already exists." });
    }

    // Create a new order document
    const newOrder = new Order(req.body);

    // Save the order to the database
    await newOrder.save();
    res.status(201).json({ message: "Order created successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to create order." });
  }
});

// Update the delivery date of an order
app.post("/orders/update", async (req, res) => {
  try {
    const { order_id, delivery_date } = req.body;

    // Find and update the order with the given order_id
    const updatedOrder = await Order.findOneAndUpdate({ order_id }, { delivery_date }, { new: true });

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json({ message: "Order updated successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to update order." });
  }
});

// List all orders for a given date
app.get("/orders/list", async (req, res) => {
  try {
    const { date } = req.query;

    // Formatting the date (as requirement) to yyyy/mm/dd
    const formattedDate = formatDateForSearch(date);

    // Find orders based on the formatted date
    const filteredOrders = await Order.find({
      order_date: { $regex: formattedDate },
    });

    res.json(filteredOrders);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve orders." });
  }
});

// Query for a specific order with Order ID
app.post("/orders/search", async (req, res) => {
  try {
    const { order_id } = req.body;

    // Find the order with the given order_id
    const foundOrder = await Order.findOne({ order_id });
    if (!foundOrder) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json(foundOrder);
  } catch (error) {
    res.status(500).json({ error: "Failed to search for order." });
  }
});

// Delete an order with Order ID
app.delete("/orders/delete/:order_id", async (req, res) => {
  try {
    const { order_id } = req.params;

    // Delete the order with the given order_id
    const deletedOrder = await Order.deleteOne({ order_id });
    if (deletedOrder.deletedCount === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json({ message: "Order deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete order." });
  }
});

// Start the server
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// In case anything goes wrong... closing the connections
const gracefulShutdown = () => {
  console.log("Closing server gracefully...");

  // Close the MongoDB connection
  mongoose.connection.close((err) => {
    if (err) {
      console.error("Error while closing MongoDB connection:", err);
    } else {
      console.log("MongoDB connection closed.");
    }
    process.exit(0); // Exit the application
  });
};

// Handling SIGINT signal (Ctrl+C) for graceful shutdown
process.on("SIGINT", gracefulShutdown);

// Close the server gracefully on termination
process.on("SIGTERM", () => {
  console.log("Terminating server...");
  server.close(() => {
    console.log("Server terminated.");
  });
});
