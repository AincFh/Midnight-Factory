"""Real Chromium QA for the original, standalone factory game."""
import json
import pathlib
import socketserver
import threading
import time
from http.server import SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

ROOT=pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS=ROOT/"test-results"
ARTIFACTS.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*a):pass

with socketserver.TCPServer(("127.0.0.1",0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    options=Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1366,768")
    options.set_capability("goog:loggingPrefs",{"browser":"ALL"})
    browser=webdriver.Chrome(options=options)
    browser.set_page_load_timeout(45)
    try:
        browser.get("http://127.0.0.1:%d/" % server.server_address[1])
        has_guide=bool(browser.execute_script("return !!document.getElementById('factory')"))
        if has_guide:
            # Verify the original game is embedded, and the ATLAS guide is accessible.
            guide=browser.find_element(By.ID,"guide-toggle")
            if browser.find_element(By.ID,"guide-panel").get_attribute("hidden") is not None:
                guide.click()
            assert browser.find_element(By.ID,"step-title").text
            locale=browser.find_element(By.ID,"locale")
            before=browser.find_element(By.ID,"step-title").text
            locale.click()
            after=browser.find_element(By.ID,"step-title").text
            assert before!=after, {"before":before,"after":after}
            browser.find_element(By.ID,"guide-close").click()
            assert browser.find_element(By.ID,"guide-panel").get_attribute("hidden") is not None
            browser.switch_to.frame(browser.find_element(By.ID,"factory"))
        else:
            for _ in range(30):
                if "midnight-factory.html" in browser.current_url:break
                time.sleep(.1)
            assert "midnight-factory.html" in browser.current_url, browser.current_url
        for _ in range(65):
            ready=browser.execute_script("""return {
                money:document.querySelector('#money-val')?.textContent||'',
                buttons:document.querySelectorAll('#build-panel button.build-btn').length,
                canvas:!!document.querySelector('#game-canvas')
            }""")
            if ready["buttons"]>=15 and ready["money"] not in ("","0"):break
            time.sleep(.25)
        assert ready["buttons"]>=15 and ready["canvas"] and ready["money"] not in ("","0"),ready
        bounds=browser.execute_script("""return (()=>{const c=document.querySelector('#game-canvas');
          const r=c.getBoundingClientRect();return {width:c.width,height:c.height,
          screenWidth:r.width,screenHeight:r.height};})()""")
        assert bounds["width"]>500 and bounds["height"]>350,bounds
        mine=browser.find_element(By.CSS_SELECTOR,'#build-panel button[data-id="mine"]')
        mine.click()
        assert "active" in browser.find_element(By.CSS_SELECTOR,'#build-panel button[data-id="mine"]').get_attribute("class")
        mine.click()
        assert "active" not in browser.find_element(By.CSS_SELECTOR,'#build-panel button[data-id="mine"]').get_attribute("class")
        browser.save_screenshot(str(ARTIFACTS/"factory-desktop.png"))
        browser.set_window_size(390,844)
        time.sleep(.8)
        mobile=browser.execute_script("""return {
          canvas:!!document.getElementById('game-canvas'),
          width:innerWidth,canvasWidth:document.getElementById('game-canvas').getBoundingClientRect().width,
          buttons:document.querySelectorAll('#build-panel button.build-btn').length
        }""")
        assert mobile["canvas"] and mobile["buttons"]>=15,mobile
        browser.save_screenshot(str(ARTIFACTS/"factory-mobile.png"))
        errors=[e["message"] for e in browser.get_log("browser") if e["level"]=="SEVERE"]
        local=[e for e in errors if ("Uncaught" in e or "127.0.0.1" in e) and "fonts.googleapis.com" not in e]
        assert not local,local
        result={"ok":True,"buttonCount":ready["buttons"],"money":ready["money"],
                "desktop":bounds,"mobile":mobile,"consoleErrors":errors[:8]}
        (ARTIFACTS/"factory-browser-qa.json").write_text(json.dumps(result,ensure_ascii=False,indent=2))
        print(json.dumps(result,ensure_ascii=False,indent=2))
    finally:
        browser.quit()
        server.shutdown()
