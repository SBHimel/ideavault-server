const express = require('express')
const dontenv = require('dotenv')
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dontenv.config()
const uri = process.env.MONGODB_URI;

const app = express()
const PORT = process.env.PORT

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    
    await client.connect();

    const db = client.db("ideaVault")
    const ideaCollection = db.collection("ideas")

    // Addideas ba IdeaForm er jonno data
    app.post('/idea', async(req,res) => {
      const ideaData = req.body
      console.log(ideaData);
      const result = await ideaCollection.insertOne(ideaData)

      res.json(result)
    });

    // mongodb theke data ana and ideas page e dekhanu
    app.get('/idea', async(req, res)=>{
      const result = await ideaCollection.find().toArray();
      
      res.json(result)
    });

    // IdeaDetailsPage id onujayi get kora
    app.get("/idea/:id", async(req, res) =>{
      const {id} = req.params

      const result = await ideaCollection.findOne({_id: new ObjectId(id)})

      res.json(result)
    })

    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is running file!')
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
