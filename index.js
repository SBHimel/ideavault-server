const express = require("express");
const dontenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dontenv.config();
const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.connect();

    const db = client.db("ideaVault");
    const ideaCollection = db.collection("ideas");
    const commentCollection = db.collection("Comments");

    // Addideas ba IdeaForm er jonno data
    app.post("/idea", async (req, res) => {
      const ideaData = req.body;
      console.log(ideaData);
      const result = await ideaCollection.insertOne(ideaData);

      res.json(result);
    });

    // mongodb theke data ana and ideas page e dekhanu
    app.get("/idea", async (req, res) => {
      const result = await ideaCollection.find().toArray();

      res.json(result);
    });

    // IdeaDetailsPage id onujayi get kora
    app.get("/idea/:id", async (req, res) => {
      const { id } = req.params;

      const result = await ideaCollection.findOne({ _id: new ObjectId(id) });

      res.json(result);
    });

    // Comment ADD Korar API
    app.post("/comments", async (req, res) => {
      try {
        const commentData = req.body; // Frontend theke asbe: { ideaId, userName, userEmail, text, timestamp }

        const result = await commentCollection.insertOne(commentData);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error adding comment", error });
      }
    });

    // Ekti Particular Idea-r Shob Comment GET Korar API
    app.get("/comments/:ideaId", async (req, res) => {
      try {
        const { ideaId } = req.params;

        // Shudhu oi ideaId-r database rows khunje ber korbe ar reverse sequencing-e display korbe
        const query = { ideaId: ideaId };
        const result = await commentCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching comments", error });
      }
    });

    // Comment EDIT Korar API
    app.patch("/comments/:id", async (req, res) => {
      try {
        const { id } = req.params; // Comment er nijosso _id
        const { text, timestamp } = req.body; // Sudhu text ar time content update hobe

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { text: text, timestamp: timestamp },
        };

        const result = await commentCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error editing comment", error });
      }
    });

    // Comment DELETE Korar API (DELETE)

    app.delete("/comments/:id", async (req, res) => {
      try {
        const { id } = req.params; // Comment er unique row _id

        const query = { _id: new ObjectId(id) };
        const result = await commentCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error deleting comment", error });
      }
    });

    

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running file!");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
