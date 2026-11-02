import { test, expect } from '@playwright/test';
test('builds water, preserves stoichiometry, removes atoms and records discovery', async ({page})=>{
  await page.goto('/lab');
  await expect(page.getByRole('heading',{name:'La química, en tus manos.'})).toBeVisible();
  await page.getByRole('button',{name:'Añadir a la mesa'}).click();
  await page.getByRole('button',{name:'Añadir a la mesa'}).click();
  await page.getByRole('button',{name:'Oxígeno (O), número atómico 8',exact:true}).click();
  await page.getByRole('button',{name:'Añadir a la mesa'}).click();
  await expect(page.getByRole('button',{name:'Reaccionar',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Reaccionar',exact:true}).click();
  await expect(page.locator('.product-caption')).toContainText('H₂O');
  await expect(page.locator('.discovery-items')).toContainText('H₂O');
  await page.getByRole('button',{name:'Limpiar mesa'}).click();
  await expect(page.locator('.atom-chip')).toHaveCount(0);
  await expect(page.locator('.discovery-items')).toContainText('H₂O');
});
test('drag, cancel outside, filter and keyboard selection',async({page})=>{
  await page.goto('/');
  const element=page.getByRole('button',{name:'Carbono (C), número atómico 6',exact:true});
  const source=await element.boundingBox();const target=await page.getByTestId('drop-zone').boundingBox();
  await page.mouse.move(source!.x+20,source!.y+30);await page.mouse.down();await page.mouse.move(target!.x+target!.width/2,target!.y+target!.height/2,{steps:10});await page.mouse.up();
  await expect(page.locator('.atom-chip')).toHaveCount(1);
  await page.mouse.move(source!.x+20,source!.y+30);await page.mouse.down();await page.mouse.move(15,15,{steps:5});await page.mouse.up();
  await expect(page.locator('.atom-chip')).toHaveCount(1);
  await page.getByRole('textbox',{name:'Buscar elemento'}).fill('neon');
  await expect(page.locator('[data-element]:enabled')).toHaveCount(1);
  await page.getByRole('button',{name:'Neón (Ne), número atómico 10',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('.detail-copy h3')).toHaveText('Neón');
  await page.getByRole('button',{name:'Borrar búsqueda'}).click();
  await page.getByRole('button',{name:'Cómo funciona'}).click();
  await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
});
test('camera permission failure is recoverable and leaves mouse controls available',async({page})=>{
  await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Denied','NotAllowedError'));});
  await page.goto('/lab');await page.getByRole('button',{name:'Activar cámara',exact:true}).click();
  await expect(page.locator('.camera-error')).toContainText('Permiso de cámara denegado');
  await page.getByRole('button',{name:'Añadir a la mesa'}).click();await expect(page.locator('.atom-chip')).toHaveCount(1);
});
test('real model initializes in worker and processes fake camera frames',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/lab');await page.getByRole('button',{name:'Activar cámara',exact:true}).click();
  await expect(page.getByRole('button',{name:'Desactivar cámara'})).toBeVisible({timeout:60000});
  await expect(page.locator('.camera-error')).toHaveCount(0);
  await page.waitForTimeout(2000);
  await page.getByRole('button',{name:'Desactivar cámara'}).click();
  await expect(page.getByRole('button',{name:'Activar cámara',exact:true})).toBeVisible();
});
test('mobile layout has no page overflow; controls work on touch viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/lab');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Añadir a la mesa'}).click();await expect(page.locator('.atom-chip')).toHaveCount(1);
  await expect(page.locator('.scene-wrap canvas')).toHaveCount(2);await page.waitForTimeout(1500);
  await page.screenshot({path:'work/mobile.png',fullPage:true});
});
test('desktop scene renders without runtime errors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/lab');await expect(page.locator('.scene-wrap canvas')).toHaveCount(2);
  await page.waitForTimeout(2500);await page.screenshot({path:'work/desktop.png',fullPage:true});
  expect(errors).toEqual([]);
});


test('hand gesture pipeline grabs and deposits once, and cancels on tracking loss',async({page})=>{
  await page.addInitScript(()=>{
    const state=window as typeof window & {__landmarks?:{x:number;y:number}[]};
    class MockWorker {
      onmessage:((e:MessageEvent)=>void)|null=null;
      onerror:((e:Event)=>void)|null=null;
      closed=false;
      postMessage(data:{type:string;frame?:ImageBitmap;timestamp:number}){
        if(data.type==='init')setTimeout(()=>this.onmessage?.({data:{type:'ready'}} as MessageEvent),0);
        else {data.frame?.close();if(!this.closed)this.onmessage?.({data:{type:'result',landmarks:state.__landmarks,timestamp:data.timestamp}} as MessageEvent);}
      }
      terminate(){this.closed=true;}
    }
    window.Worker=MockWorker as unknown as typeof Worker;
  });
  await page.goto('/lab');await page.getByRole('button',{name:'Activar cámara',exact:true}).click();
  await expect(page.getByRole('button',{name:'Desactivar cámara'})).toBeVisible();
  const aim=async(target:string,ratio:number)=>{
    const point=await page.locator(target).evaluate(el=>{const r=el.getBoundingClientRect();const b=document.querySelector('.workspace')!.getBoundingClientRect();return {x:1-(0.12+(r.left+r.width/2-b.left)/b.width*.76),y:0.1+(r.top+r.height/2-Math.max(0,b.top))/(Math.min(innerHeight,b.bottom)-Math.max(0,b.top))*.8};});
    await page.evaluate(({point,ratio})=>{
      const p=Array.from({length:21},()=>({...point}));
      p[0]={x:point.x,y:point.y+.3};p[9]={x:point.x,y:point.y+.1};p[5]={x:point.x-.05,y:point.y+.1};p[17]={x:point.x+.05,y:point.y+.1};p[4]={x:point.x+ratio*.2/(4/3),y:point.y};
      (window as typeof window & {__landmarks?:typeof p}).__landmarks=p;
    },{point,ratio});
    await page.waitForTimeout(300);
  };
  await aim('[data-element="H"]',.8);await aim('[data-element="H"]',.15);
  await expect(page.locator('.drag-atom')).toHaveClass(/visible/);
  await aim('[data-testid="drop-zone"]',.15);await aim('[data-testid="drop-zone"]',.8);
  await expect(page.locator('.atom-chip')).toHaveCount(1);
  await page.waitForTimeout(300);await expect(page.locator('.atom-chip')).toHaveCount(1);
  await aim('[data-element="O"]',.8);await aim('[data-element="O"]',.15);
  await page.evaluate(()=>{(window as typeof window & {__landmarks?:unknown}).__landmarks=undefined;});
  await expect(page.locator('.drag-atom')).not.toHaveClass(/visible/,{timeout:2000});
  await expect(page.locator('.atom-chip')).toHaveCount(1);
});
