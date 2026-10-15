const BasePage=require('./BasePage');
class LoginPage extends BasePage{
 constructor(driver){super(driver);this.ids={email:'email-input',password:'password-input',submit:'login-btn',error:'login-error',form:'login-form'};}
 async open(){await this.driver.get(process.env.BASE_URL||'http://127.0.0.1:3000');}
 async login(email='qa@cineflex.test',password='CineFlex2026!'){await this.fill('email-input',email);await this.fill('password-input',password);await this.click('login-btn');}
 async error(){await this.driver.wait(async()=>Boolean(await this.text('login-error')),5000);return this.text('login-error');}
 async buttonText(){return this.text(this.ids.submit);}
 async emailRequired(){return (await this.element(this.ids.email)).getAttribute('required');}
 async passwordType(){return (await this.element(this.ids.password)).getAttribute('type');}
 async wait(){await this.element(this.ids.form);}
 async storedToken(){return this.driver.executeScript("return sessionStorage.getItem('token')");}
}
module.exports=LoginPage;
