const {By,until}=require('selenium-webdriver');
class BasePage{
 constructor(driver){this.driver=driver;}
 async element(id){const e=await this.driver.wait(until.elementLocated(By.id(id)),5000);await this.driver.wait(until.elementIsVisible(e),5000);return e;}
 async click(id){await (await this.element(id)).click();}
 async text(id){return (await this.element(id)).getText();}
 async fill(id,value){const e=await this.element(id);await e.clear();await e.sendKeys(value);}
}
module.exports=BasePage;
