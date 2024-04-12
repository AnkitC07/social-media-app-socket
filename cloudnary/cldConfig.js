import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv"
dotenv.config()
          
cloudinary.config({ 
  cloud_name: 'deyq54d8b', 
  api_key: process.env.CLOUDNARY_API_KEY, 
  api_secret: process.env.CLOUDNARY_SECERT_KEY 
});

export default cloudinary