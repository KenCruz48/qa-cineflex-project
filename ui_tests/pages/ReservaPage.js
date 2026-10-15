const BasePage=require('./BasePage');
class ReservaPage extends BasePage{
 constructor(driver){super(driver);this.ids={title:'movie-title',pay:'pay-btn',selection:'selection',ticket:'ticket',error:'payment-error',back:'back-btn'};}
 async select(seat){await this.click('seat-'+seat);}
 async pay(card){await this.fill('card-input',card);await this.click('pay-btn');}
 async ticket(){return this.text('ticket');}
 async error(){await this.driver.wait(async()=>Boolean(await this.text('payment-error')),5000);return this.text('payment-error');}
 async back(){await this.click('back-btn');await this.element('cartelera-title');}
 async title(){return this.text(this.ids.title);}
 async payEnabled(){return (await this.element(this.ids.pay)).isEnabled();}
 async selection(){return this.text(this.ids.selection);}
 async seatEnabled(seat){return (await this.element('seat-'+seat)).isEnabled();}
 async newPurchase(){await this.click('new-purchase-btn');await this.element('cartelera-title');}
 async rawTicketText(){const {By}=require('selenium-webdriver');return this.driver.findElement(By.id(this.ids.ticket)).getText();}
}
module.exports=ReservaPage;
