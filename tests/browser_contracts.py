"""Live Chrome verification of the factory's real Worker export-contract UI.
Production rewards require the original Seller ledger; the test does not seed
sales or mutate worker state, so every reward is initially locked.
"""
import json,pathlib,socketserver,threading,time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'contracts'
OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*args):pass
with socketserver.TCPServer(('127.0.0.1',0),Handler) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 opt=Options()
 for arg in ('--headless=new','--no-sandbox','--disable-dev-shm-usage','--window-size=1280,850'):
  opt.add_argument(arg)
 opt.set_capability('goog:loggingPrefs',{'browser':'ALL'})
 driver=webdriver.Chrome(options=opt)
 wait=WebDriverWait(driver,45)
 try:
  driver.get('http://127.0.0.1:%d/midnight-factory.html'%server.server_address[1])
  wait.until(lambda d:d.execute_script("""return document.querySelector('#money-val')?.textContent!=='0'
    &&!!document.querySelector('#factory-contract-btn')&&!!document.querySelector('#build-panel .build-btn')"""))
  button=driver.find_element(By.ID,'factory-contract-btn')
  button.click()
  wait.until(lambda d:d.execute_script("return !document.querySelector('#factory-contract-overlay').hidden"))
  board=driver.execute_script("""return {
   title:document.querySelector('#factory-contract-name').textContent,
   item:document.querySelector('#factory-contract-item').textContent,
   progress:document.querySelector('#factory-contract-progress').textContent,
   reward:document.querySelector('#factory-contract-reward').textContent,
   claimDisabled:document.querySelector('#factory-contract-claim').disabled,
   money:document.querySelector('#money-val').textContent,
   research:document.querySelector('#rp-val').textContent
  }""")
  assert board['title']=='Iron Depot Starter' and 'iron ore' in board['item'],board
  assert '0 / 6' in board['progress'] and board['claimDisabled'],board
  driver.save_screenshot(str(OUT/'01-first-export-contract.png'))
  # A disabled button and window navigation cannot produce free credit/RP.
  driver.execute_script("document.querySelector('#factory-contract-claim').click()")
  time.sleep(.2)
  after=driver.execute_script("""return {
   progress:document.querySelector('#factory-contract-progress').textContent,
   claimDisabled:document.querySelector('#factory-contract-claim').disabled,
   money:document.querySelector('#money-val').textContent,
   research:document.querySelector('#rp-val').textContent}""")
  assert after['claimDisabled'] and after['money']==board['money'],{'before':board,'after':after}
  assert after['research']==board['research'] and after['progress']==board['progress'],after
  driver.find_element(By.ID,'factory-contract-close').click()
  assert driver.execute_script("return document.querySelector('#factory-contract-overlay').hidden")
  driver.set_window_size(390,844)
  driver.find_element(By.ID,'factory-contract-btn').click()
  mobile=driver.execute_script("""const el=document.querySelector('#factory-contract-sheet');
   const r=el.getBoundingClientRect();return {
    width:innerWidth,scroll:document.documentElement.scrollWidth,left:r.left,right:r.right,
    open:!document.querySelector('#factory-contract-overlay').hidden,
    claimDisabled:document.querySelector('#factory-contract-claim').disabled};""")
  assert mobile['open'] and mobile['claimDisabled'],mobile
  assert mobile['left']>=0 and mobile['right']<=mobile['width']+3,mobile
  driver.save_screenshot(str(OUT/'02-phone-shipping-board.png'))
  errors=[x['message'] for x in driver.get_log('browser') if x['level']=='SEVERE']
  assert not [x for x in errors if 'Uncaught' in x or '127.0.0.1' in x],errors
  report={'status':'PASS','initial':board,'after':after,'mobile':mobile,'errors':errors}
  (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
  print(json.dumps(report,ensure_ascii=False),flush=True)
 finally:
  driver.quit()
  server.shutdown()
