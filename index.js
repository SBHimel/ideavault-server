const express = require("express");
const dontenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

// jwks key set
const JWKS = createRemoteJWKSet(
  new URL (`${process.env.CLIENT_URL}/api/auth/jwks`)
)


// Middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // console.log(token);

  try {
    
    const {payload} = await jwtVerify(token, JWKS)

  console.log(payload);
  next();
  } catch (error) {
    return res.status(403).json({message: "Forbidden"});
  }
  
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("ideaVault");
    const ideaCollection = db.collection("ideas");
    const commentCollection = db.collection("Comments");

    // Add ideas ba IdeaForm er jonno data
    app.post("/idea",verifyToken, async (req, res) => {
      const ideaData = req.body;
      console.log(ideaData);
      const result = await ideaCollection.insertOne(ideaData);

      res.json(result);
    });

   // mongodb theke data ana and ideas page e dekhanu
    app.get("/idea", async (req, res) => {
      try {
        let query = {};

        
        if (req.query.email) {
          query.userEmail = req.query.email;
        }

        //  search er logic
        if (req.query.search) {
          // এটি টাইটেলের ভেতর কেস-ইনসেনসিটিভ সার্চ করবে
          query.title = { $regex: new RegExp(req.query.search, 'i') };
        }

        //   cetagory logic
        if (req.query.category) {
          query.category = req.query.category;
        }

        const result = await ideaCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch ideas", error });
      }
    });


    // IdeaDetailsPage id onujayi get kora
    app.get("/idea/:id",verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await ideaCollection.findOne({ _id: new ObjectId(id) });

      res.json(result);
    });

    // Edit ba update korar api
    app.patch("/idea/:id",verifyToken,  async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const result = await ideaCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData },
      );
      res.json(result);
    });

    // Delete idea==================
    // Delete idea API
    app.delete("/idea/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await ideaCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.json(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete idea", error });
      }
    });

    // Comment ADD Korar API bananu
    app.post("/comments",verifyToken, async (req, res) => {
      try {
        const commentData = req.body;

        const result = await commentCollection.insertOne(commentData);

        res.json(result);
      } catch (error) {
        res.status(500).send({ message: "Error adding comment", error });
      }
    });
   // নির্দিষ্ট ইউজারের করা সব কমেন্ট GET করার API (অন্যান্য রুট অক্ষত রেখে)
    app.get("/user-comments", verifyToken, async (req, res) => {
      try {
       
        const authHeader = req.headers.authorization;
        const token = authHeader.split(" ")[1];
        
        
        const { payload } = await jwtVerify(token, JWKS);
        const verifiedEmail = payload?.email; 

        if (!verifiedEmail) {
          console.log(" এই টোকেনে কোনো ইমেইল পাওয়া যায়নি!");
          return res.json([]); 
        }

        console.log(" email khuja", verifiedEmail);

        const query = { userEmail: verifiedEmail }; 
        
        const result = await commentCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();

        console.log(` ডাটাবেজ থেকে মোট ${result.length} টি কমেন্ট পাওয়া গেছে।`);

        res.json(result); 
        
      } catch (error) {
        console.error(" Database or Token error in user-comments:", error);
        res.json([]); 
      }
    });

    // Ekti Particular Idea-r Shob Comment GET Korar API
    app.get("/comments/:ideaId",verifyToken, async (req, res) => {
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
    app.patch("/comments/:id",verifyToken, async (req, res) => {
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

    app.delete("/comments/:id",verifyToken, async (req, res) => {
      try {
        const { id } = req.params; // Comment er unique row _id

        const query = { _id: new ObjectId(id) };
        const result = await commentCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error deleting comment", error });
      }
    });

    // await client.db("admin").command({ ping: 1 });
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
