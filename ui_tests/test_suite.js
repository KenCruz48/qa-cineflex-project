'use strict';
const assert=require('node:assert/strict');
const {Builder}=require('selenium-webdriver');
const chrome=require('selenium-webdriver/chrome');
const fs=require('node:fs');
const LoginPage=require('./pages/LoginPage');
const CarteleraPage=require('./pages/CarteleraPage');
const ReservaPage=require('./pages/ReservaPage');
async function run(){
 const options=new chrome.Options();if(process.env.HEADLESS!=='false')options.addArguments('--headless=new','--no-sandbox','--disable-dev-shm-usage');
 const driver=await new Builder().forBrowser('chrome').setChromeOptions(options).build();
 let fixture,server;
 if(!process.env.BASE_URL){fixture=require('../backend/app').createApp({logging:false});server=fixture.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));process.env.BASE_URL='http://127.0.0.1:'+server.address().port;}
 const invalidEmail='invalid-ui-'+Date.now()+'@cineflex.test';
 const login=new LoginPage(driver),catalog=new CarteleraPage(driver),reserve=new ReservaPage(driver);let failed=0;
 const tests=[
 ['01 formulario de ingreso',async()=>{await login.open();assert.equal(await login.buttonText(),'Entrar a CineFlex');}],
 ['02 correo obligatorio',async()=>assert.equal(await login.emailRequired(),'true')],
 ['03 contraseña oculta',async()=>assert.equal(await login.passwordType(),'password')],
 ['04 credenciales inválidas',async()=>{await login.login(invalidEmail,'wrong');assert.equal(await login.error(),'Credenciales incorrectas');}],
 ['05 bloqueo al tercer intento',async()=>{for(let i=0;i<2;i++){await login.login(invalidEmail,'wrong');await login.error();}assert.equal(await login.error(),'Cuenta bloqueada temporalmente');}],
 ['06 ingreso y título Cartelera',async()=>{await login.login();assert.equal(await catalog.title(),'Cartelera');}],
 ['07 catálogo completo',async()=>assert.equal(await catalog.count(),3)],
 ['08 filtro de género',async()=>{await catalog.filter('Comedia');assert.equal(await catalog.count(),1);assert.match(await catalog.cardText(),/Un verano juntos/);}],
 ['09 restaurar catálogo',async()=>{await catalog.filter('');assert.equal(await catalog.count(),3);}],
 ['10 abrir reserva',async()=>{await catalog.buy();assert.equal(await reserve.title(),'Órbita final');}],
 ['11 pago deshabilitado sin asiento',async()=>assert.equal(await reserve.payEnabled(),false)],
 ['12 seleccionar asiento',async()=>{await reserve.select('A1');assert.match(await reserve.selection(),/A1/);assert.equal(await reserve.payEnabled(),true);}],
 ['13 rechazo bancario',async()=>{await reserve.pay('4000000000000002');assert.equal(await reserve.error(),'Tarjeta rechazada por el banco simulado');}],
 ['14 compra completa y ticket',async()=>{await reserve.pay('4111111111111111');assert.match(await reserve.ticket(),/Órbita final.*Asiento A1.*18000.*Código/);}],
 ['15 asiento vendido no se puede elegir',async()=>{await reserve.newPurchase();await catalog.buy();assert.equal(await reserve.seatEnabled('A1'),false);}],
 ['16 navegación de regreso',async()=>{await reserve.back();assert.equal(await catalog.title(),'Cartelera');}],
 ['17 cerrar sesión borra datos',async()=>{await catalog.logout();await login.wait();assert.equal(await login.storedToken(),null);assert.equal(await catalog.visible(),false);}],
 ['18 Atrás no revela cartelera',async()=>{await driver.navigate().back();await login.wait();assert.equal(await catalog.visible(),false);assert.equal(await reserve.rawTicketText(),'');}],
 ['19 ruta directa sin sesión',async()=>{await driver.get((process.env.BASE_URL||'http://127.0.0.1:3000')+'/#cartelera');await login.wait();assert.equal(await catalog.visible(),false);}]
 ];
 fs.mkdirSync('reports',{recursive:true});
 try{for(const [name,test]of tests){try{await test();console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+': '+e.message);fs.writeFileSync('reports/ui-'+name.slice(0,2)+'.png',await driver.takeScreenshot(),'base64');}}}finally{await driver.quit();if(server)await new Promise(resolve=>server.close(resolve));fixture?.close();}
 if(failed)process.exitCode=1;
}
run().catch(e=>{console.error(e);process.exitCode=1;});
