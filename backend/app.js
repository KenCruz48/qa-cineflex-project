'use strict';
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bank = require('./paymentStub');

function createApp({ dbPath = ':memory:', secret = randomUUID(), lockMs = 60000, logging = true } = {}) {
  const app = express();
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS movies(id INTEGER PRIMARY KEY,title TEXT,genre TEXT,price INTEGER);
    CREATE TABLE IF NOT EXISTS seats(movie_id INTEGER,seat TEXT,PRIMARY KEY(movie_id,seat),FOREIGN KEY(movie_id) REFERENCES movies(id));
    CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,user_id INTEGER,movie_id INTEGER,seat TEXT,total INTEGER,UNIQUE(movie_id,seat),FOREIGN KEY(movie_id,seat) REFERENCES seats(movie_id,seat));`);
  const seed = db.prepare('INSERT OR IGNORE INTO movies VALUES(?,?,?,?)');
  [[1,'Órbita final','Ciencia ficción',18000],[2,'La última pista','Suspenso',16000],[3,'Un verano juntos','Comedia',14000]].forEach(m => seed.run(...m));
  const seatSeed = db.prepare('INSERT OR IGNORE INTO seats VALUES(?,?)');
  for (let m=1;m<=3;m++) for (const row of ['A','B','C']) for (let n=1;n<=6;n++) seatSeed.run(m,`${row}${n}`);
  const failures = new Map();
  const sessions = new Set();
  app.disable('x-powered-by');
  app.use(helmet());
  if (logging) app.use(morgan('tiny'));
  app.use(express.json({limit:'8kb'}));
  app.use((req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  app.get('/api/health', (req,res)=>res.json({status:'ok'}));
  app.post('/api/v1/auth/login',(req,res)=>{
    const {email,password}=req.body || {};
    if(typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>128) return res.status(400).json({message:'Credenciales inválidas'});
    const key=email.trim().toLowerCase();
    const state=failures.get(key);
    if(state?.until>Date.now()) return res.status(423).json({message:'Cuenta bloqueada temporalmente',retryAfter:Math.ceil((state.until-Date.now())/1000)});
    if(state?.until) failures.delete(key);
    if(key!=='qa@cineflex.test'||password!=='CineFlex2026!') {
      const count=(failures.get(key)?.count||0)+1;
      if(count>=3) { failures.set(key,{count,until:Date.now()+lockMs}); return res.status(423).json({message:'Cuenta bloqueada temporalmente'}); }
      failures.set(key,{count});
      return res.status(401).json({message:'Credenciales incorrectas',remaining:3-count});
    }
    failures.delete(key);
    const jti=randomUUID(); sessions.add(jti);
    res.json({token:jwt.sign({sub:'1',jti},secret,{expiresIn:'30m',algorithm:'HS256'}),user:{email:key}});
  });
  function auth(req,res,next) {
    try {
      const token=/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1];
      req.user=jwt.verify(token,secret,{algorithms:['HS256']});
      if(!sessions.has(req.user.jti)) throw Error('revoked');
      next();
    } catch { res.status(401).json({message:'Sesión inválida o expirada'}); }
  }
  app.use('/api/v1',auth);
  app.post('/api/v1/auth/logout',(req,res)=>{sessions.delete(req.user.jti);res.status(204).end();});
  app.get('/api/v1/movies',(req,res)=>res.json({data:db.prepare('SELECT * FROM movies').all()}));
  app.get('/api/v1/movies/:id/seats',(req,res)=>{
    const movie=db.prepare('SELECT * FROM movies WHERE id=?').get(req.params.id);
    if(!movie) return res.status(404).json({message:'Película no encontrada'});
    res.json({data:db.prepare('SELECT s.seat, t.id IS NOT NULL AS occupied FROM seats s LEFT JOIN tickets t ON s.movie_id=t.movie_id AND s.seat=t.seat WHERE s.movie_id=? ORDER BY s.seat').all(movie.id)});
  });
  app.post('/api/v1/reservations',(req,res)=>{
    const {movieId,seat,card}=req.body||{};
    if(!Number.isInteger(movieId)||typeof seat!=='string'||! /^[ABC][1-6]$/.test(seat)||typeof card!=='string'||! /^\d{16}$/.test(card)) return res.status(400).json({message:'Datos de reserva inválidos'});
    const movie=db.prepare('SELECT * FROM movies WHERE id=?').get(movieId);
    if(!movie) return res.status(404).json({message:'Película no encontrada'});
    if(db.prepare('SELECT id FROM tickets WHERE movie_id=? AND seat=?').get(movieId,seat)) return res.status(409).json({message:'Asiento ocupado'});
    const payment=bank.authorize(card);
    if(!payment.approved) return res.status(402).json({code:payment.code,message:payment.message});
    const ticket={id:randomUUID(),movieId,title:movie.title,seat,total:movie.price};
    try {db.prepare('INSERT INTO tickets VALUES(?,?,?,?,?)').run(ticket.id,Number(req.user.sub),movieId,seat,movie.price);}
    catch(e) {if(e.code?.startsWith('ERR_SQLITE')) return res.status(409).json({message:'Asiento ocupado'}); throw e;}
    res.status(201).json({ticket});
  });
  app.use('/api',(req,res)=>res.status(404).json({message:'Ruta no encontrada'}));
  app.use(express.static(path.join(__dirname,'../frontend')));
  app.use((err,req,res,next)=>res.status(err.status===400?400:500).json({message:err.status===400?'JSON inválido':'Error interno'}));
  return {app,close:()=>db.close()};
}
module.exports={createApp};
