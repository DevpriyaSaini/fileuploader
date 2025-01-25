const mongoose=require("mongoose");
const schema=new mongoose.Schema({
    filename:{
            type:String,
            
    },
    path:{
        type:String
    }
})

const file=mongoose.model("files",schema);
module.exports=file;