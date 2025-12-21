import { Server } from "socket.io";
import { NextResponse } from "next/server";

// This is a modern Next.js App Router implementation for a WebSocket server.
// The GET handler initializes the WebSocket server on the first request.
// Subsequent calls will reuse the existing server.

// We are attaching the server to the global scope to persist it across hot reloads
// in development. In a production environment, this will only run once.
const getSocketServer = () => {
  if ((global as any).io) {
    return (global as any).io;
  }
  
  console.log("Socket.IO server not found, creating a new one.");
  
  // This is a bit of a hack to get the underlying HTTP server from Next.js
  // We find the server by looking at the require cache. This is not documented
  // and might break in future Next.js versions, but is a common pattern for now.
  const NextServer = require("next/dist/server/next-server").default;
  const httpServer = require("http").createServer(NextServer);
  
  const io = new Server(httpServer, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: "*", // Allow all origins for simplicity, can be restricted in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });

    // Listen for an event from a client (e.g., the mobile device)
    socket.on("package-added", (newPackage) => {
      // Broadcast this event to all other clients (e.g., the PC)
      socket.broadcast.emit("new-package-received", newPackage);
      console.log(`Broadcasting new package: ${newPackage.trackingCode}`);
    });

    // Listen for package-changed event (from dashboard/PackageTable)
    socket.on("package-changed", () => {
      // Broadcast dashboard-stats-update to all clients (dashboard cards)
      socket.broadcast.emit("dashboard-stats-update");
      console.log("Broadcasting dashboard-stats-update to all clients");
    });
  });

  (global as any).io = io;
  
  // We need to start the http server listening on a port.
  // We choose a port that is different from Next.js's default (3000).
  const port = process.env.SOCKET_PORT || 3001;
  httpServer.listen(port, () => {
    console.log(`Socket.IO server listening on port ${port}`);
  });

  return io;
};

export async function GET(req: any, res: any) {
  try {
    getSocketServer();
    // This response is mainly for health checks or to confirm server is up.
    return NextResponse.json({ success: true, message: "Socket.IO server is initialized." });
  } catch (error) {
    console.error("Socket API route error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize Socket.IO server." },
      { status: 500 }
    );
  }
}
