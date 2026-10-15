'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const request=require('supertest');
const {createApp}=require('../backend/app');
const credentials={email:'qa@cineflex.test',password:'CineFlex2026!'};
test('Contrato, seguridad, rechazo bancario y exclusión concurrente',async()=>{
 const fixture=createApp({logging:false});const api=request(fixture.app);
 try{
  await api.get('/api/v1/movies').expect(401);
  await api.get('/api/health').expect('X-Content-Type-Options','nosniff').expect(200);
  await api.post('/api/v1/auth/login').send({email:[],password:'x'}).expect(400);
  const login=await api.post('/api/v1/auth/login').send(credentials).expect(200);
  const token=login.body.token;const auth={Authorization:'Bearer '+token};
  await api.get('/api/v1/movies').set(auth).expect(200).expect(r=>assert.equal(r.body.data.length,3));
  await api.get('/api/v1/movies/999/seats').set(auth).expect(404);
  await api.post('/api/v1/reservations').set(auth).send({movieId:1,seat:'Z99',card:'4111111111111111'}).expect(400);
  const reservation={movieId:1,seat:'A1',card:'4000000000000002'};
  await api.post('/api/v1/reservations').set(auth).send(reservation).expect(402).expect(r=>assert.equal(r.body.code,'PAYMENT_DECLINED'));
  await api.get('/api/v1/movies/1/seats').set(auth).expect(r=>assert.equal(r.body.data.find(s=>s.seat==='A1').occupied,0));
  reservation.card='4111111111111111';
  const results=await Promise.all(Array.from({length:10},()=>api.post('/api/v1/reservations').set(auth).send(reservation)));
  assert.equal(results.filter(r=>r.status===201).length,1);assert.equal(results.filter(r=>r.status===409).length,9);
  assert.equal(results.find(r=>r.status===201).body.ticket.total,18000);
  await api.post('/api/v1/auth/logout').set(auth).send({}).expect(204);
  await api.get('/api/v1/movies').set(auth).expect(401);
 }finally{fixture.close();}
});
test('Bloqueo en el tercer fallo, incluso con contraseña correcta, y recuperación',async()=>{
 const f=createApp({logging:false,lockMs:40});const api=request(f.app);
 try{
  for(const status of [401,401,423])await api.post('/api/v1/auth/login').send({...credentials,password:'wrong'}).expect(status);
  await api.post('/api/v1/auth/login').send(credentials).expect(423);
  await new Promise(r=>setTimeout(r,60));
  await api.post('/api/v1/auth/login').send(credentials).expect(200);
 }finally{f.close();}
});
