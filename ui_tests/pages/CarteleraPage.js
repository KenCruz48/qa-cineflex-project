const {By}=require('selenium-webdriver');
const BasePage=require('./BasePage');
class CarteleraPage extends BasePage{
 constructor(driver){super(driver);this.locators={title:By.id('cartelera-title'),cards:By.css('.movie-card'),section:By.id('catalog-section'),filter:By.id('genre-filter')};}
 async title(){return this.text('cartelera-title');}
 async count(){await this.element('cartelera-title');return (await this.driver.findElements(By.css('.movie-card'))).length;}
 async filter(genre){const select=await this.element('genre-filter');for(const option of await select.findElements(By.css('option'))){if(await option.getText()===(genre||'Todos los géneros')){await option.click();break;}}}
 async cardText(){return this.driver.findElement(this.locators.cards).getText();}
 async visible(){return this.driver.findElement(this.locators.section).isDisplayed();}
 async buy(id=1){await this.click('buy-'+id);await this.element('movie-title');}
 async logout(){await this.click('logout-btn');await this.element('login-form');}
}
module.exports=CarteleraPage;
