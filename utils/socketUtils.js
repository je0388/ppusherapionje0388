const socketIO = require("socket.io");

exports.sio = (server) => {
  const io = socketIO(server, {
    transports: ["polling"],
    cors: {
      origin: "*",
    },
    maxHttpBufferSize: 10e12, // Set maximum payload size to 10MB
  });

  return io;
};

exports.connection = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });

    socket.on("sendSong", async ({ songData }) => {
      try {
        if (!songData || !songData.fileName || !songData.fileType || !songData.dataURL) {
          throw new Error("Invalid song data format.");
        }

        const connectedSockets = Array.from(io.sockets.sockets.keys()).filter(s => s !== socket.id);

        console.log(`Connected sockets (excluding sender): ${connectedSockets.length}`);

        if (connectedSockets.length >= 1) {
          const randomSocketIds = chooseRandom(connectedSockets, 1);
          const randomSockets = randomSocketIds.map(id => io.sockets.sockets.get(id));

          randomSockets.forEach((randomSocket) => {
            randomSocket.emit("receiveSong", { senderId: socket.id, songData });
          });
        } else {
          socket.emit("error", { message: "Not enough users to send song to." });
        }
      } catch (error) {
        console.error("Error sending song:", error);
        socket.emit("error", { message: "Failed to send song. Please try again later." });
      }
    });

    socket.on("searchSongAcrossUsers", async (searchTerm) => {
      try {
        io.emit("performSearch", { searchTerm, requesterId: socket.id });
      } catch (error) {
        console.error("Error initiating search:", error);
        socket.emit("error", { message: "Failed to initiate search. Please try again later." });
      }
    });

    socket.on("searchResultsFromUser", ({ requesterId, searchResults }) => {
      io.to(requesterId).emit("searchResults", searchResults);
    });
  });
};

function chooseRandom(arr, num) {
  const result = [];
  const len = arr.length;
  const taken = new Set();
  if (num > len) {
    throw new RangeError("chooseRandom: more elements taken than available");
  }
  while (result.length < num) {
    const x = Math.floor(Math.random() * len);
    if (!taken.has(x)) {
      result.push(arr[x]);
      taken.add(x);
    }
  }
  return result;
}
