'use strict';
var _plugins = require("./plugins");
var _ReqRes = function(event, context, callback) {
    var _headers

    //context.callbackWaitsForEmptyEventLoop = false
    //send html
    var send = (statusCode, body) => {
        if(typeof body == "undefined"){
            body = statusCode;
            statusCode = 200;
        }

        if(typeof object == "object"){
            try{
                object = JSON.parse(object)
            }catch(e){
               return error({message: "halder.json was passed an unparsable string", parseError:e.message})
            }
        }

        callback(null, {
            statusCode: statusCode,
            body: body,
        });
    }

    //send json
    var json = (statusCode, object, cb = false) => {
        if(typeof object == "undefined" && typeof statusCode != "undefined"){
            object = statusCode;
            statusCode = 200;
        }

        
        if(typeof cb != "string" && event.queryStringParameters){
            if(event.queryStringParameters.callback){
                cb =  event.queryStringParameters.callback
            }
            else if(event.queryStringParameters.cb){
                cb =  event.queryStringParameters.cb
            }
        }
        
        if(!cb){
            send(statusCode, JSON.stringify(object))
        }
        else{
            send(statusCode, cb+'('+JSON.stringify(object)+');')
        }
        
    }
    var jsonp = (statusCode, object, cb)=>{
        if(typeof object == "undefined" && typeof statusCode != "undefined"){
            object = statusCode;
            statusCode = 200;
            cb = "callback"
        }
        else if(typeof object == "string" && typeof statusCode != "undefined"){
            object = statusCode;
            statusCode = 200;
            cb = object
        }
        json(statusCode, object, cb)
    }
    var error = (err) => {
        if(err instanceof Error){
            json(400,{message:err.message, stack:err.stack}); 
          //throw(err) 
        }else{
            json(400, err); 
        }
    }

    var redirect = (Location)=>{
        callback(null, {
            statusCode: 301,
            headers: {
               Location
            },
            body: '',
        });
    }

    var handle = (aProimse)=>{
        try{
            Promise.resolve(aProimse).then(json).catch(error)
        }catch(e){
            error(e)
        }
    }


    var query = event.queryStringParameters || {}
    var body = ""
    var params = event.pathParameters || {}
    var accountId = null;
    var headers = event.headers
    


    if(event.body){
        body = event.body;
        try{
            body = JSON.parse(body)
        }catch(e){}
    }
    
    return {
        req:{
            query,
            body,
            params,
            headers
        },
        res:{
            send,
            json,
            redirect,
            error,
            handle
        }
    };
}



module.exports = function (runCallback){
    var _befores = []
    var _catch = false;
    var _event = {} 
    var _context = {}

    this.run = (event, context, callback) => {
        event   = Object.assign(event, _event);
        context = Object.assign(context, _context);
        var {req, res} = new _ReqRes(event, context, callback);
        var pRomises
        var plugins = _plugins.get();
        _befores = _befores.concat(plugins)

        if(_befores.length > 0){
            
            var i = 0
            var len = _befores.length
            var hasErrors = false;
            function combine(newReq,newRes){
              
                if(typeof newRes == "object")
                    res =  Object.assign(res,newRes);
                if(typeof newReq == "object")
                    req =  Object.assign(req,newReq);
             
            }

            var checkFulfill = ()=>{
                i++;
                if(i==len){
                    
                    if(hasErrors && _catch){
                        return _catch(req.ReqResErrors,req,res)

                    }
                    else{
                        runCallback(req,res)
                    }
                }
                else{
                    next()
                }
            }

            var next = () => {
                var before = _befores[i];
                
                if(typeof before == "function" ){
                    
                    before = before(req,res,this.Lambda)
                    //console.log("function")
                    Promise.resolve(before).then(checkFulfill)
                    .catch((error)=>{
                        hasErrors = true
                        if(typeof req.ReqResErrors == "undefined"){
                            req.ReqResErrors = [];
                        }
                        if(error instanceof Error){
                            req.ReqResErrors.push({message:error.message, stack:error.stack}); 
                          //throw(err) 
                        }else{
                           req.ReqResErrors.push(error)
                        }
                        
                        checkFulfill()
                    })
                }
                else{
                    //console.log(before)
                    combine(before.req,before.res)
                    checkFulfill()
                }                    
            }
            next()
            
        }
        else{
           runCallback(req, res) 
        }
        
    }

    
    this.before = (callback)=>{
        _befores.push(callback)
        return this
    }

    this.catch = (callback)=>{
        _catch = callback;
        return this
    }

    this.event = (event)=>{
       _event = Object.assign(_event, event)
        return this
    }

    this.context = (context)=>{
       _context = Object.assign(_context, context)
        return this
    }
    
    return this
}