require("dotenv").config()

const port = 8000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");
const { read } = require("fs");
const { Console, error } = require("console");
// Cloudinary configuration
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


// creat connection with mongodb
app.use(express.json());
app.use(cors());
mongoose.connect(process.env.MONGO_URI).then(()=>{
    console.log("monggose conneted");
})


app.get("/",(rec,res)=>{
    res.send("Express App is Running")
})

// schema for creatimg products
const productSchema = new mongoose.Schema({
    id: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    new_price: {
      type: Number,
      required: true,
    },
    old_price: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    available: {
      type: Boolean,
      default: true,
    },
  });
  
  // Check if the model already exists
  const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
  module.exports = Product;

app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
        date:req.body.date,
        available:req.body.avilable ?? true, 
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})


// creating api for deleting products

app.post('/removeproduct',async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Rmoved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// creating api for getting all procudcts

app.get('/allproducts',async(req,res)=>{
    let products = await Product.find({});
    console.log("All products fatched");
    res.send(products);
})

// schema creating for user model
const usersSchema = new mongoose.Schema({
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    },
})
const Users = mongoose.models.Users || mongoose.model('Users', usersSchema);
  module.exports = Users;

    // schemma for admin
    const adminSchema =new mongoose.Schema({
        username: {
        type: String,
        required: true,
        unique: true,
        },
        password: {
        type: String,
        required: true,
        },
        email:{
            type: String,
            required: true,
            unique:true,
        }
    });
    const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
     module.exports = Admin;

    // Admin login endpoint
    app.post('/admin/login', async (req, res) => {
        const { email, password,} = req.body;
    
        try {
        // Check if admin exists
        let admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ success: false, error: "Invalid Username" });
        }
    
        // Validate password
        const isPasswordValid = password === admin.password;
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, error: "Invalid Password" });
        }
    
        // Create JWT token for admin
        const data = {
            admin: {
            id: admin.id,
            },
        };
        const token = jwt.sign(data, 'secret_admin_key'); // Sign token with secret key
        res.json({ success: true, token });
        } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });
    

    // Create a new admin (for testing or manually adding admins)
    app.post('/admin/create', async (req, res) => {
        const { username, password,email} = req.body;
    
        try {
        let admin = new Admin({
            username,
            password,
            email,  // In production, consider hashing the password using bcrypt
        });
        
        await admin.save();
        res.json({ success: true, message: "Admin created successfully" });
        } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });
    

    // Middleware for admin authentication
    const fetchAdmin = (req, res, next) => {
        const token = req.header('auth-token');
        if (!token) {
        return res.status(401).send({ error: "Please authenticate using a valid token" });
        }
        try {
        const data = jwt.verify(token, 'secret_admin_key'); // Use the same secret used in login
        req.admin = data.admin;
        next();
        } catch (error) {
        return res.status(401).send({ error: "Please authenticate using a valid token" });
        }
    };
    
    // Protected admin route
    app.get('/admin/dashboard', fetchAdmin, (req, res) => {
        res.send("Welcome to Admin Dashboard");
    });
    
    // creating endpoint for registering the user

app.post('/signup',async (req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with same email id"});
    }
    let cart = {};
    for(let i = 0; i<300; i++){
        cart[i] = 0;
    }

    const user = new Users({
        nmae:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })
    await user.save();
    const data = {
        user:{
            id:user.id,
        }
    }

    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true,token})
})

// creating endpoint for user login

app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id,
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true, token});
        }
        else{
            res.json({success:false,error:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,error:"Wrong Email Id"});
    }
})

// creatin api for newcollection

app.get('/newcollections',async(req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("Newcollection Fetched");
    res.send(newcollection);
})


// create end point for popular in women
app.get('/popularinwomen',async(req,res)=>{
    let products = await Product.find({category:"women"});
    let populer_in_women = products.slice(0,4);
    console.log("Populer In Women Fetched");
    res.send(populer_in_women);
})

// creating middileware to fetch uset
const fetchUser = async (req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"});
    }
    else{
        try{
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        }catch (error){
             res.status(401).send({error:"Please authenticate with valid token"});
        }
    }
}
// creatin endpoint for aadto cart

app.post('/addtocart',fetchUser,async(req,res)=>{
    console.log("Added",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send({success:"Added"});

  
})

// create end point to remove product form cart data

app.post('/removeformcart',fetchUser,async(req,res)=>{
    console.log("Removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send({success:"Rmoved"});
})

// creating endpoint to get cart data

app.post('/getcart',fetchUser,async(req,res)=>{
    console.log("GetCart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

// for runnign status
app.listen(port,(error)=>
{
    if(!error){
        console.log("server Running on port " + port);
    }
    else{
        console.log("Error :" + error);
    }
})

// Configure Cloudinary with your credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up multer storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads', // Folder in Cloudinary to store files
        format: async (req, file) => 'png', // Format of the image (optional, defaults to original format)
        public_id: (req, file) => Date.now().toString(), // Unique filename for each file
    },
});

const upload = multer({ storage: storage });

// Endpoint to upload image to Cloudinary
app.post("/upload", upload.single('product'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.json({
        success: 1,
        image_url: req.file.path, // Cloudinary provides the URL for the uploaded image
    });
})

// for search engine

const ItemSchema = new mongoose.Schema({
  name: String, 
});
  
const Item = mongoose.models.Product || mongoose.model('Item', ItemSchema);
module.exports = Item;
  // Search endpoint using existing Product model
  app.get('/search', async (req, res) => {
    const query = req.query.q;

    try {
        const results = await Product.find({
            name: { $regex: query, $options: 'i' }
        });
        
        res.json(results);
    } catch (error) {
        console.error("Error in search:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

  
  