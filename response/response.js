exports.errorResponse = (res,{statusCode=500,message="server error"}) => {
    res.status(statusCode).json({
       success:false,
       message:message
    })
   }
   
   exports.successResponse = (res,{statusCode=500,message="server error",data={}}) => {
    res.status(statusCode).json({
       success:true,
       message:message,
       data:data
    })
   }
   