'use strict';
const path = require('node:path');
const { createApp } = require('./app');
const { app, close } = createApp({dbPath:process.env.DB_PATH||path.join(__dirname,'cineflex.sqlite'),secret:process.env.JWT_SECRET});
const server=app.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('CineFlex: http://127.0.0.1:'+server.address().port));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>{close();process.exit(0);}));
