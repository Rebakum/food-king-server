const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express()
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 7000

//midle ware
const corsOptions = {
    origin: [
        // 'http://localhost:5173',
        // 'http://localhost:5174',
        'https://food-king-747d6.firebaseapp.com',
        'https://food-king-747d6.web.app'],
    credentials: true,
    // optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.upnu39b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

//------middlewares------
const logger = (req, res, next) => {
    console.log('logInfo', req.method, req.url)
    next()
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('token in the middleware', token)
    if (!token) {
        return res.status(401).send({ message: 'unauthrized aceess' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unathorized access' })
        }
        req.user = decoded;
        next()
    })

}

async function run() {
    try {
        // --------Collection-----
        const FoodsCollection = client.db('foodKingDB').collection('allFoods')
        const MyFoodsCollection = client.db('foodKingDB').collection('myFoods')
        const reviewCollection = client.db('foodKingDB').collection('reviews')

        // -----Auth related jwt genaretor----

        app.post('/jwt', logger, async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "7d" })
            res
                .cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ status: "200", message: "user valid" })
        })

        //logOut /clear token
        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('current user', user)
            res.clearCookie('token', { maxAge: 0, }).send({ success: true })
        })



        //--get all food  data form db
        app.get('/allFoods', async (req, res) => {
            const result = await FoodsCollection.find().toArray()
            // .sort({expireDate: 1})
            res.send(result)
        })

        //get a single data 

        app.get('/allFood/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await FoodsCollection.findOne(query)
            res.send(result)
        }
        )


        // ----- Save My food------ s
        app.post('/myRequestFoods', async (req, res) => {
            const myData = req.body
            const result = await MyFoodsCollection.insertOne(myData)
            console.log(result)
            res.send(result)
        })
        //----get a single data ---

        app.get('/myRequestFoods/:email', verifyToken, logger, async (req, res) => {
            const email = req.params.email
            //--token owner--
            console.log('token owner info', req.user)
            console.log('token ase', req.params.email)

            if (req.user.email !== req.params.email) {
                console.log('user ')
                return res.status(403).send({ message: 'forbidden access' })

            }
            const query = { email: email }
            console.log(query)
            const result = await MyFoodsCollection.find(query).toArray()
            res.send(result)
        }
        )

        // ----- Save all food------ 
        app.post('/allFoods', async (req, res) => {
            const addData = req.body
            const result = await FoodsCollection.insertOne(addData)
            console.log(result)
            res.send(result)
        })

        //-----get all foods posted by specific user

        app.get('/allfoods/:email', verifyToken, logger, async (req, res) => {
            const email = req.params.email;
            //--token owner--
            console.log(' all food token owner info', req.user)
            console.log(' all food token ase', req.params.email)

            if (req.user.email !== req.params.email) {
                console.log('user ')
                return res.status(403).send({ message: 'forbidden access' })

            }
            const query = { 'donator.email': email }
            console.log(query)
            const result = await FoodsCollection.find(query).toArray()
            console.log(result)
            res.send(result)

        }
        )

        //-----allfoods--delete---------

        app.delete('/allfood/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await FoodsCollection.deleteOne(query)
            console.log(result)
            res.send(result)

        }
        )

        //----------all foods--delete---------

        app.put('/allfood/:id', async (req, res) => {
            const id = req.params.id
            const foodData = req.body
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ...foodData
                },
            }
            const result = await FoodsCollection.updateOne(query, updateDoc, options)
            console.log(result)
            res.send(result)

        }
        )

        //------------review----------------
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })
        
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send(' Food king am running')
})

app.listen(port, () => {
    console.log(`mongodb runing ${port}`)
})

